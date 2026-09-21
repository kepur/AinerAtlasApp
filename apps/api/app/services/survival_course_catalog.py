"""Data-driven fixed Survival Sprint courses for supported target languages."""

# ruff: noqa: E501

from __future__ import annotations

from copy import deepcopy


COURSE_LANGUAGES: dict[str, dict] = {
    "sr": {"name": "塞尔维亚语", "native_name": "Srpski", "locale": "sr-RS", "voice": "sr-RS-SophieNeural"},
    "en": {"name": "英语", "native_name": "English", "locale": "en-US", "voice": "en-US-AriaNeural"},
    "es": {"name": "西班牙语", "native_name": "Español", "locale": "es-ES", "voice": "es-ES-ElviraNeural"},
    "fr": {"name": "法语", "native_name": "Français", "locale": "fr-FR", "voice": "fr-FR-DeniseNeural"},
    "de": {"name": "德语", "native_name": "Deutsch", "locale": "de-DE", "voice": "de-DE-KatjaNeural"},
    "ja": {"name": "日语", "native_name": "日本語", "locale": "ja-JP", "voice": "ja-JP-NanamiNeural"},
    "ko": {"name": "韩语", "native_name": "한국어", "locale": "ko-KR", "voice": "ko-KR-SunHiNeural"},
}


_INTENTS = {
    "Q_WHAT": "什么",
    "Q_WHERE": "哪里",
    "Q_WHEN": "什么时候",
    "Q_HOW": "怎么/如何",
    "Q_HOW_MUCH": "多少/多少钱",
    "ACT_WANT_TO": "我想……",
    "ACT_CAN": "我能/可以……",
    "NEED_THING": "我需要……",
    "NEG_DONT_UNDERSTAND": "我没听懂",
    "REPAIR_SLOW": "请慢一点",
    "REPAIR_REPEAT": "请再说一次",
    "POLITE_THANKS": "谢谢",
}


# concept_id, minimal form, pronunciation cue, fixed example, Chinese meaning
_PHRASES: dict[str, list[tuple[str, str, str, str, str]]] = {
    "en": [
        ("Q_WHAT", "what", "沃特", "What is this?", "这是什么？"),
        ("Q_WHERE", "where", "威尔", "Where is the station?", "车站在哪里？"),
        ("Q_WHEN", "when", "温", "When does the train leave?", "火车什么时候出发？"),
        ("Q_HOW", "how", "豪", "How do I get to the center?", "我怎么去市中心？"),
        ("Q_HOW_MUCH", "how much", "豪 马奇", "How much is it?", "多少钱？"),
        ("ACT_WANT_TO", "I want to...", "爱 旺特 图", "I want to buy water.", "我想买水。"),
        ("ACT_CAN", "I can...", "爱 坎", "I can pay by card.", "我可以刷卡。"),
        ("NEED_THING", "I need...", "爱 尼德", "I need help.", "我需要帮助。"),
        ("NEG_DONT_UNDERSTAND", "I don't understand.", "爱 冬特 安德斯坦德", "Sorry, I don't understand.", "抱歉，我没听懂。"),
        ("REPAIR_SLOW", "Please speak more slowly.", "普利兹 斯皮克 莫尔 斯洛利", "Please speak more slowly.", "请说慢一点。"),
        ("REPAIR_REPEAT", "Could you repeat that?", "库德 优 瑞皮特", "Could you repeat that?", "请再说一次。"),
        ("POLITE_THANKS", "Thank you.", "三克 优", "Thank you very much.", "非常感谢。"),
    ],
    "es": [
        ("Q_WHAT", "qué", "克", "¿Qué es esto?", "这是什么？"),
        ("Q_WHERE", "dónde", "栋德", "¿Dónde está la estación?", "车站在哪里？"),
        ("Q_WHEN", "cuándo", "宽多", "¿Cuándo sale el tren?", "火车什么时候出发？"),
        ("Q_HOW", "cómo", "科莫", "¿Cómo llego al centro?", "我怎么去市中心？"),
        ("Q_HOW_MUCH", "cuánto", "宽托", "¿Cuánto cuesta?", "多少钱？"),
        ("ACT_WANT_TO", "Quiero...", "基耶罗", "Quiero comprar agua.", "我想买水。"),
        ("ACT_CAN", "Puedo...", "普埃多", "Puedo pagar con tarjeta.", "我可以刷卡。"),
        ("NEED_THING", "Necesito...", "内塞西托", "Necesito ayuda.", "我需要帮助。"),
        ("NEG_DONT_UNDERSTAND", "No entiendo.", "诺 恩铁恩多", "Perdón, no entiendo.", "抱歉，我没听懂。"),
        ("REPAIR_SLOW", "Hable más despacio, por favor.", "阿布雷 马斯 德斯帕西奥", "Hable más despacio, por favor.", "请说慢一点。"),
        ("REPAIR_REPEAT", "¿Puede repetirlo?", "普埃德 雷佩蒂尔洛", "¿Puede repetirlo?", "请再说一次。"),
        ("POLITE_THANKS", "Gracias.", "格拉西亚斯", "Muchas gracias.", "非常感谢。"),
    ],
    "fr": [
        ("Q_WHAT", "qu'est-ce que", "凯斯 克", "Qu'est-ce que c'est ?", "这是什么？"),
        ("Q_WHERE", "où", "乌", "Où est la gare ?", "车站在哪里？"),
        ("Q_WHEN", "quand", "康", "Quand part le train ?", "火车什么时候出发？"),
        ("Q_HOW", "comment", "科芒", "Comment aller au centre ?", "我怎么去市中心？"),
        ("Q_HOW_MUCH", "combien", "孔比安", "Combien ça coûte ?", "多少钱？"),
        ("ACT_WANT_TO", "Je voudrais...", "热 伍德雷", "Je voudrais acheter de l'eau.", "我想买水。"),
        ("ACT_CAN", "Je peux...", "热 珀", "Je peux payer par carte.", "我可以刷卡。"),
        ("NEED_THING", "J'ai besoin de...", "热 贝宗 德", "J'ai besoin d'aide.", "我需要帮助。"),
        ("NEG_DONT_UNDERSTAND", "Je ne comprends pas.", "热 纳 孔普朗 巴", "Désolé, je ne comprends pas.", "抱歉，我没听懂。"),
        ("REPAIR_SLOW", "Parlez plus lentement, s'il vous plaît.", "巴尔莱 普吕 朗特芒", "Parlez plus lentement, s'il vous plaît.", "请说慢一点。"),
        ("REPAIR_REPEAT", "Pouvez-vous répéter ?", "普韦 伍 雷佩泰", "Pouvez-vous répéter ?", "请再说一次。"),
        ("POLITE_THANKS", "Merci.", "梅尔西", "Merci beaucoup.", "非常感谢。"),
    ],
    "de": [
        ("Q_WHAT", "was", "瓦斯", "Was ist das?", "这是什么？"),
        ("Q_WHERE", "wo", "沃", "Wo ist der Bahnhof?", "车站在哪里？"),
        ("Q_WHEN", "wann", "万", "Wann fährt der Zug ab?", "火车什么时候出发？"),
        ("Q_HOW", "wie", "维", "Wie komme ich ins Zentrum?", "我怎么去市中心？"),
        ("Q_HOW_MUCH", "wie viel", "维 菲尔", "Wie viel kostet das?", "多少钱？"),
        ("ACT_WANT_TO", "Ich möchte...", "伊希 默希特", "Ich möchte Wasser kaufen.", "我想买水。"),
        ("ACT_CAN", "Ich kann...", "伊希 坎", "Ich kann mit Karte zahlen.", "我可以刷卡。"),
        ("NEED_THING", "Ich brauche...", "伊希 布劳赫", "Ich brauche Hilfe.", "我需要帮助。"),
        ("NEG_DONT_UNDERSTAND", "Ich verstehe nicht.", "伊希 费尔施特厄 尼希特", "Entschuldigung, ich verstehe nicht.", "抱歉，我没听懂。"),
        ("REPAIR_SLOW", "Bitte sprechen Sie langsamer.", "比特 施普雷兴 齐 朗扎默", "Bitte sprechen Sie langsamer.", "请说慢一点。"),
        ("REPAIR_REPEAT", "Können Sie das wiederholen?", "克嫩 齐 达斯 维德霍伦", "Können Sie das wiederholen?", "请再说一次。"),
        ("POLITE_THANKS", "Danke.", "当克", "Vielen Dank.", "非常感谢。"),
    ],
    "ja": [
        ("Q_WHAT", "何（なに）", "nani", "これは何ですか？", "这是什么？"),
        ("Q_WHERE", "どこ", "doko", "駅はどこですか？", "车站在哪里？"),
        ("Q_WHEN", "いつ", "itsu", "電車はいつ出ますか？", "电车什么时候出发？"),
        ("Q_HOW", "どう", "dou", "中心部へはどう行きますか？", "我怎么去市中心？"),
        ("Q_HOW_MUCH", "いくら", "ikura", "いくらですか？", "多少钱？"),
        ("ACT_WANT_TO", "〜たいです", "tai desu", "水を買いたいです。", "我想买水。"),
        ("ACT_CAN", "〜できます", "dekimasu", "カードで払えます。", "我可以刷卡。"),
        ("NEED_THING", "〜が必要です", "ga hitsuyou desu", "助けが必要です。", "我需要帮助。"),
        ("NEG_DONT_UNDERSTAND", "わかりません。", "wakarimasen", "すみません、わかりません。", "抱歉，我没听懂。"),
        ("REPAIR_SLOW", "もう少しゆっくり話してください。", "mou sukoshi yukkuri", "もう少しゆっくり話してください。", "请说慢一点。"),
        ("REPAIR_REPEAT", "もう一度お願いします。", "mou ichido onegaishimasu", "もう一度お願いします。", "请再说一次。"),
        ("POLITE_THANKS", "ありがとうございます。", "arigatou gozaimasu", "どうもありがとうございます。", "非常感谢。"),
    ],
    "ko": [
        ("Q_WHAT", "뭐", "mwo", "이게 뭐예요?", "这是什么？"),
        ("Q_WHERE", "어디", "eodi", "역이 어디예요?", "车站在哪里？"),
        ("Q_WHEN", "언제", "eonje", "기차가 언제 출발해요?", "火车什么时候出发？"),
        ("Q_HOW", "어떻게", "eotteoke", "시내에 어떻게 가요?", "我怎么去市中心？"),
        ("Q_HOW_MUCH", "얼마", "eolma", "얼마예요?", "多少钱？"),
        ("ACT_WANT_TO", "〜하고 싶어요", "hago sipeoyo", "물을 사고 싶어요.", "我想买水。"),
        ("ACT_CAN", "〜할 수 있어요", "hal su isseoyo", "카드로 결제할 수 있어요.", "我可以刷卡。"),
        ("NEED_THING", "〜이/가 필요해요", "piryohaeyo", "도움이 필요해요.", "我需要帮助。"),
        ("NEG_DONT_UNDERSTAND", "잘 모르겠어요.", "jal moreugesseoyo", "죄송하지만 잘 모르겠어요.", "抱歉，我没听懂。"),
        ("REPAIR_SLOW", "천천히 말씀해 주세요.", "cheoncheonhi malsseumhae juseyo", "천천히 말씀해 주세요.", "请说慢一点。"),
        ("REPAIR_REPEAT", "다시 말씀해 주세요.", "dasi malsseumhae juseyo", "다시 말씀해 주세요.", "请再说一次。"),
        ("POLITE_THANKS", "감사합니다.", "gamsahamnida", "정말 감사합니다.", "非常感谢。"),
    ],
}


_DNA: dict[str, list[tuple[str, str, str, str]]] = {
    "en": [("先听重音", "英语拼写和发音不总一致，先记整词声音与重音。", "声音 + 词块", "不要逐字母拼读"), ("先用固定语序", "基础句先保持主语 + 动词 + 对象。", "I + verb + object", "疑问句需要助动词"), ("用词块代替翻译", "I want to / I need / Could you 是可复用骨架。", "骨架 + 槽位", "不要逐词翻译中文"), ("先礼貌再复杂", "please / could you 能覆盖多数陌生人场景。", "Please + request", "语气比复杂语法更重要")],
    "es": [("元音先读稳", "西语五个元音相对稳定，先建立字母到声音的直接连接。", "a/e/i/o/u → 固定音", "h 通常不发音"), ("名词有性别", "冠词和形容词要跟名词的性数配合。", "el/la + 名词", "不要默认所有词都用 el"), ("主语经常省略", "动词词尾已经提示人称，口语常不说 yo。", "(Yo) quiero...", "先掌握高频第一人称"), ("礼貌请求", "对陌生人用 por favor 和 usted 形式更稳妥。", "¿Puede...?", "不要只用命令式")],
    "fr": [("先把声音成块", "法语词尾常不发音，先按整块声音记忆。", "拼写块 → 声音块", "不要每个字母都读"), ("名词有性别", "un/une、le/la 要和名词一起记。", "冠词 + 名词", "不要只背裸词"), ("否定先抓框架", "基础否定常用 ne...pas，口语会弱化 ne。", "ne + 动词 + pas", "先能听懂两种形式"), ("礼貌条件式", "Je voudrais 比 Je veux 更适合服务场景。", "Je voudrais...", "语气优先")],
    "de": [("名词大写", "德语名词首字母大写，并和冠词一起记。", "der/die/das + 名词", "不要只背裸名词"), ("动词在第二位", "陈述句的变位动词通常占第二位置。", "位置1 + 动词 + ...", "时间词在前时主语后移"), ("格先按词块学", "不要一开始背完整表，先记 mit Karte、zum Bahnhof。", "介词 + 固定格", "词块先于规则表"), ("礼貌用 Sie", "陌生人和办事场景先用 Sie。", "Können Sie...?", "注意 Sie 大写")],
    "ja": [("三套文字分工", "平假名承载语法，片假名常写外来词，汉字承载核心意义。", "汉字 + 假名", "先认高频组合"), ("动词放后面", "日语常把动作放在句尾。", "话题 + 对象 + 动词", "听句尾判断动作"), ("助词标角色", "は、を、に、で提示词在句中的作用。", "名词 + 助词", "不要逐字对应中文"), ("先用です/ます", "初学对陌生人统一用礼貌体最安全。", "词干 + です/ます", "先稳定再学简体")],
    "ko": [("先读韩文音节块", "韩文把辅音元音组合成方块，但仍按声音顺序读。", "辅音 + 元音 → 音节块", "不要把方块当汉字"), ("动词放句尾", "韩语常把动作和礼貌结尾放在最后。", "话题 + 对象 + 动词", "听到句尾才完整"), ("助词标角色", "은/는、이/가、을/를提示话题、主语和宾语。", "名词 + 助词", "口语可省但先学会识别"), ("礼貌等级先统一", "初学先稳定使用 -요 体。", "词干 + 아/어요", "不要在一句里混用等级")],
}


_LOCATION = {
    "en": ("I'm in {place_locative}.", "I'm going to {place_accusative}.", "I'm coming from {place_genitive}.", {"city": ("the city center", "the city center", "the city center"), "hotel": ("the hotel", "the hotel", "the hotel")}),
    "es": ("Estoy en {place_locative}.", "Voy {place_accusative}.", "Vengo {place_genitive}.", {"city": ("el centro", "al centro", "del centro"), "hotel": ("el hotel", "al hotel", "del hotel")}),
    "fr": ("Je suis à {place_locative}.", "Je vais à {place_accusative}.", "Je viens {place_genitive}.", {"city": ("la gare", "la gare", "de la gare"), "hotel": ("l'hôtel", "l'hôtel", "de l'hôtel")}),
    "de": ("Ich bin {place_locative}.", "Ich gehe {place_accusative}.", "Ich komme {place_genitive}.", {"city": ("im Zentrum", "ins Zentrum", "aus dem Zentrum"), "hotel": ("im Hotel", "ins Hotel", "aus dem Hotel")}),
    "ja": ("{place_locative}にいます。", "{place_accusative}へ行きます。", "{place_genitive}から来ました。", {"city": ("駅", "駅", "駅"), "hotel": ("ホテル", "ホテル", "ホテル")}),
    "ko": ("{place_locative}에 있어요.", "{place_accusative}에 가요.", "{place_genitive}에서 왔어요.", {"city": ("역", "역", "역"), "hotel": ("호텔", "호텔", "호텔")}),
}


def supported_course_catalog() -> list[dict]:
    return [
        {"code": code, **deepcopy(meta)}
        for code, meta in COURSE_LANGUAGES.items()
    ]


def build_fixed_course(language: str) -> dict:
    code = language.lower().split("-", 1)[0]
    if code not in _PHRASES:
        raise KeyError(code)
    meta = COURSE_LANGUAGES[code]
    rows = _PHRASES[code]
    engine_items = []
    by_id: dict[str, dict] = {}
    for concept_id, target, pronunciation, example, native in rows:
        item = {
            "concept_id": concept_id,
            "intent": _INTENTS[concept_id],
            "target": target,
            "pronunciation": pronunciation,
            "pattern": target,
            "examples": [{"target": example, "native": native}],
            "confusable": "先把整句说顺，再逐步替换槽位。",
            "scenario_ids": ["shop", "transport", "help"],
        }
        engine_items.append(item)
        by_id[concept_id] = item

    dna_cards = []
    for index, (title, rule, formula, pitfall) in enumerate(_DNA[code]):
        example = rows[index % len(rows)]
        dna_cards.append({
            "id": f"{code}_dna_{index + 1}",
            "title": title,
            "rule": rule,
            "formula": formula,
            "examples": [{"target": example[3], "native": example[4]}],
            "pitfall": pitfall,
            "drill": f"跟读三遍：{example[3]}",
        })

    loc_in, loc_to, loc_from, places = _LOCATION[code]
    place_options = []
    for place_id, forms in places.items():
        place_options.append({
            "id": place_id,
            "label": "市中心/车站" if place_id == "city" else "酒店",
            "forms": {"locative": forms[0], "accusative": forms[1], "genitive": forms[2]},
        })

    scenarios = [
        {
            "id": "shop",
            "title": "商店买水并付款",
            "goal": "提出需求、问价并说明付款方式",
            "required_concepts": ["ACT_WANT_TO", "Q_HOW_MUCH", "ACT_CAN"],
            "turns": [
                {"concept_id": concept, "partner": "店员正在等你表达。", "prompt_zh": by_id[concept]["examples"][0]["native"], "hint": by_id[concept]["target"], "target_answer": by_id[concept]["examples"][0]["target"]}
                for concept in ["ACT_WANT_TO", "Q_HOW_MUCH", "ACT_CAN"]
            ],
        },
        {
            "id": "transport",
            "title": "找到车站并确认时间",
            "goal": "问地点、问时间、没听清时请求重复",
            "required_concepts": ["Q_WHERE", "Q_WHEN", "REPAIR_REPEAT"],
            "turns": [
                {"concept_id": concept, "partner": "路人给你提供交通信息。", "prompt_zh": by_id[concept]["examples"][0]["native"], "hint": by_id[concept]["target"], "target_answer": by_id[concept]["examples"][0]["target"]}
                for concept in ["Q_WHERE", "Q_WHEN", "REPAIR_REPEAT"]
            ],
        },
        {
            "id": "help",
            "title": "听不懂时修复沟通",
            "goal": "承认没听懂、请求慢说并请求重复",
            "required_concepts": ["NEG_DONT_UNDERSTAND", "REPAIR_SLOW", "REPAIR_REPEAT"],
            "turns": [
                {"concept_id": concept, "partner": "对方说得太快，你需要主动修复沟通。", "prompt_zh": by_id[concept]["examples"][0]["native"], "hint": by_id[concept]["target"], "target_answer": by_id[concept]["examples"][0]["target"]}
                for concept in ["NEG_DONT_UNDERSTAND", "REPAIR_SLOW", "REPAIR_REPEAT"]
            ],
        },
    ]

    return {
        "course": {
            "code": code,
            "locale": meta["locale"],
            "voice": meta["voice"],
            "name": f"{meta['name']}生存冲刺",
            "stage": "L0 发动",
            "budget": "首批 12 个固定高频功能词块；掌握后进入 500 词基础阶梯。",
            "method": "语言 DNA → 功能按钮 → 填槽造句 → 真实场景 → 错题回炉",
        },
        "dna_cards": dna_cards,
        "engine_items": engine_items,
        "sentence_lab": {
            "intent": "我在/我要去/我从某地来",
            "slots": [
                {"id": "state", "label": "方向", "options": [
                    {"id": "in", "label": "我在", "value": loc_in},
                    {"id": "to", "label": "我要去", "value": loc_to},
                    {"id": "from", "label": "我从这里来", "value": loc_from},
                ]},
                {"id": "place", "label": "地点", "options": place_options},
            ],
            "transfer_prompt": "连续说出“我在这里”“我要去那里”“我从那里来”，不要逐词翻译。",
        },
        "scenarios": scenarios,
        "milestones": [
            {"level": "L0", "count": "12 个功能词块", "outcome": "立即处理求助、问路和购物"},
            {"level": "L1", "count": "500 基础词汇", "outcome": "覆盖高频人物、物品、动作与场景"},
            {"level": "L2", "count": "800 日常词汇", "outcome": "重复日常任务基本独立"},
            {"level": "L3", "count": "1200 甜点区间", "outcome": "毕业后按个人生活缺口扩展"},
        ],
        "accuracy_note": "固定课程负责高频骨架；LLM 只用于解释错误、生成个性化变体和补充真实生活缺口。",
    }


def find_fixed_engine_item(language: str, concept_id: str) -> dict | None:
    course = build_fixed_course(language)
    return next(
        (deepcopy(item) for item in course["engine_items"] if item["concept_id"] == concept_id),
        None,
    )
