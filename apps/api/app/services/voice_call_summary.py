"""Generate post-call summary for realtime Voice Coach sessions (not Freeze assets)."""

from __future__ import annotations

from typing import Any

from app.services.voice_analyzer import analyze_transcript


def _transcript_from_turns(turns: list[dict[str, Any]]) -> str:
    lines: list[str] = []
    for turn in turns:
        user_text = str(turn.get("user_text") or "").strip()
        ai_reply = str(turn.get("ai_reply") or "").strip()
        if user_text:
            lines.append(f"User: {user_text}")
        if ai_reply:
            lines.append(f"Coach: {ai_reply}")
    return "\n".join(lines)


def generate_realtime_call_summary(
    *,
    session_id: str,
    provider: str,
    duration_seconds: int,
    turns: list[dict[str, Any]],
    mode: str = "free",
) -> dict[str, Any]:
    """Build a VoiceReport-compatible summary from per-turn HUD + dialogue."""
    turn_count = len(turns)
    grammar_issues = 0
    naturalness_suggestions = 0
    patterns: list[str] = []
    top_corrections: list[dict[str, str]] = []
    highlights: list[str] = []
    practice: list[str] = []

    for turn in turns:
        user_text = str(turn.get("user_text") or "").strip()
        hud = turn.get("hud") if isinstance(turn.get("hud"), dict) else {}
        tips = hud.get("grammar_tips") or []
        if isinstance(tips, list):
            grammar_issues += len(tips)

        corrected = str(hud.get("corrected_sentence") or hud.get("main_expression") or "").strip()
        if corrected and user_text and corrected.lower() != user_text.lower():
            naturalness_suggestions += 1
            top_corrections.append({"word": user_text[:60], "suggestion": corrected[:120]})

        for item in hud.get("patterns_v2") or []:
            if isinstance(item, dict):
                pat = str(item.get("pattern") or "").strip()
                if pat and pat not in patterns:
                    patterns.append(pat)

        for item in hud.get("patterns") or []:
            pat = str(item).strip()
            if pat and pat not in patterns:
                patterns.append(pat)

    transcript = _transcript_from_turns(turns)
    transcript_analysis = analyze_transcript(transcript) if transcript else {
        "confidence_estimate": 55.0,
        "filler_words_count": 0,
        "filler_word_ratio": 0.0,
        "pace_estimate": "steady",
        "vocabulary_richness": 0.0,
        "sentence_complexity": 0.0,
        "fluency_issues": [],
        "grammar_issues_count": grammar_issues,
    }

    # Heuristic scores from session engagement + learning signals
    fluency = round(min(95.0, max(45.0, 58 + turn_count * 4 - grammar_issues * 2)), 1)
    grammar = round(min(95.0, max(40.0, 72 - grammar_issues * 3)), 1)
    vocabulary = round(min(95.0, max(45.0, 55 + len(patterns) * 3)), 1)
    naturalness = round(min(95.0, max(40.0, 65 + naturalness_suggestions * 2 - grammar_issues)), 1)
    confidence = float(transcript_analysis.get("confidence_estimate", 55))

    if turn_count:
        highlights.append(f"完成 {turn_count} 轮实时对话（模式：{mode}）。")
    if patterns:
        highlights.append(f"本轮捕捉到句型：{', '.join(patterns[:3])}。")
    if naturalness_suggestions:
        highlights.append(f"有 {naturalness_suggestions} 处表达可升级为更自然说法。")
    if not highlights:
        highlights.append("已建立语音连接，建议下次多聊几轮以获得更完整小结。")

    if grammar_issues:
        practice.append("回顾本轮语法提示，用正确句型再说一遍。")
    if patterns:
        practice.append(f"把句型 {patterns[0]} 加入今日消消乐练习。")
    if naturalness_suggestions:
        practice.append("挑一条自然表达改写，录音对比前后差异。")
    if not practice:
        practice.append("保持每周 3 次短通话，巩固口语自信。")

    summary_parts = [
        f"本次通话 {max(1, duration_seconds)} 秒",
        f"共 {turn_count} 轮",
    ]
    if grammar_issues:
        summary_parts.append(f"语法要点 {grammar_issues} 条")
    if patterns:
        summary_parts.append(f"句型 {len(patterns)} 个")
    summary_parts.append(
        f"流利度 {fluency} · 语法 {grammar} · 自然度 {naturalness}"
    )
    summary = "，".join(summary_parts) + "。（通话小结，非 Thought Freeze 资产）"

    filler_words: list[dict[str, Any]] = []
    if transcript:
        lowered = transcript.lower()
        for phrase in ["um", "uh", "like", "you know"]:
            count = lowered.count(phrase)
            if count:
                filler_words.append({"phrase": phrase, "count": count})

    pause_feedback = ["本轮为实时对话练习，建议保持短句、说完轻点或自然停顿。"]
    if fluency < 70:
        pause_feedback.append("可先慢速跟读 AI 的改写句，再尝试脱稿复述。")

    return {
        "session_id": session_id,
        "provider": provider,
        "duration_seconds": max(1, duration_seconds),
        "transcript": transcript,
        "scores": {
            "fluency": fluency,
            "grammar": grammar,
            "vocabulary": vocabulary,
            "naturalness": naturalness,
            "confidence": confidence,
        },
        "top_corrections": top_corrections[:5],
        "highlights": highlights[:4],
        "filler_words": filler_words,
        "pause_feedback": pause_feedback[:3],
        "recommended_practice": practice[:4],
        "transcript_analysis": transcript_analysis,
        "summary": summary,
        "turn_count": turn_count,
        "grammar_issues": grammar_issues,
        "naturalness_suggestions": naturalness_suggestions,
        "patterns_for_crush": patterns,
        "mode": mode,
    }
