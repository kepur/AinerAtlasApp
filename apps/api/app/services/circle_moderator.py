"""AI circle moderator: translation, pacing, counter-questions per room type."""

from app.services.runtime_config import resolve_default_llm_provider
from app.services.llm import get_llm_provider

ROOM_TYPE_PROMPTS = {
    "roundtable": "You are a roundtable moderator. Facilitate an open group discussion. Encourage diverse viewpoints, ensure everyone speaks, summarize key points occasionally.",
    "debate_pk": "You are a debate moderator. Structure the debate with opening statements (pro), counter-arguments (con), rebuttals, and closing. Score arguments on clarity, evidence, and persuasiveness.",
    "co_create": "You are a collaborative creation facilitator. Guide the group in brainstorming and building something together (article, proposal, plan). Track the progress and help merge ideas.",
    "language_circle": "You are a language practice moderator. Gently correct grammar and pronunciation, provide useful expressions, encourage target-language-only interaction, celebrate small wins.",
    "founder_circle": "You are a founder/entrepreneur circle moderator. Focus on startup ideas, market validation, business models, team building. Provide structured feedback frameworks.",
    "soul_circle": "You are a deep conversation facilitator. Create a safe space for discussing values, life purpose, personal growth. Listen deeply, ask profound questions, respect vulnerability.",
    "study_buddy": "You are a study partner coordinator. Help set learning goals, track progress, practice together, share resources, motivate each other through accountability.",
}


async def moderate_message(
    content: str,
    content_language: str,
    room_title: str,
    room_type: str = "roundtable",
    native_language: str = "zh",
    target_language: str = "en",
    db=None,
) -> dict:
    provider = get_llm_provider(resolve_default_llm_provider(db), db=db)
    type_instruction = ROOM_TYPE_PROMPTS.get(room_type, ROOM_TYPE_PROMPTS["roundtable"])
    result = await provider.thought_dialogue(
        user_input=content,
        profile=None,
        native_language=native_language,
        target_language=target_language,
        mode=room_type,
        topic=f"{room_title}\n\n[Moderator instruction: {type_instruction}]",
    )
    return {
        "translated_content": result.main_reply_target,
        "grammar_tips": [t.model_dump() for t in result.grammar_tips],
        "counter_question": result.question or result.challenge,
        "on_topic": True,
        "host_note": f"AI 主持 [{room_type}]：{_host_note_for_type(room_type)}",
    }


async def generate_room_summary(messages: list[dict], room_title: str, room_type: str = "roundtable", db=None) -> dict:
    transcript = "\n".join(
        f"{m.get('role', 'user')}: {m.get('content', '')}" for m in messages
    )
    type_instruction = ROOM_TYPE_PROMPTS.get(room_type, ROOM_TYPE_PROMPTS["roundtable"])
    provider = get_llm_provider(resolve_default_llm_provider(db), db=db)
    result = await provider.generate_expression_asset(
        transcript, "en", f"{room_title}\n\n[Type: {room_type}]\n{type_instruction}",
    )
    return {
        "room_title": room_title,
        "room_type": room_type,
        "main_points": result.arguments or [],
        "pro_views": [result.main_reply_native] if result.main_reply_native else [],
        "con_views": [result.challenge] if result.challenge else [],
        "consensus": result.facts or [],
        "disagreements": result.values or [],
        "golden_quotes": [result.suggested_expression] if result.suggested_expression else [],
        "moderator_notes": _host_note_for_type(room_type),
    }


def _host_note_for_type(room_type: str) -> str:
    notes = {
        "roundtable": "请保持开放心态，尊重不同观点。",
        "debate_pk": "正反双方请轮流发言，AI 将对论证进行评分。",
        "co_create": "大家的创意都很有价值，让我们聚焦目标。",
        "language_circle": "尽量用目标语言表达，别怕犯错！",
        "founder_circle": "用数据支撑观点，AI 会追问商业模式。",
        "soul_circle": "这里不评判，只倾听和共鸣。",
        "study_buddy": "互相监督，今日目标完成了吗？",
    }
    return notes.get(room_type, "请围绕话题继续讨论。")
