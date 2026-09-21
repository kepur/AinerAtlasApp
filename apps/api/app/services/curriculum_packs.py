"""Small, explicit language adapters. Examples are complete chunks, never English fillers.

Each tuple is (concept, lesson title, rule, target example, Chinese meaning).
Keep different languages' morphology in these adapters rather than in UI code.
"""

# ruff: noqa: E501

FEATURES = {
    "sr": [
        ("location", "在哪里：静止地点", "场景 → 介词 → 词尾：在贝尔格莱德整体记作 u Beogradu。", "U Beogradu sam.", "我在贝尔格莱德。"),
        ("direction", "去哪里：目的地", "去某地用方向词块；这里是 u Beograd，不是静止的 u Beogradu。", "Idem u Beograd.", "我去贝尔格莱德。"),
        ("source", "从哪里来：来源", "从某地来整体记 iz + 来源形式。", "Dolazim iz Beograda.", "我从贝尔格莱德来。"),
        ("companion", "和谁一起", "先记 sa prijateljem / sa kolegom，再理解名词词尾。", "Idem sa prijateljem.", "我和朋友一起去。"),
        ("modal", "想 / 能 / 必须 + 动作", "Hoću / Mogu / Moram + da + 已变位动词；不要直接塞字典原形。", "Mogu da platim karticom.", "我可以刷卡付款。"),
        ("need", "需要东西与需要做事", "Treba mi + 东西；Treba da + 动作。", "Treba mi pomoć.", "我需要帮助。"),
        ("connector", "用连接词说完整", "ali 表示但是，jer 表示因为；先把两句短句接起来。", "Ne mogu danas jer radim.", "我今天不行，因为我要工作。"),
        ("negation", "否定与高频第一人称", "ne + 动词通常分写；nemam、neću 等高频形式整体记。", "Ne razumem.", "我不明白。"),
    ],
    "en": [
        ("location", "Where + be：问地点", "问在哪里先用 Where is ...?；不要给 be 再加 do。", "Where is the station?", "车站在哪里？"),
        ("direction", "in / to / from", "in 表示在……里面；go to 表示去；come from 表示从……来。", "I'm going to the station.", "我要去车站。"),
        ("question", "When + do/does：问动作", "普通动词疑问句用助动词；does 后主词动词用原形。", "When does the train leave?", "火车什么时候出发？"),
        ("modal", "can 后接动词原形", "I can pay；不是 I can to pay。", "I can pay by card.", "我可以刷卡付款。"),
        ("polite", "礼貌请求", "Could you + 动词原形，适合向陌生人求助。", "Could you repeat that?", "可以再说一次吗？"),
    ],
    "es": [
        ("location", "estar + en：在哪里", "先用 estar 表示所在地点，介词用 en。", "Estoy en el hotel.", "我在酒店。"),
        ("direction", "a + el → al", "去阳性单数地点时，a 和 el 合为 al。", "Voy al centro.", "我去市中心。"),
        ("source", "de + el → del", "从阳性单数地点来时，de 和 el 合为 del。", "Vengo del hotel.", "我从酒店来。"),
        ("gender", "冠词与名词一起记", "la estación / el hotel：先记词组，不先背完整性别规则表。", "¿Dónde está la estación?", "车站在哪里？"),
        ("modal", "第一人称 + 动词原形", "quiero / puedo 后接原形；主语 yo 常可省略。", "Quiero comprar agua.", "我想买水。"),
    ],
    "fr": [
        ("article", "冠词和名词成块", "la gare / l'hôtel：元音前常省音，别把冠词丢掉。", "Je suis à la gare.", "我在车站。"),
        ("direction", "à + le → au", "到阳性单数地点可用 au；à la 与 à l' 不作同样合并。", "Je vais au marché.", "我去市场。"),
        ("source", "de + le → du", "来源介词和冠词一起记 du marché。", "Je viens du marché.", "我从市场来。"),
        ("polite", "Je voudrais：礼貌需求", "在服务场景先练 voudrais + 名词或动作。", "Je voudrais de l'eau.", "我想要一些水。"),
        ("negation", "ne ... pas：否定框架", "先掌握完整形式，再辨认口语省略 ne 的说法。", "Je ne comprends pas.", "我不明白。"),
    ],
    "de": [
        ("location", "Wo：所在地点", "在酒店整体记 im Hotel；此处 im = in dem。", "Ich bin im Hotel.", "我在酒店。"),
        ("direction", "Wohin：进入哪里", "进入酒店整体记 ins Hotel；此处 ins = in das。", "Ich gehe ins Hotel.", "我走进酒店。"),
        ("source", "Woher：从哪里来", "先记 aus dem Hotel 这个词块。", "Ich komme aus dem Hotel.", "我从酒店出来。"),
        ("verb_second", "主句变位动词第二位", "时间放第一位时，变位动词仍在第二个成分位置。", "Heute lerne ich Deutsch.", "我今天学德语。"),
        ("modal", "情态动词 + 句尾原形", "kann 变位，zahlen 放在句尾。", "Ich kann mit Karte zahlen.", "我可以刷卡付款。"),
    ],
    "ja": [
        ("location", "に：人在哪里", "名词后面的助词标记角色；人的存在用 います。", "ホテルにいます。", "我在酒店。"),
        ("action_place", "で：动作发生在哪里", "吃饭等动作的场所用 で，别和存在位置的 に 混用。", "店で食べます。", "我在店里吃饭。"),
        ("object", "を：动作的对象", "宾语 + を + 动词；动作通常放句尾。", "水を買います。", "我买水。"),
        ("direction", "へ：去哪里", "表示方向的助词 へ 在这里读 e。", "駅へ行きます。", "我去车站。"),
        ("polite", "です / ます 与问句 か", "先用礼貌体；在句尾加 か 提问。", "カードで払えますか？", "可以刷卡付款吗？"),
    ],
    "ko": [
        ("location", "에：所在地点", "存在位置用 에 있어요；先连同礼貌结尾一起学。", "호텔에 있어요.", "我在酒店。"),
        ("action_place", "에서：动作场所", "在某处进行动作常用 에서。", "식당에서 먹어요.", "我在餐厅吃饭。"),
        ("object", "을 / 를：动作对象", "有收音的名词后用 을，无收音后用 를。", "물을 사요.", "我买水。"),
        ("direction", "에：目的地", "地点 + 에 + 가요，动词放句尾。", "역에 가요.", "我去车站。"),
        ("polite", "-요：先统一礼貌体", "先用可以整句调用的请求表达，后学不同等级的变换。", "천천히 말씀해 주세요.", "请说慢一点。"),
    ],
}

# Supplements to the existing fixed courses' question words.
QUESTIONS = {
    "sr": ["ko", "šta", "gde", "kada", "zašto", "kako", "koji", "koliko", "čiji"],
    "en": ["who", "what", "where", "when", "why", "how", "which", "how much", "whose"],
    "es": ["quién", "qué", "dónde", "cuándo", "por qué", "cómo", "cuál", "cuánto", "de quién"],
    "fr": ["qui", "quoi", "où", "quand", "pourquoi", "comment", "lequel", "combien", "à qui"],
    "de": ["wer", "was", "wo", "wann", "warum", "wie", "welcher", "wie viel", "wessen"],
    "ja": ["誰", "何", "どこ", "いつ", "どうして", "どう", "どれ", "いくら", "誰の"],
    "ko": ["누구", "무엇", "어디", "언제", "왜", "어떻게", "어느 것", "얼마", "누구의"],
}
QUESTION_MEANINGS = ["谁", "什么", "哪里", "什么时候", "为什么", "怎么 / 如何", "哪个（从选项中选）", "多少 / 多少钱", "谁的 / 属于谁"]

# Fixed beginner vocabulary examples. Words are shown in their actual sentence form.
CORE_WORDS = {
    "sr": [("vodu", "水（此句用宾格）", "Kupujem vodu."), ("kartu", "票（此句用宾格）", "Kupujem kartu."), ("kafu", "咖啡（此句用宾格）", "Pijem kafu."), ("hleb", "面包", "Kupujem hleb."), ("pomoć", "帮助", "Treba mi pomoć."), ("stanica", "车站", "Gde je stanica?"), ("danas", "今天", "Radim danas."), ("sutra", "明天", "Dolazim sutra."), ("ovde", "这里", "Živim ovde."), ("tamo", "那里", "Idem tamo.")],
    "en": [("water", "水", "I need water."), ("ticket", "票", "I need a ticket."), ("coffee", "咖啡", "I'd like coffee."), ("bread", "面包", "I buy bread."), ("help", "帮助", "I need help."), ("station", "车站", "Where is the station?"), ("today", "今天", "I work today."), ("tomorrow", "明天", "I'll come tomorrow."), ("here", "这里", "I live here."), ("there", "那里", "I'm going there.")],
    "es": [("agua", "水", "Quiero agua."), ("billete", "票", "Necesito un billete."), ("café", "咖啡", "Quiero café."), ("pan", "面包", "Compro pan."), ("ayuda", "帮助", "Necesito ayuda."), ("estación", "车站", "¿Dónde está la estación?"), ("hoy", "今天", "Trabajo hoy."), ("mañana", "明天", "Vengo mañana."), ("aquí", "这里", "Vivo aquí."), ("allí", "那里", "Voy allí.")],
    "fr": [("eau", "水", "Je voudrais de l'eau."), ("billet", "票", "Je voudrais un billet."), ("café", "咖啡", "Je voudrais un café."), ("pain", "面包", "J'achète du pain."), ("aide", "帮助", "J'ai besoin d'aide."), ("gare", "车站", "Où est la gare ?"), ("aujourd'hui", "今天", "Je travaille aujourd'hui."), ("demain", "明天", "Je viens demain."), ("ici", "这里", "J'habite ici."), ("là-bas", "那里", "Je vais là-bas.")],
    "de": [("Wasser", "水", "Ich brauche Wasser."), ("Fahrkarte", "车票", "Ich brauche eine Fahrkarte."), ("Kaffee", "咖啡", "Ich möchte Kaffee."), ("Brot", "面包", "Ich kaufe Brot."), ("Hilfe", "帮助", "Ich brauche Hilfe."), ("Bahnhof", "火车站", "Wo ist der Bahnhof?"), ("heute", "今天", "Ich arbeite heute."), ("morgen", "明天", "Ich komme morgen."), ("hier", "这里", "Ich wohne hier."), ("dort", "那里", "Ich bin dort.")],
    "ja": [("水", "水", "水を買います。"), ("切符", "车票", "切符を買います。"), ("コーヒー", "咖啡", "コーヒーを飲みます。"), ("パン", "面包", "パンを買います。"), ("駅", "车站", "駅はどこですか？"), ("ホテル", "酒店", "ホテルにいます。"), ("今日", "今天", "今日は働きます。"), ("明日", "明天", "明日来ます。"), ("ここ", "这里", "ここに住んでいます。"), ("そこ", "那里", "そこに行きます。")],
    "ko": [("물", "水", "물을 사요."), ("표", "票", "표를 사요."), ("커피", "咖啡", "커피를 마셔요."), ("빵", "面包", "빵을 사요."), ("도움", "帮助", "도움이 필요해요."), ("역", "车站", "역이 어디예요?"), ("오늘", "今天", "오늘 일해요."), ("내일", "明天", "내일 와요."), ("여기", "这里", "여기에 살아요."), ("거기", "那里", "거기에 가요.")],
}
