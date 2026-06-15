# AinerSpeak AI Expression OS 产品设计方案

版本：v1.0  
定位：AI 思想沉淀 + 多语言表达训练 + 语法消消乐 + 实时语音陪练平台  
建议主域名：`ainerspeak.com`  
建议产品入口：`app.ainerspeak.com`  
建议后台入口：`admin.ainerspeak.com`

---

## 1. 产品一句话定位

AinerSpeak 不是传统英语学习 App，而是一个 **Expression Driven Learning（表达驱动学习）平台**。

用户先用母语或目标语言表达自己的真实想法，AI 通过讨论、追问、反驳、纠正和翻译，把用户的思想沉淀成长期资产，并在这个过程中自动挖掘用户高频语法、句型、词汇和表达短板，生成个人专属学习路径。

核心理念：

> 不要背别人给你的英语，而是把你真正想说的话，打磨成可以自然表达的多语言能力。

---

## 2. 产品核心差异化

传统英语产品的问题：

- 用户被动学习教材内容。
- 花大量时间学习已经掌握或不感兴趣的语法。
- 语法、词汇、口语、写作彼此割裂。
- 成人用户真正想表达复杂观点时，仍然卡住。
- 学习内容无法沉淀成用户自己的思想资产。

AinerSpeak 的解决方式：

- 用户从“我想表达什么”开始，而不是从“今天学什么语法”开始。
- AI 陪用户进行思想讨论、人生规划、商业思考、观点辩论、日常反思。
- 讨论过程中同步生成母语解释、目标语言表达、语法提示、高级表达、口语表达、书面表达。
- AI 自动记录用户常犯错误，进入“语法消消乐”系统。
- 用户已经掌握的语法、句型、词汇自动隐藏，不再反复打扰。
- 最终形成用户自己的思想库、表达库、语法库、词汇库、语音成长记录。

---

## 3. 产品模块总览

### 3.1 H5 / Mobile Web 前端

主要面向移动端用户，支持 PWA。

核心功能：

1. 用户注册 / 登录
2. 多语言目标设置
3. 思想对话
4. 双语同步显示
5. 实时语音对话
6. 语法提示 HUD
7. 表达版本切换
8. 表达卡片保存
9. 语法消消乐
10. 词汇消消乐
11. 思想库 / 价值观库
12. 语音朗读 / 跟读 / 复述
13. 会员状态展示
14. 联系客服开通会员

### 3.2 PC Web 前端

PC 端适合长文本编辑、思想沉淀、文章整理、版本管理。

核心功能：

1. 长文思想编辑器
2. AI 对话侧边栏
3. 中文 / 目标语言双栏对照
4. 口语版 / 书面版 / 高级版 / 简述版 / 演讲版切换
5. 版本管理
6. 语法结构分析
7. 高频句型分析
8. 高频词汇分析
9. Thought Freeze 思想冻结
10. 导出 Markdown / PDF / DOCX（后期）

### 3.3 Admin PC 后台

用于运营、用户管理、会员开通、权限配置、API 供应商配置。

核心功能：

1. 管理员登录
2. 用户列表
3. 用户详情
4. 手动开通 VIP / Pro / Premium
5. 权限套餐配置
6. LLM Provider 配置
7. Voice Provider 配置
8. API Key 管理
9. 用量统计
10. 成本统计
11. Prompt 模板管理
12. 敏感词 / 风控配置
13. 系统日志
14. 用户反馈管理

### 3.4 Backend API 服务

负责业务逻辑、AI 调用、权限控制、数据存储。

建议技术：

- Node.js NestJS 或 Python FastAPI
- PostgreSQL
- Redis
- Prisma / SQLAlchemy
- Docker Compose 部署
- Nginx / Caddy 反向代理

建议优先：**FastAPI + PostgreSQL + Redis**，实现快、AI 调用方便、部署轻。

---

## 4. 用户角色与权限设计

### 4.1 用户类型

| 用户类型 | 说明 |
|---|---|
| Guest | 未登录用户，只能体验有限次数 |
| Free | 免费注册用户 |
| VIP | 基础付费用户 |
| Pro | 高级付费用户 |
| Premium | 高用量语音 / 深度对话用户 |
| Admin | 后台管理员 |
| Super Admin | 系统超级管理员 |

### 4.2 权限控制示例

| 功能 | Free | VIP | Pro | Premium |
|---|---:|---:|---:|---:|
| 每日文本 AI 次数 | 5 | 50 | 200 | 500 |
| 思想对话 | 基础 | 完整 | 完整 | 完整 |
| 语法消消乐 | 基础 | 完整 | 完整 | 完整 |
| 表达卡片数量 | 20 | 500 | 5000 | 不限 |
| 实时语音 | 不支持 | 低额度 | 中额度 | 高额度 |
| 高级表达版本 | 否 | 是 | 是 | 是 |
| 书面 / 口语 / 演讲版 | 否 | 是 | 是 | 是 |
| 多语言学习 | 1种 | 2种 | 5种 | 不限 |
| 个人知识图谱 | 否 | 基础 | 完整 | 完整 |
| 长期记忆 | 否 | 是 | 是 | 是 |
| 导出 | 否 | Markdown | Markdown/PDF | 全部 |

### 4.3 不接支付的会员开通方式

用户点击“开通会员”后显示：

- Telegram 联系方式
- 微信二维码
- WhatsApp
- 邮箱

后台由管理员手动修改用户套餐、到期时间、额度。

---

## 5. 核心业务流程

### 5.1 母语思想对话模式

用户可以用中文、日语、韩语、西语等母语和 AI 聊天。

流程：

```text
用户母语输入
→ AI 理解用户思想
→ AI 追问 / 反驳 / 补充信息
→ 同时生成目标语言表达
→ 下方显示小行语法提示
→ 用户点击可展开详细解释
→ 对话结束后沉淀为 Thought Asset
```

示例：

用户：

> 我觉得很多人移民不是为了赚钱，而是为了稳定和自由。

AI 主回复：

> 这个观点很清楚。我想继续追问：如果收入下降 30%，你是否仍然认为移民值得？这能判断你的核心价值排序。

英文同步表达：

> I think many people immigrate not just to make more money, but to pursue stability and freedom.

语法小提示：

> `not just...but...`：用于表达“不只是……而是……”。

用户点击后展开：

- 基础版
- 自然口语版
- 高级版
- 书面版
- 句型结构
- 可替换词
- 朗读
- 加入学习

---

### 5.2 目标语言对话模式

用户直接用英语或其他目标语言和 AI 聊天。

流程：

```text
用户目标语言输入
→ AI 先理解内容并继续对话
→ AI 同时检测语法 / 词汇 / 表达自然度
→ 给出自然修正版
→ 标记用户错误类型
→ 判断是否加入消消乐队列
→ 更新用户掌握度
```

示例：

用户：

> I think Europe have more freedom.

AI 主回复：

> I understand. You mean Europe feels like a place with more personal freedom. But what kind of freedom matters most to you: lifestyle, speech, work, or social pressure?

表达建议：

> Better: **I think Europe offers more freedom.**

语法提示：

> `Europe` 是单数概念，不能用 `have`，这里更自然用 `offers / provides`。

系统记录：

```json
{
  "pattern": "subject_verb_agreement",
  "mistake": "Europe have",
  "correction": "Europe offers",
  "importance": 5,
  "frequency": 1,
  "added_to_review": true
}
```

---

## 6. 思想沉淀模式

### 6.1 Thought Dialogue

AI 不只是聊天，而是帮助用户完成思考。

AI 角色：

- 苏格拉底提问者
- 反方律师
- 人生规划顾问
- 商业顾问
- 语言教练
- 面试官
- 外国朋友
- 客户
- 约会聊天对象

### 6.2 Thought Freeze

当用户觉得某个观点已经完善，点击“Freeze”。

系统生成：

1. 中文完整版
2. 中文简述版
3. 目标语言基础版
4. 目标语言自然口语版
5. 目标语言高级版
6. 目标语言书面版
7. 1分钟演讲版
8. 3分钟演讲版
9. 面试回答版
10. 社交聊天版

### 6.3 Thought Asset

每个思想资产包含：

- 标题
- 主题
- 原始对话
- AI 总结
- 核心观点
- 反方观点
- 用户最终立场
- 关键词
- 语法结构
- 高频表达
- 多语言版本
- 朗读音频
- 版本历史
- 熟练度

---

## 7. 语法消消乐系统

### 7.1 核心思想

AI 不教所有语法，只教用户真实表达中高频出现、反复出错、并且值得掌握的语法和句型。

### 7.2 Pattern Mining

AI 从每次对话中提取：

- 语法错误
- 句型结构
- 高频表达
- 词汇短板
- 表达不自然点
- 可升级表达

### 7.3 Pattern 类型

示例：

- Subject-Verb Agreement
- Tense
- Present Perfect
- Passive Voice
- Relative Clause
- Conditional
- Not only...but also...
- Rather than / Instead of
- Allow sb to do sth
- It is not about A, but about B
- The reason why...is that...
- What matters most is...

### 7.4 消消乐机制

每个 Pattern 有状态：

| 状态 | 说明 |
|---|---|
| New | 新发现 |
| Learning | 学习中 |
| Reviewing | 复习中 |
| Mastered | 已掌握 |
| Archived | 已归档，不再提醒 |
| Ignored | 用户忽略 |

掌握度计算：

```text
Mastery Score = 正确次数 × 权重 - 错误次数 × 权重 + 复习成功加成 + 最近使用加成
```

当 Mastery Score 达到阈值后：

```text
Pattern 自动从首页消失
→ 进入已掌握数据库
→ 下次 AI 不再频繁提醒
→ 仅在长期遗忘时轻度复习
```

### 7.5 消消乐 UI

```text
今日待消除

1. Rather than doing...
掌握度：72%
[练习] [我已掌握] [忽略]

2. Subject-Verb Agreement
掌握度：55%
[练习] [我已掌握] [忽略]

3. allow sb to do sth
掌握度：38%
[练习] [我已掌握] [忽略]
```

---

## 8. 词汇消消乐系统

词汇不是随机单词，而是用户思想中的高频词汇。

示例：

- stability
- freedom
- pressure
- suffocating
- entrepreneurship
- automation
- supply chain
- proposal
- negotiation
- dignity
- long-term value

词汇状态：

- 未见过
- 已见过
- 可理解
- 可使用
- 可自然使用
- 已掌握

系统根据用户实际表达判断，而不是只看用户是否背过。

---

## 9. 实时语音对话设计

### 9.1 语音能力要求

必须支持可插拔 Provider：

- OpenAI Realtime API
- Gemini Live
- ElevenLabs Conversational AI
- Deepgram + LLM + TTS
- Whisper + LLM + TTS
- Azure Speech
- 自建开源 ASR / TTS（后期）

### 9.2 两种语音架构

#### 方案 A：Realtime Speech-to-Speech

```text
Browser WebRTC
→ Realtime Provider
→ Speech LLM
→ Audio Response
```

优点：

- 低延迟
- 可打断
- 体验最好

适合：Pro / Premium 用户。

#### 方案 B：ASR + LLM + TTS

```text
Mic
→ ASR
→ LLM
→ TTS
→ Audio Playback
```

优点：

- 成本更低
- 可控性强
- 适合 MVP

适合：Free / VIP 用户。

### 9.3 语音模式

1. 普通陪聊
2. 思想辩论
3. 面试模拟
4. 约会聊天
5. 商务谈判
6. 客户咨询
7. Vlog 独白练习
8. Shadowing 跟读
9. 复述训练
10. 即兴回答

### 9.4 语音分析指标

- 语法准确度
- 表达自然度
- 词汇丰富度
- 停顿次数
- 重复词
- 语速
- 自信度
- 流畅度
- 发音可懂度

---

## 10. LLM 可插拔设计

### 10.1 Provider 抽象

后端定义统一接口：

```text
LLMProvider.generateText()
LLMProvider.generateJson()
LLMProvider.streamChat()
LLMProvider.analyzeGrammar()
LLMProvider.generateExpressionVersions()
LLMProvider.extractPatterns()
```

支持：

- OpenAI
- Anthropic Claude
- Google Gemini
- DeepSeek
- Qwen
- Moonshot
- Groq
- Ollama 本地模型
- OpenRouter

### 10.2 后台配置项

每个 Provider 可配置：

- Provider 名称
- API Base URL
- API Key
- 默认模型
- 备用模型
- 最大 Token
- 超时时间
- 是否启用
- 优先级
- 单次成本估算
- 用户套餐绑定

### 10.3 模型路由策略

示例：

| 任务 | 推荐模型 |
|---|---|
| 实时对话 | OpenAI Realtime / Gemini Live |
| 普通文本改写 | GPT-4.1 mini / Gemini Flash / Qwen |
| 语法 JSON 分析 | 便宜稳定模型 |
| 思想总结 | 高质量模型 |
| 高频 Pattern 提取 | 中等模型 |
| 后台批处理 | 便宜模型 |

---

## 11. H5 前端页面设计

### 11.1 页面列表

1. `/login` 登录
2. `/register` 注册
3. `/onboarding` 设置母语和目标语言
4. `/home` 首页
5. `/chat` 思想对话
6. `/voice` 实时语音
7. `/thoughts` 思想库
8. `/thoughts/:id` 思想详情
9. `/expressions` 表达库
10. `/patterns` 语法消消乐
11. `/vocabulary` 词汇消消乐
12. `/profile` 用户中心
13. `/membership` 会员开通
14. `/settings` 设置

### 11.2 对话页 UI

顶部：

```text
当前主题：人生规划
目标语言：English
模式：思想博弈 + 语言纠正
今日 Pattern：rather than / allow sb to do / not just...but...
```

中间：

- AI 对话
- 用户对话
- 双语对照
- 可展开语法提示
- 可点击单词
- 可点击句子朗读

底部：

- 文字输入框
- 语音按钮
- 发送按钮
- 模式切换
- Freeze 按钮

### 11.3 句子卡片

每句话点击后出现：

- 原句
- 修正版
- 基础表达
- 自然口语
- 高级表达
- 书面表达
- 语法结构
- 关键词
- 朗读
- 跟读
- 加入消消乐
- 我已掌握

---

## 12. PC 用户端设计

PC 用户端适合深度编辑。

页面：

1. Dashboard
2. Thought Workspace
3. Expression Editor
4. Grammar Lab
5. Vocabulary Lab
6. Voice Practice
7. Version History
8. Export Center

Workspace 布局：

```text
左侧：思想列表 / 主题树
中间：文章 / 对话 / 双语稿
右侧：AI 教练 / 语法分析 / 版本 / 词汇
```

---

## 13. Admin 后台设计

### 13.1 页面列表

1. `/admin/login`
2. `/admin/dashboard`
3. `/admin/users`
4. `/admin/users/:id`
5. `/admin/memberships`
6. `/admin/plans`
7. `/admin/llm-providers`
8. `/admin/voice-providers`
9. `/admin/prompts`
10. `/admin/usage`
11. `/admin/costs`
12. `/admin/logs`
13. `/admin/feedback`
14. `/admin/settings`

### 13.2 后台用户管理

支持：

- 查询用户
- 禁用用户
- 修改套餐
- 设置会员到期时间
- 增加额度
- 查看用量
- 查看最近对话统计
- 查看错误日志
- 重置密码

### 13.3 API Provider 管理

支持：

- 新增 Provider
- 修改 API Key
- 设置启用 / 禁用
- 设置默认模型
- 设置套餐可用范围
- 查看调用成功率
- 查看平均延迟
- 查看成本

---

## 14. 后端服务设计

### 14.1 推荐最小生产架构

```text
Nginx / Caddy
   |
Frontend H5 / PC Static
   |
Backend API: FastAPI
   |
PostgreSQL
Redis
Object Storage
```

### 14.2 Docker Compose 服务

```text
app-api
postgres
redis
nginx/caddy
admin-web
h5-web
worker
```

### 14.3 是否需要消息队列

100-1000 用户阶段不需要 Kafka。

后台异步任务可以用：

- FastAPI BackgroundTasks（轻量）
- Celery + Redis（更稳）
- RQ + Redis（更简单）

建议：MVP 用 **RQ + Redis** 或 Celery。

---

## 15. 数据库设计概要

### 15.1 users

- id
- email
- phone
- username
- password_hash
- native_language
- target_languages
- role
- plan_id
- membership_expired_at
- status
- created_at
- updated_at

### 15.2 plans

- id
- name
- daily_text_limit
- daily_voice_minutes
- max_thoughts
- max_expressions
- max_languages
- enable_realtime_voice
- enable_advanced_expression
- enable_export
- created_at

### 15.3 conversations

- id
- user_id
- title
- topic
- mode
- native_language
- target_language
- status
- created_at
- updated_at

### 15.4 messages

- id
- conversation_id
- user_id
- role
- content
- content_language
- translated_content
- grammar_analysis_json
- expression_versions_json
- audio_url
- created_at

### 15.5 thoughts

- id
- user_id
- title
- topic
- summary
- final_content_native
- final_content_target
- status
- version
- frozen_at
- created_at
- updated_at

### 15.6 thought_versions

- id
- thought_id
- version
- content_native
- content_target
- change_summary
- created_at

### 15.7 expressions

- id
- user_id
- thought_id
- source_text
- base_version
- natural_version
- advanced_version
- written_version
- speech_version
- target_language
- created_at

### 15.8 grammar_patterns

- id
- code
- name
- description
- examples_json
- difficulty
- created_at

### 15.9 user_pattern_mastery

- id
- user_id
- pattern_id
- mastery_score
- correct_count
- mistake_count
- status
- last_seen_at
- last_reviewed_at
- archived_at

### 15.10 user_pattern_events

- id
- user_id
- pattern_id
- message_id
- event_type
- original_text
- corrected_text
- explanation
- importance
- created_at

### 15.11 vocabulary_items

- id
- user_id
- word
- phrase
- language
- meaning_native
- examples_json
- mastery_status
- created_at

### 15.12 voice_sessions

- id
- user_id
- conversation_id
- provider
- duration_seconds
- transcript
- analysis_json
- cost_estimate
- created_at

### 15.13 api_providers

- id
- type
- name
- base_url
- api_key_encrypted
- default_model
- enabled
- priority
- config_json
- created_at

### 15.14 usage_logs

- id
- user_id
- provider_id
- task_type
- tokens_input
- tokens_output
- voice_seconds
- cost_estimate
- latency_ms
- status
- created_at

---

## 16. API 接口设计

### 16.1 Auth

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
GET  /api/auth/me
```

### 16.2 Conversation

```http
POST /api/conversations
GET  /api/conversations
GET  /api/conversations/{id}
POST /api/conversations/{id}/messages
POST /api/conversations/{id}/freeze
```

### 16.3 Expression

```http
POST /api/expressions/generate
GET  /api/expressions
GET  /api/expressions/{id}
POST /api/expressions/{id}/tts
POST /api/expressions/{id}/practice
```

### 16.4 Grammar Pattern

```http
GET  /api/patterns/today
GET  /api/patterns
POST /api/patterns/{id}/practice
POST /api/patterns/{id}/mastered
POST /api/patterns/{id}/ignore
```

### 16.5 Vocabulary

```http
GET  /api/vocabulary/today
GET  /api/vocabulary
POST /api/vocabulary/{id}/mastered
POST /api/vocabulary/{id}/ignore
```

### 16.6 Voice

```http
POST /api/voice/session
POST /api/voice/asr
POST /api/voice/tts
WS   /api/voice/realtime
```

### 16.7 Admin

```http
GET  /api/admin/users
GET  /api/admin/users/{id}
PATCH /api/admin/users/{id}
POST /api/admin/users/{id}/membership
GET  /api/admin/providers
POST /api/admin/providers
PATCH /api/admin/providers/{id}
GET  /api/admin/usage
GET  /api/admin/logs
```

---

## 17. AI Prompt 任务设计

### 17.1 思想对话 Prompt

目标：

- 不迎合用户
- 能追问
- 能反驳
- 能补充信息
- 能保持语言教练角色
- 能输出双语表达

输出结构：

```json
{
  "main_reply_native": "",
  "main_reply_target": "",
  "question": "",
  "challenge": "",
  "suggested_expression": "",
  "grammar_tips": [],
  "patterns": [],
  "vocabulary": []
}
```

### 17.2 语法分析 Prompt

输出结构：

```json
{
  "is_understandable": true,
  "natural_score": 80,
  "corrected_sentence": "",
  "native_version": "",
  "advanced_version": "",
  "written_version": "",
  "mistakes": [
    {
      "type": "subject_verb_agreement",
      "original": "Europe have",
      "corrected": "Europe offers",
      "explanation": "Europe is singular.",
      "importance": 5,
      "should_add_to_review": true
    }
  ]
}
```

### 17.3 Pattern 提取 Prompt

从多轮对话中提取：

- 高频句型
- 高频错误
- 用户已掌握结构
- 需要复习结构
- 适合进入消消乐的结构

---

## 18. 多语言学习设计

系统必须从一开始支持多语言，而不是只写死英语。

### 18.1 语言字段

- native_language：用户母语
- target_language：目标语言
- interface_language：界面语言
- content_language：当前输入语言

### 18.2 支持语言优先级

第一阶段：

- 中文 → 英语
- 英语 → 中文辅助

第二阶段：

- 中文 → 日语
- 中文 → 韩语
- 中文 → 西语
- 中文 → 塞尔维亚语
- 中文 → 德语
- 中文 → 法语

第三阶段：

任意母语 → 任意目标语言。

### 18.3 多语言难点

不同语言语法结构不同，所以 Pattern 不能完全写死英语。

建议设计：

```text
Universal Pattern
    ↓
Language Specific Pattern
```

例如：

Universal：表达原因  
English：The reason why...is that...  
Japanese：なぜなら...からです  
Spanish：La razón es que...

---

## 19. 部署方案

### 19.1 单机部署即可

100-1000 用户阶段，一台云服务器足够。

建议配置：

- 4C8G：MVP / 内测
- 8C16G：小规模生产
- 16C32G：更稳

数据库：PostgreSQL 单实例即可。

Redis：缓存、额度、任务队列。

对象存储：语音文件、导出文件。

### 19.2 域名规划

```text
ainerspeak.com              官网
app.ainerspeak.com          H5 / 用户端
pc.ainerspeak.com           PC 用户端
admin.ainerspeak.com        管理后台
api.ainerspeak.com          后端 API
voice.ainerspeak.com        语音服务，可选
```

### 19.3 Docker Compose 目录结构

```text
ainerspeak/
├── backend/
├── frontend-h5/
├── frontend-pc/
├── admin-web/
├── nginx/
├── docker-compose.yml
├── .env
└── deploy/
```

---

## 20. 安全与稳定性设计

必须包含：

- JWT 登录
- Refresh Token
- 密码 Hash
- API Key 加密存储
- 管理员权限隔离
- 用户限流
- IP 限流
- AI 调用超时
- Provider 自动降级
- 日志记录
- 错误追踪
- 数据库备份
- 用户数据删除能力
- 敏感内容过滤
- 语音文件过期清理

---

## 21. MVP 开发阶段

### Phase 1：可上线 MVP

目标：能注册、能对话、能生成表达、能保存思想、能消消乐。

功能：

1. 用户注册登录
2. H5 首页
3. 思想对话文本版
4. 双语输出
5. 基础 / 口语 / 高级 / 书面表达
6. 语法提示
7. 表达卡片
8. Thought Freeze
9. 语法 Pattern 记录
10. 消消乐列表
11. 后台用户管理
12. 后台手动开通会员
13. LLM Provider 配置

### Phase 2：语音 MVP

1. ASR + LLM + TTS
2. 语音对话记录
3. 句子朗读
4. 跟读评分基础版
5. 语音用量限制

### Phase 3：Realtime Voice

1. OpenAI Realtime / Gemini Live 接入
2. WebRTC
3. 可打断对话
4. 实时语法 HUD
5. 高级语音分析

### Phase 4：PC 深度工作台

1. 长文编辑器
2. 思想版本管理
3. 导出
4. 知识图谱
5. 表达热力图

---

## 22. 推荐技术栈

### 后端

- FastAPI
- PostgreSQL
- Redis
- SQLAlchemy 2.x
- Alembic
- Pydantic
- Celery / RQ
- JWT
- Docker

### H5 / PC / Admin

- React
- Next.js 或 Vite
- TypeScript
- Tailwind CSS
- Zustand / Redux Toolkit
- TanStack Query
- WebRTC / WebSocket

### 部署

- Docker Compose
- Caddy 或 Nginx
- PostgreSQL volume
- Redis volume
- S3 compatible storage，可后期接入

---

## 23. 最终产品形态

AinerSpeak 最终应该是：

```text
AI Thought Partner
+ AI Expression Coach
+ AI Grammar Engine
+ AI Voice Coach
+ AI Personal Knowledge Base
+ AI Multilingual Learning System
```

用户打开它，不是为了完成课程，而是为了继续自己的思想、表达、规划、写作和成长。

语言学习在这个过程中自然发生。

---

## 24. 产品 Slogan

推荐：

> Build your thoughts. Master your expression.

中文：

> 打磨你的思想，掌握你的表达。

另一个版本：

> Think in your language. Grow in another.

中文：

> 用你的母语思考，在另一种语言中成长。

---

## 25. 第一版最小可落地结论

不要一开始做太大。

第一版只要完成：

1. H5 用户注册登录
2. 思想对话文本版
3. AI 双语表达生成
4. 语法提示和表达版本
5. Thought Freeze
6. 语法消消乐
7. 后台用户管理
8. 后台手动会员开通
9. LLM Provider 可插拔
10. ASR/TTS 预留接口

就已经可以内测。

实时语音可以第二阶段上线，但数据库、权限和 Provider 架构第一版必须预留好。

