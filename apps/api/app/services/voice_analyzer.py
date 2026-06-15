from __future__ import annotations

import re


FILLER_PATTERNS = {
    "en": {
        "um": r"\bum+\b",
        "uh": r"\buh+\b",
        "like": r"\blike\b",
        "actually": r"\bactually\b",
        "you know": r"\byou\s+know\b",
        "I mean": r"\bi\s+mean\b",
        "basically": r"\bbasically\b",
        "literally": r"\bliterally\b",
        "sort of": r"\bsort\s+of\b",
        "kind of": r"\bkind\s+of\b",
        "right": r"\bright\b(?=\s*[,.])",
        "so": r"\bso\b(?=\s*,)",
        "well": r"\bwell\b(?=\s*,)",
    },
    "zh": {
        "那个": r"那个",
        "这个": r"这个",
        "就是": r"就是",
        "然后": r"然后",
        "嗯": r"嗯+",
        "啊": r"啊+",
        "呃": r"呃+",
        "对吧": r"对吧",
    },
    "ja": {
        "えーと": r"えーと",
        "あの": r"あの",
        "まあ": r"まあ",
        "なんか": r"なんか",
    },
    "ko": {
        "그": r"\b그\b",
        "음": r"\b음\b",
        "뭐": r"\b뭐\b",
    },
}

PAUSE_MARKERS = [r"\.{2,}", r"\[pause\]", r"\(pause\)", r"—+", r"\.\.\.", r",\s*,"]


def analyze_transcript(text: str, language: str = "en") -> dict:
    if not text:
        return {
            "filler_words_count": 0,
            "filler_word_ratio": 0.0,
            "filler_words_found": [],
            "pause_count": 0,
            "pause_ratio": 0.0,
            "pace_estimate": "normal",
            "vocabulary_richness": 0.0,
            "sentence_complexity": 0.0,
            "confidence_estimate": 50.0,
            "fluency_score": 50.0,
            "fluency_issues": [],
            "grammar_issues_count": 0,
        }

    lowered = text.lower()
    words = [w for w in re.findall(r"[A-Za-z']+", lowered) if w]
    total_words = max(len(words), 1)

    lang_patterns = FILLER_PATTERNS.get(language, FILLER_PATTERNS["en"])
    filler_words_found: list[str] = []
    filler_words_count = 0
    for name, pattern in lang_patterns.items():
        matches = re.findall(pattern, lowered)
        if matches:
            filler_words_found.append(f"{name}({len(matches)})")
            filler_words_count += len(matches)

    filler_word_ratio = round(filler_words_count / total_words, 3)

    pause_count = sum(len(re.findall(p, text, re.IGNORECASE)) for p in PAUSE_MARKERS)
    sentences = re.split(r"[.!?]+", text)
    sentences = [s.strip() for s in sentences if s.strip()]
    sentence_count = max(len(sentences), 1)
    pause_ratio = round(pause_count / sentence_count, 3)

    text_len = len(text)
    if text_len < 100:
        pace_estimate = "fast"
    elif text_len > 300:
        pace_estimate = "slow"
    else:
        pace_estimate = "normal"

    unique_words = len(set(words))
    vocabulary_richness = round(unique_words / total_words, 3)

    sentence_complexity = round(total_words / sentence_count, 1)

    fluency_issues: list[str] = []
    if re.search(r"\b(\w+)\s+\1\b", lowered):
        fluency_issues.append("word repetitions detected")
    if re.search(r"\bi\s+mean\b", lowered):
        fluency_issues.append("self-correction 'I mean' detected")
    if filler_word_ratio > 0.1:
        fluency_issues.append(f"high filler word ratio ({filler_word_ratio})")
    if pause_ratio > 0.5:
        fluency_issues.append(f"frequent pauses ({pause_count} detected)")

    grammar_count = 0
    grammar_count += len(re.findall(r"\bi\s+is\b", lowered))
    grammar_count += len(re.findall(r"\bhe\s+don't\b", lowered))
    grammar_count += len(re.findall(r"\bshe\s+don't\b", lowered))
    grammar_count += len(re.findall(r"\bthey\s+was\b", lowered))
    grammar_count += len(re.findall(r"\bwe\s+was\b", lowered))
    grammar_count += len(re.findall(r"\bain't\b", lowered))

    filler_penalty = min(filler_word_ratio * 300, 40)
    pause_penalty = min(pause_ratio * 20, 20)
    repetition_penalty = 10 if "word repetitions detected" in fluency_issues else 0
    confidence_estimate = round(max(0, min(100, 100 - filler_penalty - pause_penalty - repetition_penalty)), 1)

    fluency_score = round(max(0, min(100, 100 - filler_penalty - pause_penalty)), 1)

    return {
        "filler_words_count": filler_words_count,
        "filler_word_ratio": filler_word_ratio,
        "filler_words_found": filler_words_found,
        "pause_count": pause_count,
        "pause_ratio": pause_ratio,
        "pace_estimate": pace_estimate,
        "vocabulary_richness": vocabulary_richness,
        "sentence_complexity": sentence_complexity,
        "confidence_estimate": confidence_estimate,
        "fluency_score": fluency_score,
        "fluency_issues": fluency_issues,
        "grammar_issues_count": grammar_count,
    }
