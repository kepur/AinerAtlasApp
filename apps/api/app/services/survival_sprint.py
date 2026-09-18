"""Reviewed Serbian MVP content for the Survival Sprint learning loop.

The first release is intentionally small and deterministic: it proves the
DNA -> functional buttons -> sentence transfer -> real scenario -> review-gap
flow without inventing frequency claims or depending on a live LLM call.
"""

# ruff: noqa: E501

from __future__ import annotations

from copy import deepcopy

from app.services.survival_course_catalog import (
    build_fixed_course,
    find_fixed_engine_item,
)


DNA_CARDS = [
    {
        "id": "script_sound",
        "title": "先读懂路牌",
        "rule": "塞语拉丁字母基本一字一音，č/ć、š、ž、đ 要单独认。",
        "formula": "看见字母 → 固定发音 → 直接拼读",
        "examples": [
            {"target": "Gde je stanica?", "native": "车站在哪里？"},
            {"target": "Želim čaj.", "native": "我想要茶。"},
        ],
        "pitfall": "不要按英语规则读 j；塞语 j 接近中文“耶”开头的音。",
        "drill": "朗读：stanica / čaj / želim",
    },
    {
        "id": "word_order",
        "title": "先说谁，再说动作",
        "rule": "中性顺序常是主语 + 动词 + 对象，但主语清楚时经常省略。",
        "formula": "(我) + 想/能/必须 + da + 动词",
        "examples": [
            {"target": "Hoću da kupim vodu.", "native": "我想买水。"},
            {"target": "Mogu da platim karticom.", "native": "我可以刷卡。"},
        ],
        "pitfall": "不要把中文逐词替换；da 后面的动词要用合适的人称形式。",
        "drill": "把 vodu 换成 kartu（票）。",
    },
    {
        "id": "need_split",
        "title": "“需要东西”和“需要做事”分开",
        "rule": "需要某物说 Treba mi + 名词；需要做事说 Treba da + 动词。",
        "formula": "Treba mi X / Treba da uradim X",
        "examples": [
            {"target": "Treba mi pomoć.", "native": "我需要帮助。"},
            {"target": "Treba da idem.", "native": "我得走了。"},
        ],
        "pitfall": "Treba mi 后面不要直接接 da + 动词。",
        "drill": "选择：需要出租车 / 需要去银行。",
    },
    {
        "id": "location_three_states",
        "title": "地点要分“在、去、从”",
        "rule": "同一地点会随静止、方向和来源改变词尾。",
        "formula": "u + 地点格 / u + 宾格 / iz + 属格",
        "examples": [
            {"target": "U Beogradu sam.", "native": "我在贝尔格莱德。"},
            {"target": "Idem u Beograd.", "native": "我去贝尔格莱德。"},
        ],
        "pitfall": "u Beogradu 是“在”，u Beograd 是“去”，不能混用。",
        "drill": "补全：Dolazim __ Beograda.",
    },
    {
        "id": "questions",
        "title": "疑问词放在你真正缺的信息上",
        "rule": "先用 gde/šta/koliko/kada 覆盖最常见的地点、事物、价格和时间。",
        "formula": "疑问词 + 是/动词 + 其余信息？",
        "examples": [
            {"target": "Gde je toalet?", "native": "厕所在哪里？"},
            {"target": "Koliko košta karta?", "native": "票多少钱？"},
        ],
        "pitfall": "ko 是“谁”，šta 是“什么”，不要混用。",
        "drill": "分别问：在哪里？多少钱？",
    },
    {
        "id": "negation",
        "title": "否定先抓 ne 与 nemam",
        "rule": "普通动词前常用 ne；“我没有”直接用 nemam。",
        "formula": "ne + 动词 / nemam + 名词",
        "examples": [
            {"target": "Ne razumem.", "native": "我不明白。"},
            {"target": "Nemam gotovinu.", "native": "我没有现金。"},
        ],
        "pitfall": "ne 与动词通常分写，但 nisam/nemam 等常用形式要整体记。",
        "drill": "说：我不会说塞尔维亚语。",
    },
    {
        "id": "politeness",
        "title": "陌生人先用礼貌复数",
        "rule": "对店员或办事人员用 Molim vas / Možete li... 更稳妥。",
        "formula": "Molim vas + 请求 / Možete li + 动词",
        "examples": [
            {"target": "Molim vas, govorite sporije.", "native": "请说慢一点。"},
            {"target": "Možete li da ponovite?", "native": "您能再说一遍吗？"},
        ],
        "pitfall": "molim 也可表示“不客气/请讲”，要结合场景判断。",
        "drill": "把“再说一次”改成礼貌请求。",
    },
]


def _item(concept_id: str, intent: str, target: str, pronunciation: str, pattern: str,
          examples: list[list[str]], confusable: str, scenarios: list[str]) -> dict:
    return {
        "concept_id": concept_id,
        "intent": intent,
        "target": target,
        "pronunciation": pronunciation,
        "pattern": pattern,
        "examples": [{"target": a, "native": b} for a, b in examples],
        "confusable": confusable,
        "scenario_ids": scenarios,
    }


ENGINE_ITEMS = [
    _item("Q_WHO", "谁", "ko", "扩", "Ko + 动词/是...?", [["Ko je to?", "那是谁？"], ["Ko radi ovde?", "谁在这里工作？"]], "不要和 šta（什么）混淆", ["social"]),
    _item("Q_WHAT", "什么", "šta", "什塔", "Šta + 动词...?", [["Šta je ovo?", "这是什么？"], ["Šta preporučujete?", "您推荐什么？"]], "口语常用 šta；što 还可表示为什么/关系词", ["shop", "restaurant"]),
    _item("Q_WHERE", "哪里", "gde", "格德", "Gde je/ su...?", [["Gde je toalet?", "厕所在哪里？"], ["Gde staje autobus?", "公交车在哪里停？"]], "ijekavian 地区也会见到 gdje", ["transport", "restaurant"]),
    _item("Q_WHEN", "什么时候", "kada", "卡达", "Kada + 动词...?", [["Kada polazi voz?", "火车什么时候出发？"], ["Kada radite?", "你们什么时候营业？"]], "口语也常说 kad", ["transport", "appointment"]),
    _item("Q_WHY", "为什么", "zašto", "扎什托", "Zašto + 动词...?", [["Zašto kasni?", "为什么晚点？"], ["Zašto ne radi?", "为什么不能用？"]], "不要用 šta 代替 zašto", ["transport", "shop"]),
    _item("Q_HOW", "怎么/如何", "kako", "卡科", "Kako + 动词...?", [["Kako da stignem tamo?", "我怎么到那里？"], ["Kako se ovo koristi?", "这个怎么用？"]], "kakav/kakva 是“什么样的”", ["transport", "shop"]),
    _item("Q_WHICH", "哪个", "koji/koja/koje", "科伊", "Koji + 名词...?", [["Koji autobus ide do centra?", "哪路公交去市中心？"], ["Koja karta mi treba?", "我需要哪种票？"]], "形式跟名词性别变化", ["transport"]),
    _item("Q_HOW_MUCH", "多少/多少钱", "koliko", "科利科", "Koliko + 动词/名词...?", [["Koliko košta?", "多少钱？"], ["Koliko dugo traje?", "要多久？"]], "价格要核对屏幕或收据，不靠猜", ["shop", "transport"]),
    _item("Q_WHOSE", "谁的", "čiji/čija/čije", "契伊", "Čiji + 名词...?", [["Čija je ovo torba?", "这是谁的包？"], ["Čiji je auto?", "这是谁的车？"]], "形式跟名词性别变化", ["social"]),
    _item("ACT_WANT_TO", "我想……", "Hoću da...", "霍丘 达", "Hoću da + 第一人称动词", [["Hoću da kupim vodu.", "我想买水。"], ["Hoću da rezervišem sto.", "我想订桌。"]], "更柔和可用 Želeo/Želela bih...", ["shop", "restaurant"]),
    _item("ACT_CAN", "我能/可以……", "Mogu da...", "莫古 达", "Mogu da + 第一人称动词", [["Mogu da platim karticom.", "我可以刷卡。"], ["Mogu da sačekam.", "我可以等。"]], "询问对方能力用 Možete li...", ["shop", "appointment"]),
    _item("ACT_MUST", "我必须……", "Moram da...", "莫拉姆 达", "Moram da + 第一人称动词", [["Moram da idem.", "我必须走了。"], ["Moram da promenim kartu.", "我必须改票。"]], "不是每个中文“要”都需要 moram", ["transport", "appointment"]),
    _item("NEED_THING", "我需要某物", "Treba mi...", "特雷巴 米", "Treba mi + 名词", [["Treba mi pomoć.", "我需要帮助。"], ["Treba mi taksi.", "我需要出租车。"]], "做事情用 Treba da...", ["transport", "help"]),
    _item("NEG_DONT_UNDERSTAND", "我没听懂", "Ne razumem.", "内 拉祖梅姆", "Ne + 动词", [["Izvinite, ne razumem.", "抱歉，我没听懂。"], ["Ne razumem pitanje.", "我没听懂问题。"]], "不是 Ne znam（我不知道）", ["help", "social"]),
    _item("REPAIR_SLOW", "请慢一点", "Molim vas, govorite sporije.", "莫利姆 瓦斯", "Molim vas + 请求", [["Molim vas, govorite sporije.", "请说慢一点。"], ["Može malo sporije?", "可以慢一点吗？"]], "对陌生人保留 vas 更礼貌", ["help", "appointment"]),
    _item("REPAIR_REPEAT", "请再说一次", "Možete li da ponovite?", "莫热特 利 达 波诺维特", "Možete li da + 动词", [["Možete li da ponovite?", "您能再说一次吗？"], ["Ponovite broj, molim vas.", "请重复一下号码。"]], "金额、日期、地址要复述确认", ["help", "appointment"]),
    _item("LOC_IN", "在某地", "u + 地点格", "乌", "U Beogradu sam.", [["U Beogradu sam.", "我在贝尔格莱德。"], ["U hotelu sam.", "我在酒店。"]], "移动目的地不用这个词尾", ["transport", "housing"]),
    _item("LOC_TO", "去某地", "u + 宾格", "乌", "Idem u Beograd.", [["Idem u Beograd.", "我去贝尔格莱德。"], ["Idem u hotel.", "我去酒店。"]], "去人/活动处常用 kod/na，需按词块学", ["transport", "housing"]),
    _item("LOC_FROM", "从某地来", "iz + 属格", "伊兹", "Dolazim iz Beograda.", [["Dolazim iz Beograda.", "我从贝尔格莱德来。"], ["Iz hotela sam.", "我从酒店来。"]], "从表面/活动处可能用 sa", ["transport", "housing"]),
]


SCENARIOS = [
    {
        "id": "shop",
        "title": "商店买水并付款",
        "goal": "找到水、问价格、说明刷卡",
        "required_concepts": ["Q_WHERE", "Q_HOW_MUCH", "ACT_WANT_TO", "ACT_CAN"],
        "turns": [
            {"partner": "店员：Dobar dan. Izvolite?", "prompt_zh": "说：我想买水。", "hint": "Hoću da...", "target_answer": "Hoću da kupim vodu."},
            {"partner": "店员：Naravno. Još nešto?", "prompt_zh": "问：多少钱？", "hint": "Koliko...", "target_answer": "Koliko košta?"},
            {"partner": "店员：Dvjesta dinara. Gotovina ili kartica?", "prompt_zh": "说：我可以刷卡。", "hint": "Mogu da...", "target_answer": "Mogu da platim karticom."},
        ],
    },
    {
        "id": "transport",
        "title": "问路去市中心",
        "goal": "找到公交站并确认哪路车",
        "required_concepts": ["Q_WHERE", "Q_WHICH", "LOC_TO", "REPAIR_REPEAT"],
        "turns": [
            {"partner": "路人：Dobar dan.", "prompt_zh": "问：公交站在哪里？", "hint": "Gde je...", "target_answer": "Gde je autobuska stanica?"},
            {"partner": "路人：Tamo, desno.", "prompt_zh": "问：哪路公交去市中心？", "hint": "Koji autobus...", "target_answer": "Koji autobus ide do centra?"},
            {"partner": "路人：Broj trideset jedan.", "prompt_zh": "没有听清，请对方重复。", "hint": "Možete li...", "target_answer": "Možete li da ponovite?"},
        ],
    },
    {
        "id": "help",
        "title": "听不懂时修复沟通",
        "goal": "承认没听懂、请求慢说、请求写下关键内容",
        "required_concepts": ["NEG_DONT_UNDERSTAND", "REPAIR_SLOW", "REPAIR_REPEAT"],
        "turns": [
            {"partner": "办事员快速说明了一串要求。", "prompt_zh": "说：抱歉，我没听懂。", "hint": "Izvinite...", "target_answer": "Izvinite, ne razumem."},
            {"partner": "办事员重新解释，但仍然很快。", "prompt_zh": "请求说慢一点。", "hint": "Molim vas...", "target_answer": "Molim vas, govorite sporije."},
            {"partner": "办事员说出一个日期。", "prompt_zh": "请求重复并把日期写下来；关键日期必须核对。", "hint": "Ponovite... / napišite...", "target_answer": "Ponovite datum i napišite ga, molim vas."},
        ],
    },
]


def get_serbian_sprint() -> dict:
    data = deepcopy({
        "course": {
            "code": "sr",
            "locale": "sr-RS",
            "voice": "sr-RS-SophieNeural",
            "name": "塞尔维亚语生存冲刺",
            "stage": "L0 发动",
            "budget": "首批 19 个高价值概念（完整 L0 预算为约 100–200）",
            "method": "语言 DNA → 功能按钮 → 填槽造句 → 真实场景 → 换场景复测",
        },
        "dna_cards": DNA_CARDS,
        "engine_items": ENGINE_ITEMS,
        "sentence_lab": {
            "intent": "我想去/我在/我从某地来",
            "slots": [
                {"id": "state", "label": "方向", "options": [
                    {"id": "in", "label": "我在", "value": "U {place_locative} sam."},
                    {"id": "to", "label": "我要去", "value": "Idem u {place_accusative}."},
                    {"id": "from", "label": "我从这里来", "value": "Dolazim iz {place_genitive}."},
                ]},
                {"id": "place", "label": "地点", "options": [
                    {"id": "belgrade", "label": "贝尔格莱德", "forms": {"locative": "Beogradu", "accusative": "Beograd", "genitive": "Beograda"}},
                    {"id": "hotel", "label": "酒店", "forms": {"locative": "hotelu", "accusative": "hotel", "genitive": "hotela"}},
                ]},
            ],
            "transfer_prompt": "先说“我在贝尔格莱德”，再换成“我去酒店”，最后说“我从酒店来”。",
        },
        "scenarios": SCENARIOS,
        "milestones": [
            {"level": "L0", "count": "100–200", "outcome": "购物、问价、找厕所、要求重复"},
            {"level": "L1", "count": "300–500", "outcome": "点餐、问路、交通、约时间"},
            {"level": "L2", "count": "约 800", "outcome": "处理多数重复日常场景并尝试换说法"},
            {"level": "L3", "count": "约 1200", "outcome": "按住房、工作和社交的真实缺口补洞"},
        ],
        "accuracy_note": "数字是主动学习预算，不代表 800 词即可覆盖 90% 日常语言。",
    })
    for scenario in data["scenarios"]:
        for index, turn in enumerate(scenario["turns"]):
            concepts = scenario.get("required_concepts", [])
            turn["concept_id"] = concepts[min(index, len(concepts) - 1)] if concepts else scenario["id"]
    return data


def get_survival_sprint(language: str) -> dict:
    code = (language or "sr").lower().split("-", 1)[0]
    return get_serbian_sprint() if code == "sr" else build_fixed_course(code)


def find_engine_item(concept_id: str, language: str = "sr") -> dict | None:
    code = (language or "sr").lower().split("-", 1)[0]
    if code != "sr":
        return find_fixed_engine_item(code, concept_id)
    return next((deepcopy(item) for item in ENGINE_ITEMS if item["concept_id"] == concept_id), None)
