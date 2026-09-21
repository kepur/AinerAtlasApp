"""One pluggable target-language contract shared by chat, games and practice.

Historically every prompt in this codebase was written for English learners:
the teaching rules were English grammar rules, the JSON schemas carried ``_en``
suffixed fields, and ``language_prompt()`` tried to retarget them by string
substitution (``"English" -> "Japanese"``). That breaks down the moment the
target language is not English — the model still receives English-shaped
instructions ("don't add `do` before `be`") for a language with no auxiliaries.

A :class:`LanguageContract` replaces that guesswork. Engines ask for a contract
once per turn and build their prompts from it, so adding a language means
adding a row to the catalog (and optionally a teaching-feature pack), never
touching an engine.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from functools import lru_cache
from typing import Any, Iterable

from app.services.languages import LOCALE_CATALOG, normalize_locale

# Canonical field names. Engines should emit these; the ``_en`` variants are
# legacy wire names kept readable for old rows and admin prompt overrides.
TARGET_FIELD = "target_text"
NATIVE_FIELD = "native_text"

_LEGACY_TARGET_SUFFIXES = ("_en", "_target")
_LEGACY_NATIVE_SUFFIXES = ("_native", "_zh")

# Writing system per locale — drives script-specific coaching (no romaji-only
# answers for Japanese, keep Arabic unvocalised but readable, etc.).
_SCRIPTS: dict[str, str] = {
    "ar": "arabic",
    "bn": "bengali",
    "hi": "devanagari",
    "ja": "japanese",
    "ko": "hangul",
    "ru": "cyrillic",
    "sr": "cyrillic-latin",
    "zh": "han",
}

_RTL = {"ar", "he", "fa", "ur"}

# What a learner of this language most often gets wrong when they transfer
# habits from English/Chinese. Used when no curriculum feature pack exists.
_TYPOLOGY: dict[str, str] = {
    "ar": "词根构词、性数一致、定冠词 al- 的连写与太阳月亮字母",
    "bn": "后置词、动词的敬语层级、量词与名词的搭配",
    "de": "框型结构（动词第二位/句尾原形）、四个格、名词性别",
    "en": "助动词与时态、冠词、介词搭配",
    "es": "动词变位、ser/estar 之分、名词性数一致",
    "fr": "冠词缩合、性数配合、否定框架 ne...pas",
    "hi": "后置词、作格标记 ne、动词的性数一致",
    "ja": "助词（は/が/を/に/で）、句末谓语语序、敬体与简体",
    "ko": "助词（은/는/이/가/을/를）、句末语尾与敬语阶梯、SOV 语序",
    "pt": "动词变位、缩合介词（no/na/do/da）、名词性数一致",
    "ru": "六个格、动词体（完成/未完成）、名词性别",
    "sr": "七个格、动词体、da + 变位动词结构",
    "zh": "量词、语序、离合词与补语结构",
}

_GENERIC_TYPOLOGY = "该语言自身的语序、形态变化与固定搭配"


@dataclass(frozen=True)
class LanguageContract:
    """Everything a prompt needs to teach ``target`` explained in ``native``."""

    target: str
    native: str
    target_name: str
    target_endonym: str
    native_name: str
    native_endonym: str
    script: str
    rtl: bool
    features: tuple[tuple[str, ...], ...] = field(default=())

    # -- teaching material -------------------------------------------------

    def teaching_rules(self, limit: int = 4) -> str:
        """Concrete, language-specific rules pulled from the curriculum pack."""
        rows = [row[2] for row in self.features[:limit] if len(row) > 2]
        if rows:
            return "；".join(rows)
        return _TYPOLOGY.get(self.target, _GENERIC_TYPOLOGY)

    def examples(self, limit: int = 3) -> list[tuple[str, str]]:
        """(target sentence, native gloss) pairs from the curriculum pack."""
        out: list[tuple[str, str]] = []
        for row in self.features[:limit]:
            if len(row) > 4:
                out.append((row[3], row[4]))
        return out

    @property
    def focus(self) -> str:
        """The typological traps a learner of this language keeps hitting."""
        return _TYPOLOGY.get(self.target, _GENERIC_TYPOLOGY)

    # -- prompt fragments --------------------------------------------------

    def header(self) -> str:
        """The language contract block appended to every system prompt."""
        script_note = ""
        if self.script in ("japanese", "hangul", "han"):
            script_note = f"用 {self.target_endonym} 的正规文字书写，不要只给罗马字转写。"
        elif self.script in ("arabic", "devanagari", "bengali", "cyrillic"):
            script_note = f"用 {self.target_endonym} 的原生文字书写，可在括号内附拉丁转写。"
        elif self.script == "cyrillic-latin":
            script_note = "西里尔或拉丁字母皆可，但同一条回答内保持一致。"

        return (
            f"\n\n【语言契约】目标语言：{self.target_name}（{self.target_endonym}，代码 {self.target}）。"
            f"解释语言：{self.native_name}（{self.native_endonym}，代码 {self.native}）。\n"
            f"- 所有目标语表达、对白、例句、词汇、variants，以及历史字段 *_en / *_target 的值，一律使用 {self.target_name}。\n"
            f"- 所有讲解、翻译、点评，以及 *_native / *_zh 字段，一律使用 {self.native_name}。\n"
            f"- JSON 字段名与枚举值（YES/NO/IRRELEVANT、CORRECT/PARTIAL/WRONG 等）保持英文原样，不要翻译。\n"
            f"- 教学重点：{self.teaching_rules()}。\n"
            f"- 该语言的常见难点：{self.focus}。"
            f"绝对不要把 {self.target_name} 套用英语的语法框架去讲解。"
            + (f"\n- {script_note}" if script_note else "")
        )

    def localize(self, prompt: str) -> str:
        """Retarget a legacy English-authored prompt, then bind the contract.

        Kept because admin-editable prompt overrides in the database may still
        say "英语"/"English". Substitution alone was never enough, so the
        contract header follows and has the final word.
        """
        if self.target != "en":
            for token in ("英语", "英文", "English"):
                prompt = prompt.replace(token, self.target_name)
        if self.native != "zh":
            for token in ("中文", "Chinese"):
                prompt = prompt.replace(token, self.native_name)
        return prompt + self.header()

    def json_note(self, target_fields: Iterable[str] = (), native_fields: Iterable[str] = ()) -> str:
        """Spell out which JSON keys hold target-language vs native text."""
        parts = []
        tf = [f for f in target_fields]
        nf = [f for f in native_fields]
        if tf:
            parts.append(f"字段 {'、'.join(tf)} 必须是 {self.target_name}")
        if nf:
            parts.append(f"字段 {'、'.join(nf)} 必须是 {self.native_name}")
        return ("\n" + "；".join(parts) + "。") if parts else ""


@lru_cache(maxsize=256)
def contract(target_language: str, native_language: str = "zh") -> LanguageContract:
    """Build (and cache) the contract for a target/native language pair."""
    from app.services.curriculum_packs import FEATURES

    target = normalize_locale(target_language or "en")
    native = normalize_locale(native_language or "zh")

    t_info = LOCALE_CATALOG.get(target, {})
    n_info = LOCALE_CATALOG.get(native, {})

    feats = FEATURES.get(target) or ()
    return LanguageContract(
        target=target,
        native=native,
        target_name=t_info.get("name", target),
        target_endonym=t_info.get("native_name", t_info.get("name", target)),
        native_name=n_info.get("name", native),
        native_endonym=n_info.get("native_name", n_info.get("name", native)),
        script=_SCRIPTS.get(target, "latin"),
        rtl=target in _RTL,
        features=tuple(tuple(row) for row in feats),
    )


def contract_for_session(session: Any) -> LanguageContract:
    """Contract for anything carrying ``target_language`` / ``native_language``."""
    return contract(
        getattr(session, "target_language", None) or "en",
        getattr(session, "native_language", None) or "zh",
    )


# ---------------------------------------------------------------------------
# Reading model output that may use canonical or legacy field names
# ---------------------------------------------------------------------------

def pick_target(data: dict, base: str, default: str = "") -> str:
    """Read a target-language value written under any of its historical names."""
    return _pick(data, base, _LEGACY_TARGET_SUFFIXES, default)


def pick_native(data: dict, base: str, default: str = "") -> str:
    """Read a native-language value written under any of its historical names."""
    return _pick(data, base, _LEGACY_NATIVE_SUFFIXES, default)


def _pick(data: dict, base: str, suffixes: tuple[str, ...], default: str) -> str:
    if not isinstance(data, dict):
        return default
    for key in (base, *(f"{base}{s}" for s in suffixes)):
        value = data.get(key)
        if isinstance(value, str) and value.strip():
            return value
    return default
