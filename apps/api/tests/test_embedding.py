from app.services.embedding import MockEmbeddingProvider, get_embedding_provider


def test_mock_embedding_provider() -> None:
    provider = MockEmbeddingProvider()
    vectors = provider.embed(["hello", "world"])
    assert len(vectors) == 2
    assert len(vectors[0]) == 8


def test_get_embedding_provider_without_db() -> None:
    provider = get_embedding_provider(None)
    assert provider.embed(["test"])
