from __future__ import annotations

from abc import ABC, abstractmethod

from http import HTTPStatus
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import decrypt_api_key
from app.models import AIProvider
from app.services.dashscope_client import apply_dashscope_config, resolve_dashscope_config


class EmbeddingProvider(ABC):
    @abstractmethod
    def embed(self, texts: list[str], *, text_type: str = "document") -> list[list[float]]:
        raise NotImplementedError


class MockEmbeddingProvider(EmbeddingProvider):
    def embed(self, texts: list[str], *, text_type: str = "document") -> list[list[float]]:
        return [[float(len(text) % 97) / 97.0] * 8 for text in texts]


class DashScopeEmbeddingProvider(EmbeddingProvider):
    def __init__(self, db: Session | None = None) -> None:
        self._config = apply_dashscope_config(db=db)
        if not self._config:
            raise RuntimeError("DashScope embedding is not configured")

    def embed(self, texts: list[str], *, text_type: str = "document") -> list[list[float]]:
        from dashscope import TextEmbedding

        if not texts:
            return []

        response = TextEmbedding.call(
            model=self._config.embedding_model,
            input=texts,
            dimension=self._config.embedding_dimension,
            text_type=text_type,
            workspace=self._config.workspace_id or None,
            api_key=self._config.api_key,
        )
        if response.status_code != HTTPStatus.OK:
            message = getattr(response, "message", "") or str(response)
            raise RuntimeError(f"DashScope embedding failed: {message}")

        vectors: list[list[float]] = []
        for item in response.output.get("embeddings", []):
            vectors.append(list(item.get("embedding", [])))
        if len(vectors) != len(texts):
            raise RuntimeError("DashScope embedding returned unexpected result count")
        return vectors


def get_embedding_provider(db: Session | None = None) -> EmbeddingProvider:
    if db is not None:
        row = db.scalar(
            select(AIProvider)
            .where(
                AIProvider.enabled.is_(True),
                AIProvider.provider_type == "embedding",
            )
            .order_by(AIProvider.priority.asc())
            .limit(1)
        )
        if row:
            key = decrypt_api_key(row.api_key_encrypted)
            if key and row.provider_name in {"dashscope-embedding", "dashscope", "qwen"}:
                try:
                    return DashScopeEmbeddingProvider(db=db)
                except RuntimeError:
                    pass

    if resolve_dashscope_config(db):
        try:
            return DashScopeEmbeddingProvider(db=db)
        except RuntimeError:
            pass
    return MockEmbeddingProvider()
