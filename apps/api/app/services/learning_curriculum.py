"""Language-pack adapter + ordered curriculum, using the existing progress tables.

Stable module/lesson IDs are persistence keys. UI never branches on language.
New packs supply content, while this runner owns prerequisites and assessment.
"""

import random
from collections.abc import Callable
from copy import deepcopy

from fastapi import HTTPException
from sqlalchemy import select

from app.models import UserMastery, VocabularyItem
from app.services.curriculum_packs import CORE_WORDS, FEATURES, QUESTION_MEANINGS, QUESTIONS
from app.services.survival_course_catalog import COURSE_LANGUAGES
from app.services.survival_sprint import get_survival_sprint

VERSION = "curriculum_v1"
MODULES = [
    ("foundations", "问答与生存按钮", "先能问谁、什么、哪里、什么时候，再学求助与回应。", "forum"),
    ("structure", "语言自己的造句规则", "用完整词块理解语序、介词、助词与词尾。", "account_tree"),
    ("vocabulary", "把词填进句子", "带着句子学词，不再孤立硬背。", "extension"),
    ("scenarios", "带进真实生活", "把问答、结构和词汇组合到购物、交通与求助。", "explore"),
]


def _builtin_pack(code: str) -> dict:
    if code not in FEATURES:
        raise HTTPException(422, "该语言尚未安装课程包")
    fixed = get_survival_sprint(code)
    lessons: dict[str, list[dict]] = {key: [] for key, *_ in MODULES}
    for i, (word, meaning) in enumerate(zip(QUESTIONS[code], QUESTION_MEANINGS, strict=True)):
        lessons["foundations"].append(
            dict(
                id=f"question-{i}",
                title=f"问：{meaning}",
                target=word,
                meaning=meaning,
                rule="先认出问题要索取什么信息。疑问词会随具体句式变化，接下来学习完整问句。",
                prompt=f"要问「{meaning}」，选择哪个疑问词？",
                answer=word,
            )
        )
    for item in fixed["engine_items"]:
        # Full question examples and repair expressions follow the basic buttons.
        if item["concept_id"].startswith(("Q_", "REPAIR_", "NEG_", "POLITE_")):
            ex = item["examples"][0]
            lessons["foundations"].append(
                dict(
                    id=item["concept_id"],
                    title=item["intent"],
                    target=ex["target"],
                    meaning=ex["native"],
                    rule=item["confusable"],
                    prompt=f"选择表达「{ex['native']}」的句子。",
                    answer=ex["target"],
                )
            )
    for concept, title, rule, target, meaning in FEATURES[code]:
        lessons["structure"].append(
            dict(
                id=concept,
                title=title,
                rule=rule,
                target=target,
                meaning=meaning,
                prompt=f"选择表达「{meaning}」的句子。",
                answer=target,
            )
        )
    for i, (word, meaning, example) in enumerate(CORE_WORDS[code]):
        # Only authored, attested surface forms are used; no automatic declension.
        sentence = example.replace(word, "____", 1)
        if sentence == example:
            sentence = example.replace(word[0].upper() + word[1:], "____", 1)
        lessons["vocabulary"].append(
            dict(
                id=f"word-{i}",
                title=meaning,
                rule="先听整句，再把目标词放回原来的位置。词尾和冠词按这句话一起记。",
                target=example,
                meaning=meaning,
                word=word,
                answer=word,
                prompt=f"填入表示「{meaning}」的词：{sentence}",
            )
        )
    for scene in fixed["scenarios"]:
        for i, turn in enumerate(scene["turns"]):
            lessons["scenarios"].append(
                dict(
                    id=f"{scene['id']}-{i}",
                    title=scene["title"],
                    rule=turn["partner"],
                    target=turn["target_answer"],
                    meaning=turn["prompt_zh"],
                    prompt=f"{turn['partner']}\n请表达：{turn['prompt_zh']}",
                    answer=turn["target_answer"],
                )
            )
    for module_id, rows in lessons.items():
        for row in rows:
            # All distractors are real expressions in the SAME language, assessed by meaning.
            pool = list(
                dict.fromkeys(
                    r["answer"]
                    for r in rows
                    if r["answer"] != row["answer"]
                    and r["id"].startswith("question-") == row["id"].startswith("question-")
                )
            )
            rng = random.Random(f"{code}:{module_id}:{row['id']}")
            rng.shuffle(pool)
            row["options"] = [row["answer"], *pool[:3]]
            rng.shuffle(row["options"])
    return {
        "language": code,
        **COURSE_LANGUAGES[code],
        "version": VERSION,
        "lessons": lessons,
        "modules": MODULES,
    }


# Trusted, code-registered content adapters; no runtime execution of uploaded plugins.
# A language may supply different module counts/order, IDs, and authored assessments.
PACK_BUILDERS: dict[str, Callable[[str], dict]] = {code: _builtin_pack for code in FEATURES}


def register_language_pack(code: str, metadata: dict, builder: Callable[[str], dict]) -> None:
    if code in PACK_BUILDERS:
        raise ValueError(f"Language pack already registered: {code}")
    for field in ("name", "native_name", "locale", "voice"):
        if not metadata.get(field):
            raise ValueError(f"Missing language metadata: {field}")
    COURSE_LANGUAGES[code] = dict(metadata)
    PACK_BUILDERS[code] = builder


def language_pack(code: str) -> dict:
    builder = PACK_BUILDERS.get(code)
    if builder is None:
        raise HTTPException(422, "该语言尚未安装课程包")
    pack = deepcopy(builder(code))
    pack.setdefault("modules", MODULES)
    pack.update(language=code, **COURSE_LANGUAGES[code])
    return pack


def module_state(progress, module_id: str) -> dict:
    return deepcopy((progress.state or {}).get(VERSION, {}).get(module_id, {}))


def path_payload(progress, pack: dict) -> dict:
    modules = []
    unlocked = True
    for index, (key, title, description, icon) in enumerate(pack["modules"]):
        rows = pack["lessons"][key]
        state = module_state(progress, key)
        done = set(state.get("completed", [])) & {r["id"] for r in rows}
        complete = len(done) == len(rows)
        next_id = next((r["id"] for r in rows if r["id"] not in done), rows[0]["id"])
        modules.append(
            dict(
                id=key,
                number=index + 1,
                title=title,
                description=description,
                icon=icon,
                completed=len(done),
                total=len(rows),
                unlocked=unlocked,
                complete=complete,
                next_lesson=next_id,
                due_review=len(state.get("mistakes", [])),
                preview=list(dict.fromkeys(r["title"] for r in rows))[:4],
            )
        )
        unlocked = unlocked and complete
    return dict(
        language=pack["language"],
        name=pack["name"],
        native_name=pack["native_name"],
        version=VERSION,
        modules=modules,
        next_module=next((m["id"] for m in modules if not m["complete"]), modules[-1]["id"]),
        completed=sum(m["completed"] for m in modules),
        total=sum(m["total"] for m in modules),
    )


def bridge_review_item(
    db, user_id: str, code: str, module: str, lesson: dict, *, correct: bool = True
) -> None:
    """Connect authored lessons to existing Crush queues; no second mastery system."""
    if "word" in lesson:
        word = lesson["word"]
        item = db.scalar(
            select(VocabularyItem).where(
                VocabularyItem.user_id == user_id,
                VocabularyItem.language_code == code,
                VocabularyItem.word == word,
            )
        )
        if not item:
            db.add(
                VocabularyItem(
                    user_id=user_id,
                    language_code=code,
                    word=word,
                    meaning=lesson["meaning"],
                    examples=[lesson["target"]],
                    topic="curriculum:core",
                    mastery_status="reviewing",
                    priority=4,
                    mastery_score=30 if correct else 10,
                )
            )
        else:
            from app.services.vocab_practice import apply_vocab_practice_result

            apply_vocab_practice_result(item, correct=correct)
            if not correct:
                item.mastery_status = "reviewing"
                item.priority = 5
    else:
        key = f"curriculum:{code}:{module}:{lesson['id']}"
        item = db.scalar(
            select(UserMastery).where(UserMastery.user_id == user_id, UserMastery.item_id == key)
        )
        if not item:
            db.add(
                UserMastery(
                    user_id=user_id,
                    item_id=key,
                    item_type="pattern",
                    language_code=code,
                    title=lesson["answer"],
                    examples=[lesson["target"], lesson["meaning"]],
                    priority=4,
                    mastery_score=30 if correct else 10,
                    correct_count=1 if correct else 0,
                    mistake_count=0 if correct else 1,
                )
            )
        elif not correct:
            item.status = "reviewing"
            item.priority = 5
            item.mistake_count += 1
            item.mastery_score = max(0, item.mastery_score - 6)


def authored_exercise(item) -> dict | None:
    if not (getattr(item, "item_id", "") or "").startswith("curriculum:"):
        return None
    _, code, module, lesson_id = item.item_id.split(":", 3)
    return next(
        (r for r in language_pack(code)["lessons"].get(module, []) if r["id"] == lesson_id), None
    )
