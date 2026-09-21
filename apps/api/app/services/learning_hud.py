"""Shared learning-HUD generation for games — language-pluggable and async-ready.

Every game engine used to carry its own copy of the same HUD prompt, each one
written for English learners and each one awaited inside ``handle_turn`` — so
the player could not see the AI's reply until the grammar analysis had also
finished. This module owns that prompt once, builds it from the session's
:class:`~app.services.language_contract.LanguageContract`, and is called from a
background task so the turn returns as soon as the dialogue is ready.

HUD payloads carry an ``analysis_status`` of ``pending`` / ``ready`` / ``failed``
so the client knows whether to show a spinner, the cards, or nothing.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.services.language_contract import LanguageContract, contract

logger = logging.getLogger(__name__)

STATUS_PENDING = "pending"
STATUS_READY = "ready"
STATUS_FAILED = "failed"


def pending_hud() -> dict:
    """Placeholder stored on a turn while the analysis runs in the background."""
    return {"analysis_status": STATUS_PENDING}


def is_pending(hud: dict | None) -> bool:
    return bool(hud) and hud.get("analysis_status") == STATUS_PENDING


@dataclass(frozen=True)
class HudRequest:
    """One turn's worth of context for the learning analysis."""

    user_input: str
    # What just happened in the game, in the engine's own words.
    context: str = ""
    # Who the coach is, phrased for the game ("海龟汤提问教练").
    coach_role: str = "表达教练"
    # The multi-agent panel shown at the bottom of the HUD.
    agents: tuple[tuple[str, str], ...] = (
        ("Language Coach", "点评表达的地道程度"),
        ("Grammar Coach", "指出语法或形态问题"),
        ("Game Coach", "给出下一步策略建议"),
    )
    # Admin-editable PromptTemplate key (``game.<prompt_key>``).
    prompt_key: str = ""
    # Which routed provider slot to use.
    task: str = "game_challenge_hud"


def build_system_prompt(req: HudRequest, lc: LanguageContract) -> str:
    """The one HUD prompt, rendered for this language pair."""
    agent_spec = ",".join(
        f'{{"agent":"{name}","result":"{lc.native_name}：{duty}"}}' for name, duty in req.agents
    )
    examples = lc.examples(2)
    example_note = ""
    if examples:
        shown = "；".join(f"{tgt}（{gloss}）" for tgt, gloss in examples)
        example_note = f"\n该语言的示范句式：{shown}"

    return (
        f"你是{req.coach_role}。玩家在游戏中用任意语言表达了想法，"
        f"你要教他如何用 {lc.target_name} 更自然地说同一件事。\n\n"
        "返回 JSON：\n"
        '{"main_expression":"玩家这句话的地道目标语表达，1 句，不超过 18 词",'
        '"meaning_native":"上面这句的解释语言翻译",'
        '"variants":{"natural_spoken":"自然口语版","basic":"简单版","written":"书面版","advanced":"高级版"},'
        '"why_this_expression":[{"point":"要点","explanation":"为什么这样说更自然"}],'
        '"patterns_v2":[{"pattern":"可复用句型","example":"目标语例句","add_to_crush":true}],'
        '"vocabulary":["关键词1","关键词2","关键词3"],'
        f'"agents":[{agent_spec}]'
        "}\n"
        f"main_expression、variants 的四个值、patterns_v2 的 pattern/example、vocabulary "
        f"必须全部是 {lc.target_name}；meaning_native、why_this_expression 的 explanation、"
        f"agents 的 result 必须全部是 {lc.native_name}。"
        f"{example_note}"
    )


def normalize_hud(hud: dict | None) -> dict:
    """Accept the field-name variations different models emit."""
    if not isinstance(hud, dict):
        return {"analysis_status": STATUS_FAILED}

    hud = dict(hud)
    for a in hud.get("agents") or []:
        if isinstance(a, dict) and "name" in a and "agent" not in a:
            a["agent"] = a.pop("name")

    if not hud.get("main_expression"):
        hud["main_expression"] = (
            hud.pop("main_reply_target", None) or hud.pop("expression", None) or ""
        )
    if not hud.get("meaning_native"):
        hud["meaning_native"] = (
            hud.pop("main_reply_native", None) or hud.pop("meaning", None) or ""
        )

    hud["v2"] = True
    hud["detected_intent"] = hud.get("detected_intent") or "expression_learning"
    hud["analysis_status"] = STATUS_READY if hud.get("main_expression") else STATUS_FAILED
    return hud


async def generate_hud(
    db: Session,
    *,
    target_language: str,
    native_language: str,
    request: HudRequest,
) -> dict:
    """Run the learning analysis for one turn. Never raises."""
    from app.services.game_prompts import get_game_prompt
    from app.services.llm import require_llm_provider
    from app.services.runtime_config import resolve_llm_provider_for_task

    lc = contract(target_language, native_language)
    system = build_system_prompt(request, lc)

    if request.prompt_key:
        system = get_game_prompt(
            db,
            request.prompt_key,
            system,
            target_language=lc.target,
            native_language=lc.native,
        )
    else:
        system = lc.localize(system)

    user_msg = f"玩家的表达：{request.user_input}"
    if request.context:
        user_msg += f"\n游戏情境：{request.context}"

    try:
        provider = require_llm_provider(
            resolve_llm_provider_for_task(request.task, db), db
        )
        raw = await provider.complete_json(system, user_msg, temperature=0.7, max_tokens=900)
    except Exception as exc:  # noqa: BLE001 — a failed HUD must never break a turn
        logger.warning("learning HUD generation failed (%s): %s", request.prompt_key, exc)
        return {"analysis_status": STATUS_FAILED}

    return normalize_hud(raw)
