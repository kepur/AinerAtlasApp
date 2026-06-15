from __future__ import annotations

from typing import Any

from app.models import VoiceSession
from app.services.voice_analyzer import analyze_transcript


def generate_voice_report(session: VoiceSession) -> dict[str, Any]:
    analysis = session.analysis or {}
    transcript = session.transcript or analysis.get("transcript", "")
    evaluations = analysis.get("evaluations", [])
    avg_fluency = _average(evaluations, "fluency_score", default=70)
    avg_accuracy = _average(evaluations, "accuracy_score", default=68)
    corrections = _collect_corrections(evaluations)
    filler_words = _collect_filler_words(transcript, evaluations)
    pause_feedback = _collect_pause_feedback(evaluations, avg_fluency, avg_accuracy)
    highlights = analysis.get("highlights", []) or _build_highlights(
        transcript=transcript,
        avg_fluency=avg_fluency,
        avg_accuracy=avg_accuracy,
        corrections=corrections,
    )
    recommended_practice = _build_recommended_practice(
        avg_fluency=avg_fluency,
        avg_accuracy=avg_accuracy,
        corrections=corrections,
        filler_words=filler_words,
    )
    transcript_analysis = analyze_transcript(transcript)

    return {
        "session_id": session.id,
        "provider": session.provider,
        "duration_seconds": session.duration_seconds,
        "transcript": transcript,
        "scores": {
            "fluency": avg_fluency,
            "grammar": round((avg_fluency + avg_accuracy) / 2, 1),
            "vocabulary": round(min(100, avg_accuracy + 5), 1),
            "naturalness": round(avg_fluency * 0.9, 1),
            "confidence": transcript_analysis["confidence_estimate"],
        },
        "top_corrections": corrections[:5],
        "highlights": highlights,
        "filler_words": filler_words,
        "pause_feedback": pause_feedback,
        "recommended_practice": recommended_practice,
        "transcript_analysis": {
            "filler_words_count": transcript_analysis["filler_words_count"],
            "filler_word_ratio": transcript_analysis["filler_word_ratio"],
            "pace_estimate": transcript_analysis["pace_estimate"],
            "vocabulary_richness": transcript_analysis["vocabulary_richness"],
            "sentence_complexity": transcript_analysis["sentence_complexity"],
            "fluency_issues": transcript_analysis["fluency_issues"],
            "grammar_issues_count": transcript_analysis["grammar_issues_count"],
        },
        "summary": (
            f"本次语音练习共 {session.duration_seconds} 秒，"
            f"流利度 {avg_fluency}，准确度 {avg_accuracy}。"
        ),
    }


def _average(items: list[dict], key: str, default: float) -> float:
    if not items:
        return default
    values = [float(item.get(key, default)) for item in items]
    return round(sum(values) / len(values), 1)


def _collect_corrections(evaluations: list[dict]) -> list[dict[str, str]]:
    corrections: list[dict[str, str]] = []
    for item in evaluations:
        for correction in item.get("top_corrections", []):
            if correction not in corrections:
                corrections.append(correction)
    return corrections


def _collect_filler_words(
    transcript: str,
    evaluations: list[dict],
) -> list[dict[str, Any]]:
    collected: list[dict[str, Any]] = []
    for item in evaluations:
        for filler in item.get("filler_words", []):
            if filler not in collected:
                collected.append(filler)
    if collected:
        return collected

    lowered = transcript.lower()
    results: list[dict[str, Any]] = []
    for phrase in ["um", "uh", "like", "actually", "you know", "i mean"]:
        count = lowered.count(phrase)
        if count:
            results.append({"phrase": phrase, "count": count})
    return results


def _collect_pause_feedback(
    evaluations: list[dict],
    avg_fluency: float,
    avg_accuracy: float,
) -> list[str]:
    feedback: list[str] = []
    for item in evaluations:
        for note in item.get("pause_feedback", []):
            if note not in feedback:
                feedback.append(note)

    if feedback:
        return feedback[:3]

    if avg_fluency < 80:
        feedback.append("建议先慢速跟读，再做一次完整不停顿复述。")
    if avg_accuracy < 80:
        feedback.append("容易在关键词附近停顿，可先逐词重读再连成句子。")
    if not feedback:
        feedback.append("停顿分布自然，可以继续优化连读与句尾收束。")
    return feedback[:3]


def _build_highlights(
    transcript: str,
    avg_fluency: float,
    avg_accuracy: float,
    corrections: list[dict[str, str]],
) -> list[str]:
    highlights: list[str] = []
    if transcript:
        highlights.append(f"已完成 {len(transcript.split())} 个词的口语输出。")
    if avg_fluency >= 80:
        highlights.append("整体语流比较顺，可以开始做更长句的复述练习。")
    if avg_accuracy >= 80:
        highlights.append("关键词命中率不错，表达骨架已经稳定。")
    if corrections:
        focus = ", ".join(item.get("word", "") for item in corrections[:3] if item.get("word"))
        if focus:
            highlights.append(f"下一轮重点盯住这些词：{focus}。")
    return highlights[:3]


def _build_recommended_practice(
    avg_fluency: float,
    avg_accuracy: float,
    corrections: list[dict[str, str]],
    filler_words: list[dict[str, Any]],
) -> list[str]:
    practice: list[str] = []
    if avg_accuracy < 80:
        practice.append("先做 3 次慢速跟读，把关键词逐个读准。")
    if avg_fluency < 80:
        practice.append("做 2 轮意群分段复述，每轮控制在不停顿说完整句。")
    if corrections:
        focus = ", ".join(item.get("word", "") for item in corrections[:3] if item.get("word"))
        if focus:
            practice.append(f"专项攻克这些词的发音与重音：{focus}。")
    if filler_words:
        phrases = ", ".join(str(item.get("phrase", "")) for item in filler_words[:3] if item.get("phrase"))
        if phrases:
            practice.append(f"下一轮刻意减少这些 filler words：{phrases}。")
    if not practice:
        practice.append("继续做正常语速跟读，并开始尝试脱稿复述。")
    return practice[:4]
