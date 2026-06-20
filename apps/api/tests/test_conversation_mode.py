from app.services.conversation_mode import (
    opening_greeting_for_mode,
    resolve_mode_task_type,
)
from app.services.llm_openai import build_chat_reply_system_prompt


def test_resolve_mode_task_type_normalizes_hyphenated_mode() -> None:
    assert resolve_mode_task_type("free-talk") == "thought_dialogue_free_talk"
    assert resolve_mode_task_type("socratic") == "thought_dialogue"
    assert resolve_mode_task_type("devils_advocate") == "thought_dialogue_devils_advocate"


def test_opening_greeting_differs_by_mode() -> None:
    devil = opening_greeting_for_mode("devils_advocate")
    role = opening_greeting_for_mode("role_simulation")
    assert devil != role
    assert "魔鬼代言人" in devil
    assert "场景模拟" in role


def test_build_chat_reply_system_prompt_includes_role() -> None:
    role = "You are a Devil's Advocate AI coach."
    prompt = build_chat_reply_system_prompt(
        role_prompt=role,
        native_language_name="Chinese",
        target_language_name="English",
        user_level="B1",
    )
    assert role in prompt
    assert "stay in character" in prompt.lower()
