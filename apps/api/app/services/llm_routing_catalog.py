"""Canonical LLM task routing catalog for Admin UI and runtime resolution."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class LlmRouteEntry:
    key: str
    label: str
    category: str
    fallback_bucket: str
    description: str = ""


# Like an IP routing table: each row is a task_type → provider mapping.
LLM_ROUTE_CATALOG: tuple[LlmRouteEntry, ...] = (
    # ── 对话 ──
    LlmRouteEntry("dialogue_stream", "对话流式回复", "对话", "conversational_reply", "Chat 第一阶段：快速口语回复"),
    LlmRouteEntry("dialogue", "主对话", "对话", "conversational_reply", "非流式对话生成"),
    LlmRouteEntry("chat", "角色扮演 / 通用聊天", "对话", "conversational_reply", "Roleplay、Romance 等"),
    LlmRouteEntry("thought_dialogue", "Thought 对话", "对话", "conversational_reply", "思维对话主流程"),
    LlmRouteEntry("thought_freeze", "思维冻结分析", "对话", "conversational_reply", "Thought Freeze 结构化输出"),
    LlmRouteEntry("thought_dialogue_devils_advocate", "Thought · 魔鬼代言人", "对话", "conversational_reply"),
    LlmRouteEntry("thought_dialogue_information_collector", "Thought · 信息收集", "对话", "conversational_reply"),
    LlmRouteEntry("thought_dialogue_debate_training", "Thought · 辩论训练", "对话", "conversational_reply"),
    LlmRouteEntry("thought_dialogue_role_simulation", "Thought · 角色模拟", "对话", "conversational_reply"),
    # ── 学习分析 ──
    LlmRouteEntry("grammar_analysis", "语法 / Chat HUD 分析", "学习分析", "learning_analysis", "Chat 第二阶段：学习 HUD（chat_v2）"),
    LlmRouteEntry("voice_coach_analysis", "语音教练日更画像", "学习分析", "learning_analysis", "每日分析用户状态，生成 Voice Coach 提示词"),
    LlmRouteEntry("learning_analysis", "学习要点分析", "学习分析", "learning_analysis", "广义学习分析回退"),
    LlmRouteEntry("expression_agent", "表达 Agent", "学习分析", "learning_analysis", "流式对话中的表达建议"),
    LlmRouteEntry("coach_agent", "教练 Agent", "学习分析", "learning_analysis", "流式对话中的教练反馈"),
    LlmRouteEntry("pattern_mining", "句型挖掘", "学习分析", "learning_analysis"),
    LlmRouteEntry("vocabulary_mining", "词汇挖掘", "学习分析", "learning_analysis"),
    LlmRouteEntry("review_queue", "复习队列生成", "学习分析", "learning_analysis", "消消乐 LLM 出题"),
    LlmRouteEntry("crush_exercise", "消消乐练习生成", "学习分析", "learning_analysis", "Pattern/Vocab Crush JSON 出题"),
    # ── 游戏 ──
    LlmRouteEntry("game_ai_speech", "游戏 · AI 发言", "游戏", "games", "白天发言、剧情推进"),
    LlmRouteEntry("game_ai_answer", "游戏 · 被质疑回答", "游戏", "games", "海龟汤 / 侦探 / 狼人杀回应"),
    LlmRouteEntry("game_question", "游戏 · 提问推理", "游戏", "games", "狼人杀质疑 + HUD"),
    LlmRouteEntry("game_challenge_hud", "游戏 · 质疑表达 HUD", "游戏", "games", "帮我表达 / 学习 HUD"),
    LlmRouteEntry("game_reasoning", "游戏 · 矛盾推理", "游戏", "games", "矛盾检测、推理分析"),
    LlmRouteEntry("game_summary", "游戏 · 结算分析", "游戏", "games"),
    LlmRouteEntry("game_translate", "游戏 · 字面翻译", "游戏", "games", "低成本直译"),
    LlmRouteEntry("game_vote_reason", "游戏 · 投票理由", "游戏", "games"),
    # ── 平台其他 ──
    LlmRouteEntry("topic_generation", "话题生成", "平台", "default"),
    LlmRouteEntry("match_explanation", "匹配解释", "平台", "default"),
    LlmRouteEntry("group_summary", "圈子总结", "平台", "default"),
    LlmRouteEntry("safety_check", "安全审核", "平台", "default"),
    LlmRouteEntry("voice_report", "发音报告", "平台", "default"),
)

# Category-level defaults (backward compatible with earlier 3-bucket Admin UI).
LLM_ROUTE_BUCKETS: tuple[dict[str, str], ...] = (
    {"key": "conversational_reply", "label": "对话类默认", "category": "对话"},
    {"key": "learning_analysis", "label": "学习分析类默认", "category": "学习分析"},
    {"key": "games", "label": "游戏类默认", "category": "游戏"},
    {"key": "default", "label": "全局路由默认", "category": "平台"},
)

_CATALOG_BY_KEY = {entry.key: entry for entry in LLM_ROUTE_CATALOG}


def fallback_bucket_for_task(task_type: str) -> str:
    """Map a runtime task_type to its category bucket for fallback routing."""
    if task_type in _CATALOG_BY_KEY:
        return _CATALOG_BY_KEY[task_type].fallback_bucket
    if task_type.startswith("game_") or task_type in {"game"}:
        return "games"
    if task_type.startswith("thought_dialogue"):
        return "conversational_reply"
    if task_type in {
        "grammar_analysis", "grammar_agent", "expression_agent", "coach_agent",
        "voice_coach_analysis",
        "pattern_mining", "vocabulary_mining", "learning_analysis", "review_queue",
    }:
        return "learning_analysis"
    if task_type in {"thought_dialogue", "dialogue", "dialogue_stream", "chat", "thought_freeze"}:
        return "conversational_reply"
    return "default"


def catalog_for_admin() -> list[dict]:
    return [
        {
            "key": e.key,
            "label": e.label,
            "category": e.category,
            "fallback_bucket": e.fallback_bucket,
            "description": e.description,
        }
        for e in LLM_ROUTE_CATALOG
    ]
