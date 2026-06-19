import json


def _extract_exercise_json(text: str) -> dict:
    """Mirror crush_exercise_llm JSON extraction."""
    if "{" not in text:
        raise ValueError("no json")
    chunk = text[text.index("{") : text.rindex("}") + 1]
    return json.loads(chunk)


def test_extract_exercise_json_valid():
    raw = json.dumps(
        {
            "exercise_type": "translate",
            "prompt": "Translate: 我喜欢苹果",
            "hint": "主谓宾",
            "correct_answer": "I like apples.",
            "options": ["I like apples.", "I likes apple."],
        }
    )
    out = _extract_exercise_json(raw)
    assert out["correct_answer"] == "I like apples."
    assert out["exercise_type"] == "translate"


def test_extract_exercise_json_strips_markdown_fence():
    raw = '```json\n{"exercise_type":"fix_error","prompt":"Fix","hint":"","correct_answer":"Hi"}\n```'
    out = _extract_exercise_json(raw)
    assert out["correct_answer"] == "Hi"
