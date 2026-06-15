# AinerSpeak AI Expression OS 完整产品设计方案

版本：v1.1 FULL  
定位：AI 思想沉淀 + 多语言表达训练 + 语法/句型/词汇消消乐 + 实时语音陪练 + 个人表达资产平台  
建议主域名：`ainerspeak.com`  
建议产品入口：`app.ainerspeak.com`  
建议后台入口：`admin.ainerspeak.com`  
建议 PC 工作台：`studio.ainerspeak.com` 或 `app.ainerspeak.com/studio`  
建议 H5/PWA：`app.ainerspeak.com`

---

## 0. 产品总定义

AinerSpeak 不是传统英语学习 App，也不是单纯的语法纠错工具，而是一个 **AI Expression OS / Personal Thinking OS**。

它的核心不是让用户被动学习教材，而是让用户先表达自己真正想说的话，再由 AI 在对话、反驳、追问、翻译、纠错、朗读、跟读、复习中，帮助用户逐步形成自己的：

- 思想资产
- 表达资产
- 多语言表达版本
- 个人语法短板库
- 高频句型库
- 高频词汇库
- 语音成长记录
- 价值观与人生规划档案
- 可复习、可朗读、可对话、可迭代的长期知识资产

一句话定位：

> Think in your language. Grow in another.  
> 用你的母语思考，在另一种语言中成长。

更商业化的一句话：

> 不要背英语，而是把你真正想说的话，打磨成可以自然表达的多语言能力。

---

## 1. 产品理念：Expression Driven Learning

### 1.1 传统成人语言学习的问题

成人用户学习英语或其他语言时，经常遇到这些问题：

1. 已经有基础，但长期难以提升。
2. 传统课程内容与自己的真实生活、观点、事业、情感、移民、创业需求无关。
3. 花大量时间学习已经掌握的基础语法和废话例句。
4. 语法书、词汇书、泛读材料耗费大量时间，却只能捞到一点点真正有用的表达。
5. 真正跟外国人聊天、面试、约会、谈客户、表达观点时，依然卡住。
6. 学习过程消磨表达欲和学习欲望。
7. 用户最想表达的观点，反而没有被系统整理、翻译、训练和复用。

传统产品逻辑是：

```text
平台决定今天学什么
→ 用户被动学习
→ 做题
→ 背单词
→ 希望未来能表达
```

AinerSpeak 的逻辑是：

```text
用户今天想表达什么
→ AI 陪用户讨论
→ AI 同步生成目标语言
→ AI 实时指出表达问题
→ AI 抽取高频语法/句型/词汇
→ 用户只复习自己真正需要的内容
→ 形成个人表达资产
```

这叫 **Expression Driven Learning（表达驱动学习）**。

---

## 2. 核心业务闭环

完整闭环如下：

```text
用户输入 / 语音 / 粘贴文本
        │
        ▼
AI 识别用户意图、母语、目标语言、场景
        │
        ▼
AI Socratic Dialogue（苏格拉底对话）
        │
 ┌──────┼────────┬────────┐
 │      │        │        │
观点收集  反驳论证  信息补充  表达纠错
 │      │        │        │
 └──────┼────────┴────────┘
        │
        ▼
AI 自动整理 Facts / Values / Arguments / Examples
        │
        ▼
AI 自动生成 Mind Graph / Thought Map
        │
        ▼
用户确认、修改、继续讨论
        │
        ▼
Thought Freeze（思想冻结）
        │
        ▼
Expression Assets（表达资产）
        │
 ┌────────┬────────┬────────┬────────┬────────┐
 │        │        │        │        │        │
中文完整版 基础目标语 口语版   书面版   高级版
 │        │        │        │        │        │
简述版    Vlog版   面试版   三分钟演讲版  商务版
        │
        ▼
Grammar / Pattern / Vocabulary Mining
        │
        ▼
Personal Learning Queue（个人学习队列）
        │
        ▼
Grammar 消消乐 / Pattern 消消乐 / Vocabulary 消消乐
        │
        ▼
已掌握内容归档，下次不再重复提醒
```

---

## 3. 用户基本信息与 AI 画像系统

### 3.1 为什么必须先了解用户

AinerSpeak 的 AI 不能像普通 ChatGPT 一样对所有人一样回答。它必须提前理解用户的：

- 母语
- 目标语言
- 当前水平
- 学习目的
- 个人兴趣
- 常用场景
- 职业背景
- 价值观方向
- 语法短板
- 表达风格偏好
- 是否喜欢被纠错
- 想要温和反馈还是严格反馈
- 是否更关注口语、写作、面试、社交、商务、移民等

这样 AI 才能知道：

- 哪些语法值得提醒。
- 哪些内容用户已经掌握，不要浪费时间。
- 例句应该围绕什么主题。
- 该用中文解释还是目标语言解释。
- 对话应该鼓励、挑战、反驳还是总结。
- 用户当前最需要提升什么。

### 3.2 新用户 Onboarding 流程

首次注册后，必须完成一个 3-5 分钟的用户画像建立流程。

#### Step 1：基础语言信息

字段：

- 母语：中文 / 西语 / 阿语 / 俄语 / 塞尔维亚语 / 其他
- 目标语言：英语 / 德语 / 西语 / 法语 / 塞尔维亚语 / 波兰语 / 中文 / 其他
- 当前水平：A1 / A2 / B1 / B2 / C1 / 不确定
- 学习重点：听 / 说 / 读 / 写 / 综合
- 是否需要双语显示：是 / 否

#### Step 2：学习目的

多选：

- 日常聊天
- 约会社交
- 移民生活
- 工作面试
- 商务谈判
- 外贸客户
- 旅行生活
- 留学考试
- 写作表达
- Vlog / Podcast / 自媒体
- 思想沉淀 / 人生规划
- 创业 / 商业计划

#### Step 3：兴趣与话题

用户选择自己长期想聊的话题：

- 人生规划
- 创业
- AI
- 欧洲生活
- 移民
- 工作
- 感情
- 家庭
- 投资
- 商业模式
- 智能家居
- 供应链
- 文化差异
- 社交表达
- 自我介绍

这些话题会成为后续 AI 例句、语法训练和表达资产的主题来源。

#### Step 4：纠错偏好

用户选择：

- 温和模式：不打断，只在对话后总结。
- 平衡模式：重要错误实时提醒，小错误结束后总结。
- 严格模式：语法、发音、表达不自然都会及时提示。

#### Step 5：AI 教练风格

可选：

- 鼓励型教练
- 严格型教练
- 苏格拉底追问型
- 反方律师型
- 商务导师型
- 朋友陪聊型
- 面试官型

#### Step 6：初始能力测试

用户用母语和目标语言各回答一个问题：

- 请用母语说说你为什么想学习这门语言。
- 请用目标语言尽量表达同样的意思。

AI 生成初始报告：

- Vocabulary Range
- Grammar Accuracy
- Fluency
- Naturalness
- Expression Depth
- Confidence
- 初始 CEFR 估计
- 首批高价值语法建议
- 首批高频表达建议

### 3.3 用户画像数据结构

核心表：`user_profiles`

建议字段：

- id
- user_id
- native_language
- target_languages JSON
- primary_target_language
- current_level
- learning_goals JSON
- favorite_topics JSON
- correction_style
- coach_style
- explanation_language
- ui_language
- voice_preference
- speaking_confidence_score
- writing_confidence_score
- grammar_level_score
- vocabulary_level_score
- fluency_score
- created_at
- updated_at

### 3.4 AI 长期记忆档案

核心表：`user_ai_memories`

记录：

- 用户经常讨论什么
- 用户已经确认的价值观
- 用户未来规划
- 用户创业方向
- 用户常犯语法错误
- 用户已掌握句型
- 用户不喜欢的反馈方式
- 用户偏好的表达风格
- 用户常用的中文表达习惯
- 用户目标语言中的弱点

AI 每次生成回复时，要从这些记忆中读取摘要。

---

## 4. 思想对话模式设计

### 4.1 思想对话不是普通聊天

普通聊天是：

```text
用户问
AI答
```

AinerSpeak 的思想对话是：

```text
用户表达想法
AI理解
AI追问
AI反驳
AI补充信息
AI帮助用户形成更完整观点
AI同步生成目标语言表达
AI记录语法和词汇问题
```

### 4.2 对话模式分类

每个对话可以选择一种模式。

#### 1. Free Talk 自由表达

适合用户随便聊。AI 主要陪伴、整理、轻纠错。

#### 2. Socratic Dialogue 苏格拉底追问

AI 不直接给答案，而是不断追问：

- 为什么？
- 你真正重视的是什么？
- 如果条件变化，你还会这样选吗？
- 这个观点背后的假设是什么？
- 有没有反例？

适合人生规划、价值观、职业选择。

#### 3. Devil's Advocate 反方律师

AI 故意站在反方挑战用户：

- 你的证据是什么？
- 这个计划失败怎么办？
- 有没有更低成本验证方式？
- 如果收入下降，你还愿意吗？
- 你是否低估了风险？

适合创业、投资、移民、重大决策。

#### 4. Information Collector 信息收集

AI 像访谈顾问一样收集信息：

- 背景
- 目标
- 约束
- 资源
- 风险
- 时间线
- 优先级

适合生成计划、商业方案、留学规划、职业规划。

#### 5. Debate Training 观点辩论

AI 和用户围绕一个话题进行多轮辩论，最后输出：

- 正方观点
- 反方观点
- 用户最终立场
- 支撑理由
- 反驳策略
- 多语言表达版本

#### 6. Real Conversation 模拟真实对话

AI 扮演：

- 外国朋友
- 面试官
- 客户
- 女生/男生聊天对象
- 签证官
- 生意伙伴
- 老师
- 同事
- 反驳者

用于实战语言训练。

---

## 5. 母语聊天与目标语言聊天双模式

### 5.1 母语聊天模式

用户用母语表达时，AI 主要做：

1. 理解用户思想。
2. 用母语继续追问和讨论。
3. 同步生成目标语言表达。
4. 给出基础版、自然口语版、高级表达版。
5. 在下方小字提示相关语法结构。
6. 自动记录本轮涉及的高价值句型和词汇。

示例：

用户：

> 我觉得很多人移民不是为了赚更多钱，而是想摆脱压抑环境，获得更稳定自由的生活。

AI 主回复：

> 你的核心意思是：移民对很多人来说不是单纯的经济选择，而是一种追求稳定、自由和尊严的生活选择。那我想追问你：如果收入下降 30%，你还会坚持这个选择吗？

目标语言同步：

> For many people, immigration is not merely a financial decision. It is a way to escape a suffocating environment and pursue a life with greater stability, freedom, and dignity.

小字语法提示：

```text
Pattern: not merely... but... / a way to do sth / pursue a life with...
```

### 5.2 目标语言聊天模式

用户用目标语言表达时，AI 要同时完成三件事：

1. 正常继续对话，不破坏交流感。
2. 指出刚刚表达中的语法、词汇、自然度问题。
3. 给出更好的表达，并记录到用户短板库。

示例：

用户：

> I think Europe have more freedom and people not so pressure.

AI 对话回复：

> I understand what you mean. You are saying that Europe feels freer and less socially pressured. That is a strong point. But do you think freedom is more important than income for you?

下方纠错：

```text
Your sentence:
I think Europe have more freedom and people not so pressure.

Better:
I think Europe offers more freedom, and people seem less pressured there.

Grammar:
- Europe 是单数，不能用 have，要用 offers / has。
- people are under pressure / people seem less pressured 更自然。

Added to Pattern Queue:
- Subject-verb agreement
- seem + adjective
- offer/provide greater freedom
```

### 5.3 混合语言模式

用户可以中英混合：

> I think 欧洲生活 maybe more stable, because people pressure less.

AI 处理：

- 不打断。
- 先理解。
- 再给完整自然表达。
- 记录中式英语结构。

---

## 6. 对话 UI 设计：H5 手机版

### 6.1 H5 首页

首页不是传统课程，而是表达入口。

```text
AinerSpeak

今天想表达什么？
[ 说说我的想法 ]
[ 练一次真实对话 ]
[ 继续完善思想稿 ]
[ 今日消消乐 ]

我的思想库
- 为什么我要去欧洲 v5
- 我的创业方向 v8
- 我对自由的理解 v3
- 我的AI观点 v2

今日成长
Grammar  72%
Vocabulary 64%
Expression 81%
Voice 58%
```

### 6.2 对话页布局

移动端对话页面建议分为四层：

#### 顶部：当前任务 HUD

显示：

- 当前话题
- 目标语言
- 当前训练重点
- 当前模式
- 语法提醒数量

示例：

```text
Topic: Europe Life
Mode: Socratic
Target: English
Today's Pattern: Rather than / offers / if I had...
```

#### 中间：AI 对话区

聊天气泡支持：

- 母语回复
- 目标语言同步
- 点击展开高级版
- 点击朗读
- 点击收藏成表达卡

#### 下方：语法小行字

每轮消息下面有轻量提示：

```text
Grammar: Europe offers... / people seem less pressured
Pattern +1
```

#### 底部：输入区

支持：

- 文字输入
- 按住说话
- 实时语音
- 发送后分析
- 切换语言
- 切换纠错强度

### 6.3 气泡内操作

每一句都可以：

- 播放整句
- 慢速播放
- 单词点击解释
- 指定片段朗读
- 查看语法结构
- 查看口语版
- 查看书面版
- 查看高级版
- 加入表达卡
- 加入消消乐
- 标记已掌握

---

## 7. Expression Assets 表达资产系统

### 7.1 什么是表达资产

表达资产不是简单聊天记录，而是用户真正想长期复用和打磨的内容。

例如：

- 我的自我介绍
- 为什么我要移民欧洲
- 我的创业计划
- 我对爱情的理解
- 我的职业规划
- 我如何介绍我的公司
- 我如何跟客户解释智能家居方案
- 我如何面试时说明自己的经历

### 7.2 Thought Freeze 思想冻结

当用户觉得某个观点已经完善，就点击：

```text
Freeze This Thought
```

AI 自动生成一个表达资产包。

### 7.3 Freeze 后生成内容

每个表达资产包含：

1. 中文完整版
2. 目标语言基础版
3. 自然口语版
4. 高级表达版
5. 书面版
6. Vlog 口吻版
7. 面试版
8. 商务版
9. 一句话简介
10. 30 秒版本
11. 1 分钟版本
12. 3 分钟演讲版
13. Podcast 版
14. 社交聊天版
15. 关键词列表
16. 必会句型
17. 必会词汇
18. 语法结构分析
19. 可替换表达
20. AI 朗读音频
21. 跟读记录
22. 历史版本
23. 对话来源
24. Mind Graph
25. 用户确认的 Facts / Values / Arguments

### 7.4 版本管理

表达资产需要版本管理：

```text
为什么我要去欧洲
v1 初始想法
v2 AI追问后补充稳定因素
v3 加入收入下降仍愿意接受
v4 加入家庭和长期规划
v5 冻结为正式版本
```

支持：

- 查看历史版本
- 对比 Diff
- 恢复旧版本
- 基于某版本继续对话
- 再次 Freeze

---

## 8. Grammar / Pattern / Vocabulary Mining

### 8.1 不是传统语法课

系统不应该给所有人同样的语法课程，而是根据用户真实表达自动挖掘：

- 用户真正高频需要的语法
- 用户经常出错的结构
- 用户表达观点时缺少的高级句型
- 用户话题相关的核心词汇
- 用户已经掌握、不需要反复提醒的内容

### 8.2 AI 挖掘内容

每轮对话后，AI 后台生成结构化分析：

```json
{
  "detected_patterns": [
    {
      "pattern": "not just... but...",
      "category": "contrast/emphasis",
      "importance": 5,
      "frequency_signal": 4,
      "user_mastery": 0.62,
      "should_add_to_queue": true
    }
  ],
  "grammar_errors": [
    {
      "type": "subject_verb_agreement",
      "original": "Europe have",
      "corrected": "Europe offers",
      "severity": 4,
      "repeat_risk": 5
    }
  ],
  "vocabulary_items": [
    {
      "word": "suffocating",
      "meaning": "压抑到让人窒息的",
      "topic": "life/migration",
      "priority": 5
    }
  ]
}
```

### 8.3 Value Score 机制

不是所有错误都加入消消乐。AI 根据以下评分决定：

- Importance：是否重要
- Frequency：是否高频出现
- Relevance：是否和用户主题相关
- Error Severity：是否影响理解
- Learning Value：是否值得学
- User Level Fit：是否符合当前水平

只有高价值内容进入学习队列。

### 8.4 个人语法画像

系统为每个用户维护：

- 已掌握语法
- 待掌握语法
- 高频错误
- 低频错误
- 高价值句型
- 口语短板
- 书面表达短板
- 母语迁移错误

---

## 9. 消消乐系统设计

### 9.1 核心理念

消消乐不是游戏皮肤，而是学习机制。

用户每掌握一个高频语法、句型、词汇，这个项目就从提醒列表消失。

这给用户明确反馈：

> 我的短板正在一点点被消灭。

### 9.2 三类消消乐

#### Grammar 消消乐

例如：

- Subject-verb agreement
- Present Perfect
- Passive Voice
- Relative Clause
- Conditional
- Preposition usage
- Article usage

#### Pattern 消消乐

例如：

- not just... but...
- rather than doing...
- a way to do sth
- allow sb to do sth
- the reason why... is that...
- if I had to choose...
- from my perspective...

#### Vocabulary 消消乐

例如：

- stability
- freedom
- dignity
- pressure
- suffocating
- opportunity
- long-term
- trade-off
- compromise

### 9.3 掌握度计算

每个项目有 Mastery Score：0-100。

影响因素：

- 用户是否能识别
- 用户是否能填空
- 用户是否能翻译
- 用户是否能在真实表达中使用
- 用户是否连续多次正确
- 用户是否长期未忘记

掌握后：

- 从首页提醒消失
- 标记为 archived/mastered
- 进入长期低频复习
- 下次对话不再反复提醒

### 9.4 消消乐玩法

用户看到：

```text
今日待消除

1. Europe offers / provides...
Mastery 68%

2. Rather than doing...
Mastery 42%

3. People are under pressure
Mastery 55%
```

练习方式：

- 中文转目标语言
- 改错
- 跟读
- 选择更自然表达
- 用自己的话造句
- 在 AI 对话中真实使用

真实使用权重最高。

---

## 10. 实时语音对话设计

### 10.1 语音模式分类

#### Push-to-Talk 模式

用户按住说话，松开发送。

适合 MVP，成本低，稳定。

#### Streaming Voice 模式

实时流式识别，AI 可快速回应。

适合 Pro 用户。

#### Realtime Voice-to-Voice 模式

接入 OpenAI Realtime / Gemini Live / ElevenLabs Conversational AI 等。

支持：

- 低延迟
- 可打断
- 插话
- 实时纠错
- AI 语气变化
- 语音陪练

### 10.2 语音 Provider 可插拔设计

后端定义统一接口：

```text
VoiceProvider
- transcribe(audio)
- synthesize(text, voice, speed)
- realtimeSession(config)
- evaluatePronunciation(audio, referenceText)
```

可接入：

- OpenAI Realtime
- OpenAI Whisper / GPT / TTS
- Google Gemini Live
- Azure Speech
- ElevenLabs
- Deepgram
- Cartesia
- 本地开源 ASR/TTS

后台可以配置默认 Provider。

### 10.3 语音学习功能

每个句子支持：

- 整句朗读
- 慢速朗读
- 单词朗读
- 指定片段朗读
- 跟读
- 复述
- 发音评分
- 流利度评分
- 停顿分析
- filler words 分析，如 um / like / actually

### 10.4 语音对话后报告

每次语音结束生成：

- Fluency Score
- Grammar Score
- Vocabulary Score
- Naturalness Score
- Confidence Score
- Top 3 corrections
- Added Patterns
- Added Vocabulary
- Recommended practice

---

## 11. 多语言学习设计

### 11.1 系统必须支持多目标语言

虽然第一阶段可以主打中文用户学英语，但架构必须支持：

- 中文 → 英语
- 中文 → 塞尔维亚语
- 中文 → 德语
- 中文 → 波兰语
- 中文 → 西语
- 英语 → 中文
- 阿语 → 英语
- 俄语 → 英语
- 任意母语 → 任意目标语言

### 11.2 多语言字段设计

不要把 English 写死。

字段使用：

- native_language
- target_language
- source_text
- target_text
- explanation_language
- language_pair

### 11.3 多语言 Prompt 设计

AI 任务必须包含：

- 用户母语
- 目标语言
- 用户水平
- 解释语言
- 当前话题
- 输出版本要求

示例：

```text
User native language: Chinese
Target language: English
User level: B1
Explanation language: Chinese
Task: improve user's expression, explain grammar in Chinese, provide natural English and advanced English.
```

### 11.4 不同语言的语法 Pattern 独立维护

英语 Pattern、德语 Pattern、塞尔维亚语 Pattern 不能混在一起。

表结构中所有 pattern 必须带：

- language_code
- language_pair
- pattern_type

---

## 12. H5 前端功能清单

### 12.1 注册登录

支持：

- 邮箱注册
- 手机号可后续扩展
- Google 登录可后续扩展
- 密码找回
- 用户资料设置

### 12.2 会员开通

不集成支付。

页面展示：

- Free
- VIP
- Pro
- Premium

开通方式：

- Telegram 联系
- 微信二维码
- WhatsApp
- Email

管理员后台手动开通会员。

### 12.3 H5 主模块

1. Home 首页
2. Chat 思想对话
3. Voice 实时语音
4. Assets 表达资产
5. Grammar 消消乐
6. Vocabulary 消消乐
7. Mind Graph 思想图谱
8. Profile 用户画像
9. Membership 会员
10. Settings 设置

---

## 13. PC Web 工作台设计

PC 端适合深度工作。

### 13.1 PC 首页

显示：

- 思想库
- 表达资产
- 最近对话
- 今日语法短板
- 最近 Freeze 文档
- 学习数据

### 13.2 深度编辑器

左右结构：

```text
左侧：思想稿 / 表达稿编辑区
右侧：AI 对话 / 语法分析 / 版本建议
```

支持：

- 长文编辑
- AI 改写
- 版本切换
- 段落级翻译
- 句子级语法分析
- 一键生成口语版/书面版/演讲版
- 一键朗读
- 一键加入复习

### 13.3 Mind Graph 页面

展示用户长期思想结构：

```text
人生规划
├── 欧洲
├── 自由
├── 稳定
├── 创业
└── 家庭

商业方向
├── AI
├── 智能家居
├── 供应链
├── 采购系统
└── 欧洲市场
```

---

## 14. Admin PC 后台设计

### 14.1 用户管理

功能：

- 用户列表
- 搜索用户
- 查看用户资料
- 修改会员等级
- 禁用用户
- 重置密码
- 查看使用量
- 查看注册时间
- 查看最近登录

### 14.2 会员权限管理

配置不同套餐：

#### Free

- 每日文本对话次数限制
- 每日改写次数限制
- 无实时语音
- 少量表达资产

#### VIP

- 更多对话次数
- 保存更多表达资产
- 基础语音朗读
- 消消乐完整功能

#### Pro

- 实时语音
- 高级表达版本
- Thought Freeze
- Mind Graph
- PC 工作台

#### Premium

- 更高语音额度
- 多 Provider 优先线路
- 高级报告
- 长期记忆
- 多语言切换

### 14.3 Provider 管理

后台可以管理：

- LLM Provider
- Voice Provider
- ASR Provider
- TTS Provider
- Embedding Provider

字段：

- provider_name
- type
- api_base_url
- api_key encrypted
- model_name
- enabled
- priority
- cost_weight
- fallback_provider

### 14.4 Prompt 管理

后台维护 Prompt 模板：

- 对话 Prompt
- 纠错 Prompt
- 语法分析 Prompt
- Thought Freeze Prompt
- 表达资产生成 Prompt
- 消消乐生成 Prompt
- 用户画像分析 Prompt

支持版本管理。

### 14.5 内容审核与日志

管理：

- 用户对话日志
- AI 调用日志
- 错误日志
- Token 使用
- 语音使用时长
- 敏感内容标记
- 用户反馈

---

## 15. 后端架构设计

### 15.1 最小可落地生产架构

目标承载：100-1000 用户。

推荐：

```text
Nginx / Caddy
        │
        ▼
Backend API: FastAPI / NestJS
        │
 ┌──────┼─────────┐
 │      │         │
PostgreSQL Redis   Object Storage
 │      │         │
 pgvector Queue    Audio Files
```

可选：

- FastAPI：适合 AI 项目，Python 生态强。
- NestJS：适合企业后台和权限系统。

如果你想最快落地，推荐：

```text
FastAPI + PostgreSQL + Redis + MinIO/S3 + React/Next.js
```

### 15.2 为什么不用太重架构

100-1000 用户阶段不需要：

- Kubernetes
- 微服务
- 大数据平台
- Kafka
- Elasticsearch
- 多区域部署

除非后续用户量上来。

### 15.3 推荐部署

单机或小云服务器：

- 4C8G 起步
- 8C16G 更舒服
- PostgreSQL 本机或托管
- Redis 本机
- 对象存储可用 Cloudflare R2 / S3 / MinIO
- Docker Compose 部署

---

## 16. 数据库核心表设计

### 16.1 用户与权限

- users
- user_profiles
- memberships
- user_usage_quotas
- roles
- permissions
- user_roles

### 16.2 对话

- conversations
- conversation_messages
- message_analysis
- correction_records

### 16.3 思想资产

- thoughts
- thought_versions
- thought_facts
- thought_values
- thought_arguments
- thought_graph_nodes
- thought_graph_edges

### 16.4 表达资产

- expression_assets
- expression_asset_versions
- expression_variants
- expression_audio
- expression_sentence_units

### 16.5 语法与消消乐

- grammar_patterns
- user_grammar_mastery
- user_pattern_mastery
- user_vocabulary_mastery
- review_queue
- review_attempts

### 16.6 AI Provider

- ai_providers
- provider_models
- prompt_templates
- ai_call_logs

### 16.7 语音

- voice_sessions
- voice_segments
- pronunciation_scores
- tts_audio_files

---

## 17. API 模块设计

### 17.1 Auth API

- POST /auth/register
- POST /auth/login
- POST /auth/logout
- POST /auth/refresh
- POST /auth/forgot-password

### 17.2 Profile API

- GET /profile
- PUT /profile
- POST /profile/onboarding
- GET /profile/language-settings

### 17.3 Conversation API

- POST /conversations
- GET /conversations
- GET /conversations/:id
- POST /conversations/:id/messages
- POST /conversations/:id/analyze
- POST /conversations/:id/freeze

### 17.4 Expression API

- GET /assets
- POST /assets
- GET /assets/:id
- PUT /assets/:id
- POST /assets/:id/generate-variants
- POST /assets/:id/tts
- POST /assets/:id/practice

### 17.5 Grammar API

- GET /grammar/queue
- POST /grammar/:id/mark-mastered
- POST /grammar/:id/practice
- GET /grammar/mastery

### 17.6 Voice API

- POST /voice/transcribe
- POST /voice/tts
- POST /voice/evaluate
- POST /voice/realtime/session

### 17.7 Admin API

- GET /admin/users
- PUT /admin/users/:id/membership
- GET /admin/providers
- PUT /admin/providers/:id
- GET /admin/prompts
- PUT /admin/prompts/:id
- GET /admin/logs

---

## 18. LLM 可插拔设计

### 18.1 统一 LLM 接口

```text
LLMProvider
- chat(messages, config)
- stream(messages, config)
- analyze(text, schema)
- embed(text)
```

### 18.2 支持 Provider

- OpenAI
- Anthropic Claude
- Google Gemini
- DeepSeek
- Qwen
- Groq
- OpenRouter
- Local Ollama

### 18.3 Fallback 机制

如果主模型失败：

```text
OpenAI → Gemini → DeepSeek → Local/Ollama
```

### 18.4 不同任务用不同模型

- 实时对话：低延迟模型
- 语法分析：便宜模型
- Thought Freeze：强模型
- Embedding：低成本 embedding 模型
- 消消乐生成：便宜模型

---

## 19. 权限与额度设计

### 19.1 功能权限

按会员等级控制：

- 每日对话次数
- 每日 AI 改写次数
- 每日语音分钟数
- 表达资产数量
- Thought Freeze 次数
- 高级版本生成
- 多语言数量
- PC 工作台
- 实时语音
- 长期记忆

### 19.2 后台手动开通

管理员设置：

- membership_level
- start_date
- end_date
- quota_override
- enabled_features

### 19.3 联系开通会员页面

展示：

```text
开通 VIP / Pro 请联系：
Telegram: @xxx
WeChat: xxx
WhatsApp: xxx
Email: xxx
```

---

## 20. MVP 开发阶段

### Phase 1：可用 MVP

必须实现：

1. 用户注册登录
2. Onboarding 用户画像
3. 文本思想对话
4. 母语输入 → 目标语言表达
5. 目标语言输入 → 纠错 + 对话继续
6. 基础版 / 口语版 / 高级版 / 书面版
7. 表达资产保存
8. 基础 Grammar Queue
9. 后台用户和会员管理
10. Provider 配置

### Phase 2：语音和消消乐

实现：

1. TTS 朗读
2. ASR 语音识别
3. Push-to-talk
4. Grammar 消消乐
5. Vocabulary 消消乐
6. Pattern Mastery
7. 语音报告

### Phase 3：Realtime 和 PC 工作台

实现：

1. Realtime Voice
2. PC Studio
3. Thought Freeze 完整版
4. Mind Graph
5. 版本管理
6. 高级报告

---

## 21. 产品差异化总结

AinerSpeak 的核心差异：

1. 用户先表达，系统再学习。
2. 所有学习内容来自用户真实想法。
3. AI 在思想对话中自然纠正语言。
4. 母语和目标语言双轨同步。
5. 目标语言聊天时，AI 一边正常博弈，一边纠错。
6. 语法不是课程，而是从用户表达中挖掘出来的短板。
7. 高频语法、句型、词汇进入消消乐。
8. 用户掌握后自动消失，不再浪费时间。
9. 用户重要观点沉淀成思想库和表达资产。
10. 多语言可扩展，不只限英语。
11. 后台可配置 LLM、语音、会员、Prompt。
12. 可低成本部署，适合 100-1000 用户启动。

---

## 22. 建议产品命名体系

品牌：AinerSpeak

产品主入口：AinerSpeak App

模块名：

- Mind Forge：思想锻造
- Expression Forge：表达锻造
- Pattern Forge：句型锻造
- Grammar Crush：语法消消乐
- Voice Forge：语音锻造
- Thought Freeze：思想冻结
- Expression Assets：表达资产
- AI Debate Partner：AI 思辨伙伴

Slogan：

> Don’t memorize English. Forge your own expression.

中文：

> 不要背英语，锻造属于你自己的表达系统。

---

## 23. 最终结论

AinerSpeak 最终不是一个普通英语学习工具，而是一个围绕用户真实思想构建的个人表达系统。

它解决的核心问题不是“用户不会语法”，而是：

> 用户有大量真正想表达的观点、经历、感受和规划，但缺少一个系统帮助他把这些内容变成自然、准确、高级、可复习、可朗读、可对话、可长期迭代的多语言表达资产。

这个产品的长期价值在于：

- 用户越使用，AI 越懂用户。
- 用户越表达，系统越知道用户真正需要学什么。
- 用户越练习，短板越少。
- 用户越沉淀，思想资产越多。
- 用户迁移成本越来越高。

最终形成真正的个人语言与思想护城河。

