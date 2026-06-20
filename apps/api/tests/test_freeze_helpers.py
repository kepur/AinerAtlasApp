from app.schemas import ConversationAIResult
from app.services.freeze_helpers import ensure_expression_versions, extract_expression_versions


def test_extract_expression_versions_accepts_list_shape() -> None:
    raw = [
        {"type": "basic", "text": "Hello world"},
        {"variant": "advanced", "content": "Advanced hello"},
    ]
    versions = extract_expression_versions({"expression_versions": raw})
    assert versions["basic"] == "Hello world"
    assert versions["advanced"] == "Advanced hello"


def test_ensure_expression_versions_builds_fallback_when_llm_empty() -> None:
    result = ConversationAIResult(
        main_reply_native="这是中文总结",
        main_reply_target="This is the English summary.",
        suggested_expression="One golden line.",
        expression_versions={},
    )
    source = "user: 我觉得长期稳定比短期收益更重要\nassistant: That makes sense."

    versions = ensure_expression_versions(
        result,
        source_text=source,
        title="Career choice",
    )

    assert versions["native_full"] == "这是中文总结"
    assert versions["natural_spoken"] == "This is the English summary."
    assert versions["advanced"] == "This is the English summary."
    assert versions["golden_quote"] == "One golden line."
    assert len(versions) >= 4
