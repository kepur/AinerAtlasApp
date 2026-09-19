"""Ordered LLM models sharing one provider's URL and credentials."""

from __future__ import annotations

from typing import Any

MAX_MODELS_PER_PROVIDER = 20


def model_queue(model_name: str, config: dict[str, Any] | None) -> list[str]:
    """The legacy single model remains first; old provider rows need no migration."""
    names = [model_name.strip()] if model_name.strip() else []
    saved = (config or {}).get("model_queue", [])
    if isinstance(saved, list):
        for value in saved:
            if isinstance(value, str) and value.strip() and value.strip() not in names:
                names.append(value.strip())
    return names[:MAX_MODELS_PER_PROVIDER]


def validate_model_queue(model_name: str, config: dict[str, Any]) -> None:
    if "model_queue" not in config:
        return
    saved = config["model_queue"]
    if not isinstance(saved, list) or len(saved) > MAX_MODELS_PER_PROVIDER:
        raise ValueError("model_queue must be a list of at most 20 model names")
    names = [value.strip() for value in saved if isinstance(value, str)]
    if len(names) != len(saved) or any(not name or len(name) > 120 for name in names):
        raise ValueError("model_queue entries must be nonempty model names (max 120 characters)")
    if len(set(names)) != len(names):
        raise ValueError("model_queue entries must be unique")
    if names and names[0] != model_name.strip():
        raise ValueError("model_name must equal the first model_queue entry")
