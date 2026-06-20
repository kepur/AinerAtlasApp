"""Helpers for Thought Freeze — normalize LLM output and build fallbacks."""

from __future__ import annotations

from app.schemas import ConversationAIResult


def extract_expression_versions(data: dict) -> dict[str, str]:
    """Accept common LLM key variants for multi-version expression output."""
    raw = (
        data.get("expression_versions")
        or data.get("variants")
        or data.get("versions")
        or {}
    )
    if isinstance(raw, dict):
        return {str(k): str(v).strip() for k, v in raw.items() if v and str(v).strip()}
    if isinstance(raw, list):
        out: dict[str, str] = {}
        for idx, item in enumerate(raw):
            if isinstance(item, dict):
                key = (
                    item.get("variant")
                    or item.get("type")
                    or item.get("lang")
                    or item.get("name")
                    or f"version_{idx}"
                )
                val = item.get("text") or item.get("content") or item.get("value") or ""
                if val:
                    out[str(key)] = str(val).strip()
            elif item:
                out[f"version_{idx}"] = str(item).strip()
        return out
    return {}


def _user_lines_from_transcript(source_text: str) -> list[str]:
    lines: list[str] = []
    for row in source_text.splitlines():
        row = row.strip()
        if not row:
            continue
        if ":" in row:
            role, content = row.split(":", 1)
            if role.strip().lower() in {"user", "用户"} and content.strip():
                lines.append(content.strip())
        else:
            lines.append(row)
    return lines


def ensure_expression_versions(
    result: ConversationAIResult,
    *,
    source_text: str,
    title: str,
) -> dict[str, str]:
    """Ensure freeze always has usable variants even when LLM JSON is partial."""
    versions = {
        k: v.strip()
        for k, v in (result.expression_versions or {}).items()
        if v and str(v).strip()
    }

    target = (result.main_reply_target or result.suggested_expression or "").strip()
    native = (result.main_reply_native or "").strip()
    user_lines = _user_lines_from_transcript(source_text)
    last_user = user_lines[-1] if user_lines else ""

    if not versions.get("native_full"):
        if native:
            versions["native_full"] = native
        elif last_user:
            versions["native_full"] = last_user
        elif title:
            versions["native_full"] = title

    if target:
        versions.setdefault("natural_spoken", target)
        versions.setdefault("basic", target)
        versions.setdefault("advanced", target)
        versions.setdefault("one_line", target[:200])

    if result.suggested_expression:
        versions.setdefault("golden_quote", result.suggested_expression.strip())

    if title and not versions.get("written"):
        versions["written"] = f"Regarding «{title}», {target or last_user or native}"

    if len(versions) < 2 and source_text.strip():
        snippet = source_text.strip()[:500]
        versions.setdefault("native_full", snippet)

    return {k: v for k, v in versions.items() if v}

