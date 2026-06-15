"""Content moderation service stub."""

SENSITIVE_KEYWORDS = {
    "spam", "scam", "violence", "hate", "abuse", "illegal",
}


def moderate_text(content: str, content_type: str = "message") -> dict:
    lowered = content.lower()
    hits = [kw for kw in SENSITIVE_KEYWORDS if kw in lowered]
    if hits:
        return {
            "flagged": True,
            "action": "flag",
            "reason": f"Sensitive keywords detected: {', '.join(hits)}",
            "details": {"keywords": hits, "content_type": content_type},
        }
    return {"flagged": False, "action": "allow", "reason": "", "details": {}}
