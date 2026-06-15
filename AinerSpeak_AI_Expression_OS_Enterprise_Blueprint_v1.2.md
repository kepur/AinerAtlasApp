# AinerSpeak AI Expression OS 企业级产品设计方案 v1.2

版本：v1.2 Enterprise Blueprint  
更新时间：2026-06-13  
定位：AI 思想沉淀 + 多语言表达训练 + 实时语音陪练 + 语法消消乐 + 跨语言思想社区 + 高质量同频匹配  
建议主域名：`ainerspeak.com`  
建议 H5/PWA 入口：`app.ainerspeak.com`  
建议 PC 工作台：`studio.ainerspeak.com` 或 `app.ainerspeak.com/studio`  
建议后台入口：`admin.ainerspeak.com`  
建议 API 入口：`api.ainerspeak.com`  
建议实时语音入口：`realtime.ainerspeak.com` 或统一走 `api.ainerspeak.com/ws`

---

## 0. 一句话总宗旨

AinerSpeak 不是传统英语学习 App，也不是普通 AI 聊天工具，而是一个 **AI Expression OS / Personal Thinking OS / Cross-language Thought Community**。

它的核心使命：

> 让用户用母语自由思考，用目标语言自然表达，并在长期对话、反驳、纠错、朗读、复习、社交和共创中，把自己的思想变成可沉淀、可练习、可迭代、可连接他人的长期资产。

更直接的产品标语：

> **Think in your language. Grow in another.**  
> 用你的母语思考，在另一种语言中成长。

中文商业表达：

> 不要背英语，而是把你真正想说的话，打磨成可以自然表达的多语言能力。

---

## 1. 产品根本判断

### 1.1 成人语言学习的真实痛点

传统英语学习路线是：

```text
教材决定内容
↓
用户被动学习
↓
反复做题
↓
大量时间花在已经掌握或不关心的知识上
↓
表达欲下降
↓
坚持失败
```

成人真正的学习路径应该是：

```text
我有一个真实想法
↓
我想表达
↓
我表达不清楚
↓
AI 帮我转成目标语言
↓
AI 指出语法、句型、词汇问题
↓
我在真实语境中反复使用
↓
这些高频短板进入消消乐
↓
逐步消灭
↓
表达能力自然成长
```

所以 AinerSpeak 的核心不是 “learning before expression”，而是：

> **Expression Driven Learning：表达驱动学习。**

---

## 2. 产品总架构：从个人到社区的闭环

### 2.1 个人闭环

```text
用户输入 / 语音表达
        ↓
AI 苏格拉底对话
        ↓
观点收集 / 反驳论证 / 信息补充
        ↓
AI 自动整理 Facts
        ↓
AI 自动生成 Mind Graph
        ↓
用户确认 Freeze
        ↓
Expression Assets 表达资产
        ↓
中文完整版 / 目标语言基础版 / 口语版 / 书面版 / 高级版 / Vlog版 / 面试版 / 三分钟演讲版
        ↓
朗读 / 跟读 / 对话陪练 / 语法消消乐
```

### 2.2 社区闭环

```text
个人 Thought Freeze
        ↓
转换成公开话题 / 半公开话题
        ↓
AI 推荐给同兴趣用户
        ↓
2-5 人圆桌 / 辩论 / 共创 / 语言练习
        ↓
AI 主持 + 翻译 + 纠错 + 总结
        ↓
小组篇章总结
        ↓
用户收藏别人的观点
        ↓
合并进入自己的 Thought Freeze 新版本
        ↓
产生更多表达资产和语言资产
```

### 2.3 匹配闭环

```text
长期对话数据
        ↓
用户画像 / 语言画像 / 思想画像 / 价值观画像 / 沟通画像
        ↓
同趣匹配 / Buddy / Soulmate / Co-founder / Debate PK / Group Circle
        ↓
跨语言对话与共创
        ↓
AI 继续分析表达、人格、目标、语法短板
        ↓
匹配更准，用户粘性更强
```

---

## 3. 产品模块总览

AinerSpeak 建议拆为 8 个核心模块。

| 模块 | 英文名 | 作用 |
|---|---|---|
| 思想对话 | Mind Dialogue | 用户用母语或目标语言与 AI 深度讨论 |
| 思想冻结 | Thought Freeze | 把成熟观点沉淀为可迭代资产 |
| 表达资产 | Expression Assets | 生成多语言、多风格、多场景表达版本 |
| 语法消消乐 | Pattern Crush | 高频语法、句型、词汇的游戏化掌握 |
| 实时语音 | Voice Coach | 低延迟语音对话、朗读、跟读、口语纠正 |
| 思想社区 | Thought Circles | 多人跨语言讨论、辩论、共创 |
| 同频匹配 | AinerSpeak Connect | 同趣、基友、Soulmate、创业伙伴、PK匹配 |
| 管理后台 | Admin Console | 用户、权限、AI Provider、内容、安全、社区管理 |

---

## 4. 用户画像与注册设计

### 4.1 为什么必须提前了解用户

AI 如果不了解用户，就只能给通用答案。AinerSpeak 必须在注册和使用过程中持续建立用户画像，才能知道：

- 用户的母语是什么
- 用户想学哪种目标语言
- 用户当前语言水平
- 用户真实关心的话题
- 用户是想练口语、写作、面试、社交还是商业表达
- 用户讨厌什么学习方式
- 用户有哪些长期目标
- 用户适合温和陪练还是反驳式训练
- 用户是否愿意加入同频匹配和小组讨论
- 用户是否允许系统基于思想资产做匹配推荐

### 4.2 注册必填项

MVP 注册建议必填：

- 邮箱 / 手机 / 第三方登录
- 昵称
- 密码
- 生日
- 母语
- 目标语言
- 当前目标语言水平：A1/A2/B1/B2/C1/C2/不确定
- 主要学习目标：
  - 日常聊天
  - 口语流畅
  - 写作表达
  - 留学/面试
  - 商务沟通
  - 跨国交友
  - 创业/工作表达
- 感兴趣话题：
  - 人生规划
  - AI
  - 创业
  - 情感
  - 移民
  - 欧洲生活
  - 职场
  - 商业
  - 文化
  - 旅行
  - 其他

### 4.3 可选项

- 性别
- 所在国家/城市
- 想认识的人：
  - 语言伙伴
  - 同兴趣朋友
  - 成长伙伴
  - 创业伙伴
  - Soulmate
  - 暂不社交
- 是否愿意公开部分思想资产
- 是否愿意加入跨语言小组
- MBTI 测试
- Big Five 简版测试
- 星座/生日趣味标签
- 八字娱乐标签

注意：

- MBTI、星座、八字只能作为趣味标签，不能作为严肃匹配的核心依据。
- 不建议直接展示“智商分数”。可以设计为：
  - Reasoning Depth 推理深度
  - Knowledge Breadth 见识广度
  - Reflection Ability 反思能力
  - Emotional Maturity 情绪成熟度
  - Communication Quality 沟通质量
- 这些指标应来自用户授权后的长期行为分析，不应作为公开羞辱或排序工具。

### 4.4 画像分层

| 画像 | 数据来源 | 用途 |
|---|---|---|
| Basic Profile | 注册资料 | 基础推荐、语言设置 |
| Language Profile | 用户表达、纠错记录 | 语法消消乐、表达训练 |
| Thought Profile | 思想对话、Freeze | 个性化对话、思想资产 |
| Value Profile | 长期观点分析、问卷 | Soulmate/伙伴匹配 |
| Communication Profile | 对话行为 | 推荐适合的聊天对象 |
| Social Match Profile | 用户主动授权 | 同频匹配、群组推荐 |
| Safety Profile | 举报、风控、违规记录 | 社区安全 |

---

## 5. 思想对话模块：Mind Dialogue

### 5.1 输入模式

用户可以用：

- 母语输入
- 目标语言输入
- 母语 + 目标语言混合输入
- 文本输入
- 语音输入
- 粘贴文章
- 上传长文草稿
- 从历史 Thought Freeze 继续对话

### 5.2 AI 对话模式

AI 不只是回答，而是充当 6 个角色：

1. Socratic Coach：苏格拉底提问者
2. Debate Opponent：反方挑战者
3. Language Teacher：语言老师
4. Expression Editor：表达编辑
5. Knowledge Curator：知识整理员
6. Voice Coach：口语陪练

### 5.3 母语聊天时的体验

如果用户用母语聊天，AI 应该：

- 先理解用户真实意思
- 用母语继续追问
- 同步给出目标语言表达
- 下方小字显示语法/句型/词汇提示
- 用户可点击查看基础版、口语版、高级版、书面版

示例：

```text
用户：
我觉得很多人移民不是为了赚钱，而是为了逃离一种压抑环境。

AI 回复：
你这个观点很清楚。你想表达的是：移民不只是经济选择，更是一种对自由和稳定生活的追求。

英文自然版：
Many people don’t immigrate just to make more money. They want to escape a suffocating environment and pursue a freer, more stable life.

高级表达：
For many people, immigration is not merely a financial decision, but a pursuit of greater freedom, stability, and personal dignity.

语法提示：
not just...but... = 不只是……而是……
pursue a freer life = 追求更自由的生活
```

### 5.4 目标语言聊天时的体验

如果用户用目标语言聊天，AI 应该：

- 正常继续思想对话
- 不要强行打断用户思路
- 在气泡下方给出小字纠错
- 记录错误到 Language Profile
- 判断是否进入 Pattern Crush

示例：

```text
用户：
I think Europe have more freedom.

AI 正常回复：
That’s an interesting point. Do you mean personal freedom, social freedom, or more freedom in lifestyle?

下方语法小字：
更自然：I think Europe offers more freedom.
问题：Europe 是单数概念，不能用 have。这里 offers/provides 更自然。
已记录：Subject-Verb Agreement +1
```

### 5.5 AI HUD 实时提示

H5 顶部或 PC 侧边栏显示当前对话提示：

```text
当前话题：欧洲生活
当前训练：表达观点 + 对比原因
今日高频句型：
- not just...but...
- rather than...
- It depends on whether...
语言目标：英文口语自然度
```

---

## 6. Thought Freeze：思想冻结

### 6.1 Freeze 的意义

聊天是流动的，思想需要沉淀。用户觉得“这就是我真正想表达的”时，点击 Freeze。

Freeze 后生成：

- 中文完整版
- 目标语言直译版
- 目标语言基础版
- 目标语言自然口语版
- 高级表达版
- 书面版
- Vlog 版
- 面试版
- 三分钟演讲版
- 一句话总结
- 金句版
- Debate version 正反观点版
- FAQ 问答版
- 词汇表
- 句型表
- 语法结构表
- 可朗读版本
- 可跟读版本
- 可转公开话题版本

### 6.2 版本管理

每个 Thought Asset 需要版本：

```text
为什么我要去欧洲发展
v1 - 原始想法
v2 - AI 追问后修正
v3 - 加入反方观点
v4 - 小组讨论后融合别人观点
v5 - 最终冻结版
```

用户可以查看 Diff：

- 新增了什么
- 删除了什么
- 哪些观点变强
- 哪些表达变自然
- 哪些句型被升级

### 6.3 从 Freeze 转成小组话题

每个 Freeze 可点击：

```text
转换为公开话题
转换为半公开话题
转换为私密邀请讨论
转换为 Debate PK
转换为 Co-create 共创
```

AI 自动生成：

- 话题标题
- 讨论背景
- 正方观点
- 反方观点
- 关键问题
- 标签
- 语言范围
- 适合人群
- 目标语言版本

---

## 7. Expression Assets：表达资产

每个表达资产包含：

### 7.1 多语言版本

支持多目标语言：

- 英语
- 日语
- 韩语
- 西语
- 德语
- 法语
- 塞尔维亚语
- 波兰语
- 其他语言由 LLM Provider 支持

每个目标语言至少生成：

- Literal Version 直译版
- Basic Version 基础版
- Natural Spoken Version 口语版
- Advanced Version 高级版
- Written Version 书面版
- Social Chat Version 社交版
- Interview Version 面试版
- Vlog Version
- 1-Min Speech
- 3-Min Speech
- Debate Version
- Business Version

### 7.2 点击交互

用户可以：

- 点击任意单词解释
- 点击任意句子朗读
- 选择一段朗读
- 全文朗读
- 慢速朗读
- 跟读评分
- 收藏句型
- 加入消消乐
- 生成类似句
- 生成反方表达
- 生成更口语版本
- 生成更高级版本

### 7.3 表达资产与语言学习联动

系统自动提取：

- 高频语法结构
- 高频句型
- 高频词汇
- 错误类型
- 用户已掌握结构
- 需要复习结构
- 可升级表达

进入 Pattern Crush。

---

## 8. Pattern Crush：语法/句型/词汇消消乐

### 8.1 核心理念

用户不需要从语法书里学全部内容。系统只追踪：

> 用户真实表达中高频、重要、且未掌握的语法、句型和词汇。

### 8.2 数据来源

- 用户母语输入后的 AI 英译
- 用户目标语言原句
- AI 纠错记录
- Thought Freeze
- 小组讨论发言
- 语音转写文本
- 跟读错误
- 用户收藏句型

### 8.3 消消乐机制

每个 Pattern 有状态：

```text
New → Learning → Practicing → Almost Mastered → Mastered → Archived
```

当用户点击“已熟练”或通过多次正确使用，系统将其从首页提醒移除。

示例：

```text
Pattern: not just...but...
出现次数：18
正确使用：12
错误使用：2
掌握度：82%
状态：Practicing
```

当达到规则：

- 正确使用 5 次
- 最近 14 天无错误
- 用户确认已掌握

则：

```text
自动移出今日提醒
进入已掌握数据库
下次不再高频提醒
```

### 8.4 Pattern 不是单词表

系统追踪的是表达模式：

| Pattern | 示例 |
|---|---|
| Opinion Expression | I believe that... |
| Reason Explanation | The reason is that... |
| Contrast | Although..., ... |
| Comparison | Compared with..., ... |
| Hypothesis | If I had..., I would... |
| Concession | Even though..., ... |
| Cause & Effect | This leads to... |
| Business Proposal | What I suggest is... |
| Emotional Expression | I feel overwhelmed because... |

### 8.5 游戏化 UI

首页显示：

```text
今日待消灭

Rather than doing...
██████░░░░ 64%

allow someone to do something
████████░░ 82%

It depends on whether...
███░░░░░░░ 37%
```

每消灭一个 Pattern：

- +经验值
- +表达力分
- 更新语言等级
- 进入成长记录
- 不再重复骚扰用户

---

## 9. Voice Coach：实时语音与可插拔 Provider

### 9.1 语音能力

需要支持：

- 语音输入
- 实时语音对话
- 语音打断
- 朗读表达资产
- 指定句子朗读
- 指定单词朗读
- 慢速朗读
- 跟读评分
- 语音转写
- 语音错误分析
- 语音房间讨论
- 多语言字幕

### 9.2 Provider 可插拔架构

不要绑定某一个厂商，要做 Provider Adapter。

```text
VoiceService
├── OpenAI Realtime Adapter
├── OpenAI STT/TTS Adapter
├── Google Gemini Live Adapter
├── Azure Speech Adapter
├── ElevenLabs Adapter
├── Deepgram STT Adapter
├── Local Whisper Adapter
└── Mock Adapter
```

每个 Provider 统一暴露：

```text
startRealtimeSession()
transcribeAudio()
synthesizeSpeech()
scorePronunciation()
streamTranslate()
closeSession()
```

后台可以配置：

- 默认 Provider
- 备用 Provider
- 免费用户 Provider
- VIP 用户 Provider
- 语音价格上限
- 单日额度
- 失败自动切换
- 延迟监控
- 成本统计

### 9.3 语音模式分级

免费用户：

- 按句录音
- 2-5 秒返回
- 基础 TTS

VIP：

- 实时语音对话
- 低延迟
- 句子级纠错
- 朗读/跟读

Pro：

- 实时多语言对话
- AI 主持小组语音房
- 深度发音分析
- 高级声音 Provider

---

## 10. Thought Circles：跨语言思想社区

### 10.1 总定位

Thought Circles 不是普通群聊，而是：

> 多人围绕真实观点进行跨语言讨论、辩论、共创，并由 AI 实时翻译、纠错、主持、总结和沉淀。

### 10.2 话题来源

#### 1. 用户主动发起

用户输入：

```text
我想讨论：年轻人应该优先追求自由还是稳定？
```

设置：

- 分类
- 标签
- 讨论模式
- 语言范围
- 人数
- 是否公开
- 是否允许总结
- 是否允许他人收藏观点

#### 2. 从 Thought Freeze 转换

用户点击：

```text
把我的 v3 版本转换成公开话题
```

AI 自动生成公开话题。

#### 3. AI 每日推荐

AI 根据用户兴趣推荐：

- 今日热门
- 与你相关
- 正在辩论
- 等待加入
- 同语言圈
- 目标语言圈

#### 4. 系统自动发现

如果很多用户都在聊类似主题，AI 生成新的公共话题。

### 10.3 房间类型

| 房间 | 用途 |
|---|---|
| Roundtable 圆桌 | 温和讨论 |
| Debate PK 辩论 | 正反观点博弈 |
| Co-create 共创 | 一起生成文章/方案 |
| Language Circle | 语言练习 |
| Founder Circle | 创业/合伙人讨论 |
| Soul Circle | 深度价值观讨论 |
| Study Buddy Room | 学习伙伴房 |

### 10.4 语言限制

每个房间最多 3 种语言。

第一版推荐优先支持：

- 中文 + 英语
- 日语 + 英语
- 韩语 + 英语

后续支持：

- 中文 + 英语 + 塞尔维亚语
- 中文 + 英语 + 波兰语
- 英语 + 西语
- 英语 + 德语

原则：

```text
每个房间有一个 Anchor Language，通常是英语。
其他语言通过 AI 翻译到 Anchor Language，再返回各用户界面。
```

### 10.5 群聊界面

H5/PC 群聊界面三层：

顶部：

```text
当前话题：自由是否比高收入更重要？
当前阶段：反方挑战
AI 提问：如果自由重要，为什么很多人仍然选择高薪高压工作？
语言：中文 + 英语
人数：3/5
```

中间：

- 用户发言
- AI 主持
- 翻译内容
- 他人回应
- 小组观点卡

底部：

- 输入框
- 语音按钮
- 目标语言开关
- AI 提示栏
- 语法小字纠错
- 一键生成更自然表达

### 10.6 AI 在群里的角色

AI 同时负责：

- 主持讨论
- 控制发言节奏
- 防止跑题
- 提出反方问题
- 翻译多语言
- 纠正语法
- 提取金句
- 记录每个人语言问题
- 生成小组总结
- 推荐后续话题
- 防止攻击和违规

### 10.7 讨论结束产物

每场讨论结束后自动生成：

#### 小组总结

- 话题背景
- 主要观点
- 正方观点
- 反方观点
- 共识
- 分歧
- 最有价值的 5 句话
- 未解决问题
- 后续讨论方向

#### 个人总结

每个用户收到不同版本：

- 你的核心观点
- 你的表达升级
- 你的语法错误
- 你的高频词汇
- 你可以收藏的他人观点
- 是否生成新的 Thought Freeze vNext

#### 可收藏观点卡

用户可以收藏别人观点，但进入自己思想库时应生成“我的理解版”，而不是原文复制：

```text
来源：公开讨论
原观点摘要：某用户认为……
我的理解：……
是否加入 Thought Freeze？
```

### 10.8 话题版本机制

同一个话题会生成不同分支：

```text
创业是为了赚钱还是自由？
├── A 用户版本：创业是摆脱组织控制
├── B 用户版本：创业是获得资源分配权
├── C 用户版本：创业是用风险换自由
└── 小组共创版本：创业是自由、风险和责任的交换
```

用户可以：

- 收藏分支
- 反驳分支
- 基于分支开新房间
- 把分支合并到自己的 Freeze
- 生成目标语言表达版本

---

## 11. AinerSpeak Connect：用户匹配系统

### 11.1 总定位

AinerSpeak Connect 不是普通陌生人社交，而是：

> 基于思想、目标、语言、价值观和沟通方式的高质量同频匹配系统。

### 11.2 匹配模式

| 模式 | 说明 |
|---|---|
| Interest Match | 兴趣相投 |
| Language Buddy | 语言练习伙伴 |
| Growth Buddy | 成长伙伴/基友模式 |
| Soulmate | 深度价值观匹配 |
| Co-founder | 创业/商业伙伴 |
| Debate PK | 找观点对手 |
| Group Match | 推荐小组和话题 |

### 11.3 权限与隐私

默认系统可用于学习目的生成 Language Profile 和 Thought Tags，但社交匹配必须用户主动开启。

用户点击开启 Connect 时提示：

```text
为了推荐更合适的思想伙伴、语言伙伴、创业伙伴或 Soulmate，AinerSpeak 会使用你的公开资料、已授权的话题标签、价值观画像和学习目标进行匹配。

你的私人对话原文不会直接展示给其他用户。
你可以选择哪些思想资产公开、半公开或仅用于 AI 匹配。
你可以随时关闭或删除匹配画像。
```

### 11.4 Soulmate Readiness

Soulmate 模式需要完整度门槛：

```text
Soulmate Readiness：62%

还需要补充：
- 情感价值观
- 生活方式
- 未来城市偏好
- 沟通方式
- 冲突处理
```

达到 80% 后开放深度匹配。

### 11.5 推荐卡片

推荐卡片展示：

- 昵称
- 国家
- 母语
- 目标语言
- 共同话题
- 匹配理由
- 匹配维度
- AI 破冰问题
- 是否可跨语言聊天
- 是否可邀请进小组

示例：

```text
匹配度 87%

共同话题：AI创业 / 欧洲生活 / 英语提升
目标重合：92%
价值观重合：84%
语言互补：76%
沟通风格：88%

建议开场：
你觉得自由和稳定哪个更重要？
```

### 11.6 AI 三人对话

用户 A + 用户 B + AI Host。

AI 负责：

- 翻译
- 破冰
- 提问
- 总结
- 防止冷场
- 给双方语言反馈
- 生成可收藏思想资产

---

## 12. 前端产品设计

### 12.1 前端端口

建议三套前端，但共用组件库：

| 端 | 域名 | 技术 |
|---|---|---|
| H5/PWA | app.ainerspeak.com | Next.js / React |
| PC Studio | studio.ainerspeak.com 或 app/studio | Next.js |
| Admin Console | admin.ainerspeak.com | React Admin / Ant Design Pro |

### 12.2 H5 首页

首页强调“今天想表达什么”，不是“今天学什么”。

模块：

1. 今日想法输入
2. 继续上次思想
3. 今日语法消消乐
4. 推荐话题
5. 同频雷达
6. 我的思想库
7. 实时语音练习
8. 会员开通入口

首页示例：

```text
AinerSpeak

今天想聊什么？
[人生] [AI] [创业] [情感] [欧洲] [随便聊]

继续完善：
《为什么我想去欧洲发展》 v4

今日待消灭：
rather than doing... 64%
allow someone to do... 82%

为你推荐：
自由是否比高收入更重要？
AI创业最现实的切入口是什么？

同频雷达：
发现 3 个与你话题高度相似的人
```

### 12.3 H5 对话页

必须有：

- AI 对话区
- 母语/目标语言切换
- 语音输入
- 实时语法提示栏
- 高级表达按钮
- 口语版按钮
- 书面版按钮
- Freeze 按钮
- 转话题按钮
- 朗读按钮
- 加入消消乐按钮

### 12.4 H5 Thought Asset 页

结构：

- 标题
- 版本时间线
- 中文完整版
- 目标语言多版本 Tabs
- 关键词
- 句型
- 语法结构
- 朗读/跟读
- 继续对话
- 转为公开话题
- 邀请他人讨论
- 加入小组
- 导出 Markdown/PDF

### 12.5 H5 话题列表页

分类：

- 今日热门
- 与你相关
- 正在辩论
- 等待加入
- 同语言圈
- 目标语言圈
- 创业
- 人生
- 情感
- AI
- 移民
- 商业

话题卡片：

```text
自由是否比高收入更重要？

分类：人生 / 移民 / 价值观
语言：中文 + 英语
人数：3/5
模式：Debate PK

AI 推荐理由：
你最近多次讨论欧洲生活和稳定感。

[加入讨论] [收藏] [用我的观点发起新版本]
```

### 12.6 H5 匹配雷达页

页面：

- 雷达动画
- 匹配模式切换
- 推荐卡片
- AI 破冰建议
- 邀请进入 AI 三人对话
- 邀请进入小组
- 隐私开关

### 12.7 PC Studio

PC 端适合深度写作和管理思想资产。

模块：

- 左侧思想库树形目录
- 中间编辑器
- 右侧 AI Coach
- 下方语法/词汇/句型面板
- 版本 Diff
- Mind Graph
- 多语言版本对照
- 小组讨论记录
- 收藏观点库
- 导出功能

### 12.8 UI 风格建议

关键词：

- 高级
- 清爽
- 科技感
- 不像儿童学习软件
- 更像 Notion + ChatGPT + Grammarly + Discord 的融合

视觉：

- 深色模式优先
- 毛玻璃卡片
- 渐变背景
- 思想节点图
- 雷达匹配动画
- 语法消消乐进度条
- 对话气泡下方小字提示
- 重点少用红色错误，更多用“升级建议”

颜色建议：

- 主色：深蓝紫 / AI 紫
- 辅色：青绿色表示成长
- 警示色：橙色表示待改进
- 错误色：尽量少用红色

---

## 13. Admin 后台设计

### 13.1 后台模块

| 模块 | 功能 |
|---|---|
| Dashboard | 用户、活跃、成本、AI调用、语音时长 |
| User Management | 用户管理、封禁、会员、画像 |
| Membership | 普通/VIP/Pro/Business 权限 |
| AI Provider | LLM/STT/TTS/Realtime Provider 配置 |
| Prompt Center | 系统 Prompt、角色 Prompt、房间 Prompt |
| Content Moderation | 对话/话题/群组审核 |
| Topic Management | 话题、标签、分类、公开状态 |
| Circle Management | 小组、房间、AI主持配置 |
| Match Management | 匹配池、匹配分数、推荐日志 |
| Pattern Library | 语法/句型/词汇模式库 |
| Expression Assets | 用户资产查询与问题排查 |
| Cost Center | API成本、用户成本、套餐成本 |
| Audit Logs | 管理员操作日志 |
| System Config | 全局配置 |

### 13.2 用户管理详情页

展示：

- 基础信息
- 会员等级
- 语言目标
- 活跃记录
- AI 使用量
- 语音使用量
- Thought Assets 数量
- Pattern 掌握度
- 匹配功能状态
- 举报记录
- 风险评分
- 管理员备注

### 13.3 Provider 管理

后台支持：

- 添加 Provider
- 设置 API Key
- 设置可用模型
- 设置用户等级可用范围
- 设置限流
- 设置备用 Provider
- 查看延迟
- 查看失败率
- 查看成本

### 13.4 Prompt Center

Prompt 需要可配置，而不是写死代码里。

分类：

- 通用系统 Prompt
- 思想对话 Prompt
- 语法纠错 Prompt
- 多语言翻译 Prompt
- Thought Freeze Prompt
- 小组主持 Prompt
- Debate Prompt
- Soulmate 匹配解释 Prompt
- Co-founder 匹配 Prompt
- 语音教练 Prompt

每个 Prompt 有版本管理：

```text
prompt_key
version
language
model_family
enabled
created_by
created_at
```

### 13.5 匹配后台

管理员可以查看：

- 用户匹配开关
- 匹配画像完整度
- 推荐结果
- 匹配分数
- 匹配解释
- 被跳过原因
- 举报记录
- 黑名单
- 人工推荐

### 13.6 话题和小组后台

管理：

- 公开话题
- 推荐话题
- 标签
- 房间
- 小组人数
- AI 主持 Prompt
- 语言限制
- 房间总结
- 违规内容
- 话题热度
- 用户贡献度

---

## 14. 权限与会员设计

不集成支付，先采用人工开通。

### 14.1 开通方式

前台展示：

```text
开通 VIP / Pro 请联系：
Telegram: @xxx
WeChat: xxx
Email: xxx
```

用户提交申请后后台人工开通。

### 14.2 权限分层

| 功能 | Free | VIP | Pro | Business |
|---|---|---|---|---|
| 每日 AI 对话 | 限量 | 较多 | 高额度 | 高额度 |
| Thought Freeze | 3/月 | 50/月 | 无限或高额度 | 高额度 |
| 表达资产版本 | 基础/口语 | 高级/书面 | 全部 | 全部 |
| Pattern Crush | 基础 | 完整 | 完整 | 完整 |
| 实时语音 | 无/少量 | 有 | 高额度 | 高额度 |
| 小组讨论 | 公开房 | VIP房 | 深度房 | 创业房 |
| 匹配推荐 | 每日少量 | 增加 | Soulmate/高级 | Co-founder |
| AI 三人对话 | 无 | 有 | 有 | 有 |
| 导出 | 基础 | Markdown | PDF/Markdown | 高级导出 |
| Provider 质量 | 便宜模型 | 中高 | 高级 | 高级 |

---

## 15. 后端架构

### 15.1 最小企业级落地架构

目标：100-1000 用户稳定运行，部署简单，后期可扩展。

推荐：

```text
Nginx / Caddy
        ↓
Frontend H5 / PC / Admin
        ↓
Backend API
        ↓
PostgreSQL + pgvector
Redis
Object Storage
Worker
LLM/Voice Providers
```

### 15.2 技术选型

推荐方案 A：

- 前端：Next.js + React + Tailwind + shadcn/ui
- 后端：FastAPI
- 数据库：PostgreSQL + pgvector
- 缓存/队列：Redis
- 异步任务：Celery / RQ / Arq
- 对象存储：MinIO 或 S3/R2
- WebSocket：FastAPI WebSocket
- 实时语音：WebRTC/WebSocket + Provider Adapter
- 部署：Docker Compose
- 反代：Nginx/Caddy
- 监控：Prometheus + Grafana 或先用轻量日志

推荐方案 B：

- 后端：NestJS
- 队列：BullMQ
- 其他同上

如果你自己更熟 Python AI 生态，优先 FastAPI。

### 15.3 服务拆分

MVP 不要微服务，建议模块化单体：

```text
backend/
├── auth/
├── users/
├── memberships/
├── dialogue/
├── expression_assets/
├── thought_freeze/
├── pattern_crush/
├── voice/
├── circles/
├── matching/
├── ai_providers/
├── admin/
├── moderation/
├── billing_manual/
└── system/
```

100-1000 用户完全够用。

后续再拆：

- realtime-service
- worker-service
- ai-orchestrator
- matching-service

---

## 16. 数据库核心表设计

### 16.1 用户与权限

```sql
users
user_profiles
user_language_settings
memberships
membership_plans
roles
permissions
user_permissions
login_logs
```

### 16.2 AI 对话与思想资产

```sql
dialogue_sessions
dialogue_messages
thought_assets
thought_asset_versions
thought_facts
mind_graph_nodes
mind_graph_edges
expression_assets
expression_asset_versions
asset_exports
```

### 16.3 语法消消乐

```sql
language_patterns
user_pattern_stats
user_pattern_events
vocabulary_items
user_vocabulary_stats
grammar_error_events
review_queue
mastery_history
```

### 16.4 语音

```sql
voice_sessions
voice_turns
speech_transcripts
tts_jobs
pronunciation_scores
realtime_session_logs
```

### 16.5 社区与小组

```sql
topics
topic_versions
topic_tags
topic_recommendations
circle_rooms
circle_members
circle_messages
circle_ai_summaries
circle_user_reports
circle_collected_viewpoints
```

### 16.6 匹配

```sql
user_match_settings
user_match_profiles
user_value_profiles
user_communication_profiles
user_personality_tests
match_recommendations
match_scores
match_requests
match_rooms
match_feedback
```

### 16.7 AI Provider 与成本

```sql
ai_providers
ai_models
provider_credentials
ai_request_logs
ai_cost_logs
prompt_templates
prompt_versions
```

### 16.8 审核与安全

```sql
moderation_events
reports
blocked_users
audit_logs
admin_actions
rate_limits
privacy_consents
data_deletion_requests
```

---

## 17. API 设计概览

### 17.1 Auth

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
GET  /api/me
PUT  /api/me/profile
```

### 17.2 Dialogue

```http
POST /api/dialogues
GET  /api/dialogues
GET  /api/dialogues/{id}
POST /api/dialogues/{id}/messages
POST /api/dialogues/{id}/freeze
POST /api/dialogues/{id}/suggestions
```

### 17.3 Thought Assets

```http
GET  /api/thought-assets
POST /api/thought-assets
GET  /api/thought-assets/{id}
POST /api/thought-assets/{id}/versions
POST /api/thought-assets/{id}/convert-to-topic
POST /api/thought-assets/{id}/export
```

### 17.4 Expression Assets

```http
POST /api/expression-assets/generate
GET  /api/expression-assets/{id}
POST /api/expression-assets/{id}/tts
POST /api/expression-assets/{id}/explain-word
POST /api/expression-assets/{id}/explain-sentence
```

### 17.5 Pattern Crush

```http
GET  /api/patterns/today
POST /api/patterns/{id}/practice
POST /api/patterns/{id}/mark-mastered
GET  /api/patterns/stats
```

### 17.6 Voice

```http
POST /api/voice/transcribe
POST /api/voice/tts
POST /api/voice/pronunciation-score
WS   /api/voice/realtime
```

### 17.7 Topics & Circles

```http
GET  /api/topics
POST /api/topics
GET  /api/topics/{id}
POST /api/topics/{id}/join
POST /api/topics/{id}/fork
POST /api/circles
GET  /api/circles/{id}
POST /api/circles/{id}/messages
POST /api/circles/{id}/finish
GET  /api/circles/{id}/summary
POST /api/circles/{id}/collect-viewpoint
```

### 17.8 Matching

```http
POST /api/connect/enable
POST /api/connect/disable
GET  /api/connect/readiness
GET  /api/connect/recommendations
POST /api/connect/requests
POST /api/connect/requests/{id}/accept
POST /api/connect/requests/{id}/reject
POST /api/connect/match-room
```

### 17.9 Admin

```http
GET  /api/admin/dashboard
GET  /api/admin/users
PUT  /api/admin/users/{id}/membership
GET  /api/admin/ai-providers
POST /api/admin/ai-providers
GET  /api/admin/prompts
POST /api/admin/prompts
GET  /api/admin/topics
GET  /api/admin/circles
GET  /api/admin/reports
```

---

## 18. AI Orchestration：AI 编排设计

### 18.1 AI 不应只调用一个 Prompt

每次用户消息进入后端，应经过编排：

```text
Input Normalization
↓
Language Detection
↓
Intent Detection
↓
User Profile Loading
↓
Context Retrieval
↓
LLM Response
↓
Grammar Analysis
↓
Pattern Extraction
↓
Thought Fact Extraction
↓
Safety Check
↓
Response Assembly
↓
Save Events
```

### 18.2 核心 AI 任务

| 任务 | 输出 |
|---|---|
| Language Detection | 用户当前语言、目标语言 |
| Meaning Understanding | 用户真实意思 |
| Socratic Question | 追问问题 |
| Debate Challenge | 反方挑战 |
| Translation | 多语言版本 |
| Grammar Correction | 错误和正确表达 |
| Pattern Mining | 句型/语法标签 |
| Vocabulary Mining | 高频词 |
| Thought Fact Extraction | 核心观点 |
| Mind Graph Update | 节点/边 |
| Freeze Generation | 表达资产 |
| Topic Generation | 公开话题 |
| Match Explanation | 匹配理由 |
| Group Summary | 小组总结 |

### 18.3 Provider 抽象

```text
AIProvider
├── generateText()
├── streamText()
├── embedText()
├── classify()
├── moderate()
├── transcribe()
├── synthesize()
├── realtime()
└── estimateCost()
```

### 18.4 Model Router

根据任务选择模型：

| 场景 | 模型策略 |
|---|---|
| 普通聊天 | 便宜模型 |
| 高级表达生成 | 高质量模型 |
| Thought Freeze | 高质量模型 |
| 语法提取 | 中等模型 |
| 向量检索 | embedding 模型 |
| 实时语音 | realtime provider |
| 小组总结 | 高质量模型 |
| 匹配解释 | 高质量模型 |

---

## 19. 生产环境部署方案

### 19.1 单机 Docker Compose 架构

适合 100-1000 用户。

```text
VPS / Cloud Server
├── nginx
├── frontend-app
├── frontend-admin
├── backend-api
├── worker
├── postgres
├── redis
├── minio
└── monitoring
```

推荐配置：

- 4C8G：早期可跑
- 8C16G：更稳定
- 磁盘：100GB+
- 数据库定时备份
- 对象存储可用 Cloudflare R2/S3 替代 MinIO

### 19.2 环境

- dev
- staging
- production

### 19.3 CI/CD

建议：

- GitHub Actions
- Docker build
- 自动部署到服务器
- 数据库 migration 手动确认
- 环境变量分离

### 19.4 Nginx 路由

```text
app.ainerspeak.com      → frontend app
studio.ainerspeak.com   → frontend app / studio route
admin.ainerspeak.com    → admin frontend
api.ainerspeak.com      → backend api
```

### 19.5 数据备份

- PostgreSQL 每日备份
- MinIO/S3 每日检查
- Redis 不作为长期数据源
- 重要资产导出任务
- 备份保留 7/30/90 天

---

## 20. 安全、隐私与合规设计

### 20.1 隐私原则

用户的思想资产非常敏感，必须明确：

- 私人对话默认不公开
- Thought Asset 默认私密
- 转为公开话题需要用户确认
- 参与匹配需要用户主动启用
- Soulmate 需要二次授权
- 用户可删除个人数据
- 用户可关闭匹配画像

### 20.2 数据分级

| 数据 | 默认状态 |
|---|---|
| 私人对话原文 | 私密 |
| Thought Freeze | 私密 |
| 语言错误记录 | 私密 |
| Pattern 统计 | 私密 |
| 公开话题发言 | 房间可见 |
| 公开观点卡 | 用户授权后可见 |
| 匹配画像 | 仅 AI 匹配使用 |
| Soulmate 问卷 | 高敏感，单独授权 |

### 20.3 社区安全

需要：

- 举报
- 拉黑
- 敏感内容审核
- 违规用户限制
- AI 主持防止攻击
- 小组讨论规则
- 私信限制
- 未成年人限制

### 20.4 日志安全

- API Key 加密存储
- 管理员操作审计
- 用户敏感数据脱敏展示
- 生产日志不要记录完整隐私对话
- AI 请求日志可配置是否保存完整内容

---

## 21. 成本控制

### 21.1 成本来源

- LLM 文本调用
- Embedding
- 实时语音
- TTS
- STT
- 存储
- 服务器

### 21.2 控制策略

- 免费用户限额
- 高成本功能 VIP
- 实时语音限时长
- Thought Freeze 限次数
- 小组总结异步生成
- 使用便宜模型做分类和提取
- 高质量模型只用于关键生成
- 缓存相同句子的解释和朗读
- Provider 成本监控

### 21.3 后台成本看板

展示：

- 今日总成本
- 用户平均成本
- 每个 Provider 成本
- 每个功能成本
- 高成本用户
- 失败请求成本
- 会员收入估算

---

## 22. MVP 落地范围

第一阶段不要做太大，建议先做可验证核心闭环。

### 22.1 MVP 必做

1. 注册/登录/用户画像
2. 母语/目标语言对话
3. AI 纠错 + 多版本表达
4. Thought Freeze
5. Expression Asset
6. Pattern Crush 基础版
7. H5 前端
8. PC Studio 基础版
9. Admin 用户与会员管理
10. Provider 可插拔配置
11. 手动会员开通
12. 公开话题列表
13. 从 Freeze 转话题
14. 2-3 人文字小组讨论
15. AI 主持 + 翻译 + 语法提示
16. 讨论结束小组总结
17. 收藏别人观点到自己的思想库
18. 基础同趣匹配

### 22.2 第二阶段

1. 实时语音对话
2. 小组语音房
3. AI 三人对话
4. Debate PK
5. Soulmate Readiness
6. Co-founder Match
7. PC Studio 完整版
8. 高级 Mind Graph
9. 导出 PDF/Markdown
10. 更完整 Prompt Center

### 22.3 第三阶段

1. 多国家语言社区
2. 移动 App
3. 高级实时字幕
4. 多 Provider 自动路由
5. 个人成长报告
6. AI Mentor 市场
7. 小组知识库
8. 企业/学校版本

---

## 23. 推荐开发顺序

### Phase 0：基础工程

- Docker Compose
- PostgreSQL + pgvector
- Redis
- FastAPI/NestJS
- Next.js H5
- Admin 框架
- Auth
- RBAC
- Provider 配置

### Phase 1：个人表达闭环

- Dialogue
- Grammar Correction
- Multi-version Expression
- Thought Freeze
- Pattern Crush
- TTS 基础朗读

### Phase 2：社区闭环

- Topic List
- Convert Freeze to Topic
- Circle Room
- AI Moderator
- Group Summary
- Collect Viewpoint

### Phase 3：匹配闭环

- Match Settings
- User Profiles
- Interest Match
- Radar UI
- AI 三人对话
- Buddy Mode

### Phase 4：实时语音

- STT/TTS
- Realtime Session
- Voice Coach
- Group Voice Room

---

## 24. 核心页面清单

### H5 用户端

- Login/Register
- Onboarding
- Home
- Dialogue
- Thought Asset List
- Thought Asset Detail
- Expression Detail
- Pattern Crush
- Voice Coach
- Topic Explore
- Topic Detail
- Circle Room
- Match Radar
- Match Detail
- Profile
- Membership Contact
- Settings
- Privacy Center

### PC Studio

- Dashboard
- Thought Workspace
- Version Diff
- Mind Graph
- Expression Editor
- Pattern Analytics
- Circle History
- Collected Viewpoints
- Export Center

### Admin

- Dashboard
- User Management
- Membership Management
- Provider Management
- Prompt Center
- Topic Management
- Circle Management
- Match Management
- Pattern Library
- Moderation
- Cost Center
- Audit Logs
- System Settings

---

## 25. 产品护城河

AinerSpeak 的护城河不是模型本身，而是：

1. 用户长期思想资产
2. 用户个人表达资产
3. 用户语言短板数据库
4. 用户掌握过的 Pattern 历史
5. 用户价值观和沟通画像
6. 用户收藏过的高质量观点
7. 小组讨论生成的集体知识资产
8. 跨语言社交关系
9. AI 根据个人历史持续升级表达的能力
10. 用户离开后很难带走的完整成长轨迹

最终飞轮：

```text
用户表达思想
↓
AI 帮助打磨
↓
生成表达资产
↓
提取语法短板
↓
进入消消乐
↓
用户成长
↓
加入小组讨论
↓
收藏别人观点
↓
思想资产升级
↓
匹配更同频的人
↓
产生更多高质量对话
```

---

## 26. 最终产品定义

AinerSpeak 最终不是一个英语学习软件，而是：

> 一个以思想表达为核心的 AI 多语言成长系统。

它同时是：

- AI 英语/多语言教练
- 个人思想沉淀工具
- 表达资产管理系统
- 语法句型消消乐
- 实时语音陪练工具
- 跨语言思想社区
- 同频伙伴匹配系统
- 成人成长型社交平台

最重要的一句话：

> 用户打开 AinerSpeak，不是因为“我要学习”，而是因为“我今天有一个想法想说”。  
> 学习是在表达中自然发生的。

---

## 27. 给开发团队的落地原则

1. 先做闭环，不先做大而全。
2. AI Provider 必须可插拔。
3. Prompt 必须后台可配置。
4. 用户思想资产默认私密。
5. 匹配和 Soulmate 必须主动授权。
6. Pattern Crush 必须来自用户真实表达，而不是教材。
7. 小组讨论必须沉淀为总结和个人资产。
8. UI 必须高级，不能像儿童学习软件。
9. 免费用户体验要能感知价值，但高成本功能必须限制。
10. 100-1000 用户先用模块化单体，不要上来搞微服务。

---

## 28. 建议项目名称体系

主品牌：

```text
AinerSpeak
```

产品总称：

```text
AinerSpeak Expression OS
```

模块名：

```text
Mind Dialogue
Thought Freeze
Expression Assets
Pattern Crush
Voice Coach
Thought Circles
AinerSpeak Connect
PC Studio
Admin Console
```

口号：

```text
Think in your language. Grow in another.
Build your thoughts. Master your expression.
Don't memorize English. Forge your own expression.
```

---

## 29. v1.2 新增需求整合说明

本版本相较 v1.1 增加并强化：

- 用户匹配系统
- Soulmate / Buddy / Co-founder / Debate PK
- MBTI / 星座 / 八字娱乐标签
- 推理深度 / 见识广度 / 情绪成熟度 / 沟通质量画像
- 思想小组
- 2-5 人跨语言讨论
- 最多三种语言房间限制
- 从 Thought Freeze 转公开话题
- 每日公开话题列表
- 标签推荐
- 小组 AI 主持
- 群聊实时纠错
- 小组总结生成篇章
- 收藏别人观点进入自己的思想库
- 话题分支版本机制
- PC/H5/Admin 更明确页面设计
- 后台匹配和小组管理
- 生产环境部署、安全、成本控制

---

## 30. 结论

AinerSpeak 的最终产品逻辑是：

```text
个人表达
    +
AI 语言成长
    +
思想沉淀
    +
跨语言讨论
    +
同频匹配
    +
长期资产
```

这套系统不是简单做一个 AI Grammar App，而是做一个面向成年人真实需求的：

> **AI 思想表达与跨语言成长平台。**

它既解决成人英语提升难的问题，也解决成年人缺少同频伙伴、创业伙伴、深度讨论伙伴的问题。语言学习不再是痛苦任务，而是嵌入到用户最想表达、最想讨论、最想沉淀的人生、事业、情感、价值观和未来规划之中。
