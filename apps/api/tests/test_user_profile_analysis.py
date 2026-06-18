from app.services.matching import _analysis_bonus


def test_analysis_bonus_personality_and_tags() -> None:
    user = {"personality_type": "理性探索者", "match_tags": ["跨文化", "深度对话"]}
    target = {"personality_type": "理性探索者", "match_tags": ["跨文化", "英语提升"]}
    score, reasons = _analysis_bonus(user, target)
    assert score == 30.0
    assert any("AI 标签" in r for r in reasons)
    assert any("性格类型" in r for r in reasons)
