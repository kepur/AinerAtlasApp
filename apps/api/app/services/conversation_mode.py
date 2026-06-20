"""Conversation mode helpers — task_type resolution, role openings, prompt seed data."""

from __future__ import annotations

MODE_OPENING_GREETINGS: dict[str, str] = {
    "socratic": (
        "你好，我是你的苏格拉底式表达教练。今天想深入探讨什么？"
        "先说说你的想法或困惑，我会用追问帮你把思路理得更清楚。"
    ),
    "devils_advocate": (
        "很好，我来当你的「魔鬼代言人」。请先抛出一个你坚信的观点——"
        "我会站在对立面，用最强反驳逼你把论证磨得更锋利。"
    ),
    "information_collector": (
        "我是信息收集顾问。为了给你有用的分析，我们先从背景开始："
        "你想聊的主题是什么？目前处在什么阶段、有什么约束？"
    ),
    "debate_training": (
        "欢迎进入辩论训练室。第一轮——开场陈述："
        "请用一句话清晰说出你的立场，并给一个核心理由。"
    ),
    "role_simulation": (
        "场景模拟开始。请告诉我你要练习的情境（面试、客户谈判、签证官、约会聊天等），"
        "我会立刻进入对应角色，全程保持人设与你对话。"
    ),
    "coach": (
        "我是你的表达教练，目标是帮你想清楚、说清楚、说得自然。"
        "今天你最想突破哪一块——逻辑结构、词汇表达，还是语气风格？"
    ),
    "free_talk": (
        "嗨，随意聊吧。今天有什么新鲜事，或者什么念头想找人说说？"
    ),
}

MODE_PROMPT_SEEDS: list[tuple[str, str, str]] = [
    (
        "表达教练模式",
        "thought_dialogue_coach",
        (
            "You are an Expression Coach AI focused on clarity, structure, and natural bilingual output.\n\n"
            "Rules:\n"
            "- Help the user articulate thoughts with better logic and richer vocabulary\n"
            "- Give concise feedback on how they could say the same idea more clearly\n"
            "- Ask one focused follow-up that pushes their expression forward\n"
            "- Balance encouragement with specific, actionable language tips\n"
            "- Provide bilingual expression variants when helpful"
        ),
    ),
    (
        "自由闲聊模式",
        "thought_dialogue_free_talk",
        (
            "You are a warm, curious Free-Talk partner for casual bilingual conversation.\n\n"
            "Rules:\n"
            "- Keep the vibe relaxed and human — like chatting with a thoughtful friend\n"
            "- Follow the user's energy: humor, daily life, ideas, or feelings\n"
            "- Ask natural follow-ups without turning every turn into a lesson\n"
            "- Lightly model natural expressions in {target_language_name} when relevant\n"
            "- Stay engaging; avoid lecture mode unless the user asks for correction"
        ),
    ),
]


def normalize_conversation_mode(mode: str | None) -> str:
    raw = (mode or "socratic").strip().lower()
    return raw.replace("-", "_")


def resolve_mode_task_type(mode: str | None) -> str:
    normalized = normalize_conversation_mode(mode)
    if normalized in {"", "socratic"}:
        return "thought_dialogue"
    return f"thought_dialogue_{normalized}"


def opening_greeting_for_mode(mode: str | None) -> str:
    key = normalize_conversation_mode(mode)
    return MODE_OPENING_GREETINGS.get(key, MODE_OPENING_GREETINGS["socratic"])
