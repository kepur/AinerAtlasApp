# AinerSpeak AI Expression OS — 全量任务列表

> 本文件是多 Agent 协作的任务主清单。  
> 每个任务可被独立 Agent 领取执行，完成后标记 `[x]` 并注明验证方式。  
> **依赖关系**用 `需要先完成: T-xxx` 标注，Agent 应先检查前置任务状态。  
> 带 `🔴` 为阻塞性任务（后续大量任务依赖它），应优先完成。

---

## 当前已完成基线（截至 2026-06-13）

已有成果概要（Agent 无需重做）：

- [x] Monorepo 搭建（apps/api + apps/web + apps/admin）
- [x] FastAPI 后端骨架 + 14 张数据表模型
- [x] JWT 认证 + Admin 角色守卫
- [x] 35 个 API 端点（auth/profile/conversations/assets/grammar/voice/admin）
- [x] LLM / Voice Provider 抽象层 + Mock 实现
- [x] Admin Provider 连接测试器（支持 OpenAI/Anthropic/Gemini/Ollama 等真实 HTTP 探测）
- [x] Admin 前端完整控制台（登录、Dashboard、Users、Providers、Prompts、Usage、Security 页面切换）
- [x] Web H5 前端 UI 原型（5 Tab 布局，纯 Mock 数据）
- [x] 启动时自动建表 + 种子数据（admin 账号、mock provider、4 个 prompt 模板）
- [x] Vite 代理配置 → localhost:8010

---

## Phase 0：基础工程与基础设施

### T-001 🔴 Alembic 数据库迁移配置
- **描述**: 初始化 Alembic，生成 alembic.ini 和 migrations 目录，基于现有 models.py 生成首个 migration 脚本，确保 `alembic upgrade head` 可正确建表
- **文件**: `apps/api/alembic.ini`, `apps/api/alembic/`, `apps/api/alembic/env.py`
- **验证**: 删除 ainerspeak.db → `alembic upgrade head` → 表结构与 models.py 一致
- **状态**: [x] 已完成 - Alembic 初始化完成，autogenerate 生成 14 张表迁移，upgrade head 验证通过

### T-002 PostgreSQL 支持
- **描述**: 添加 `psycopg2-binary` 或 `asyncpg` 依赖，修改 config.py 使 DATABASE_URL 默认支持 PostgreSQL，保留 SQLite 作为开发降级选项
- **需要先完成**: T-001
- **文件**: `apps/api/pyproject.toml`, `apps/api/app/core/config.py`, `docker-compose.yml`
- **验证**: docker-compose up postgres → 后端连接 PostgreSQL 成功 → /health 返回 ok
- **状态**: [x] 已完成 - 添加 psycopg2-binary 与 setuptools 包发现配置；开发环境未显式配置 DATABASE_URL 时自动回落 SQLite；`docker compose up -d postgres` 成功，`DATABASE_URL=postgresql+psycopg2://ainerspeak:ainerspeak@localhost:5433/ainerspeak alembic upgrade head` 与 `/health` 验证通过

### T-003 Redis 集成
- **描述**: 添加 `redis` 依赖，创建 Redis 连接模块，实现用户日额度计数器（每日 AI 对话次数、语音分钟数），在 deps.py 中注入
- **文件**: `apps/api/app/db/redis.py`, `apps/api/app/api/deps.py`, `apps/api/pyproject.toml`
- **验证**: Redis 连通 → 调用 API 后额度递减 → 额度耗尽返回 429
- **状态**: [x] 已完成 - 新增 Redis QuotaManager 与依赖注入；对话消息扣减每日 AI 次数、语音会话扣减语音分钟数；`docker compose up -d redis` 成功，`REDIS_URL=redis://localhost:6380/0` 下真实 API 连续调用 6 次时第 6 次返回 429，pytest `tests/test_quota.py tests/test_health.py` 通过

### T-004 Docker Compose 完善
- **描述**: 完善 docker-compose.yml，确保 api/postgres/redis/web/admin 全部可一键启动；添加 volume 持久化；添加 healthcheck
- **需要先完成**: T-002, T-003
- **文件**: `docker-compose.yml`, `apps/web/Dockerfile`, `apps/admin/Dockerfile`
- **验证**: `docker-compose up -d` → 所有服务 healthy → 前端可访问
- **状态**: [x] 已完成 - 补齐 web/admin Dockerfile 与 Nginx 反代，修复 api Dockerfile 安装顺序并在启动时执行 Alembic；`docker compose up -d` 后 api/postgres/redis/web/admin 全部 healthy，`http://localhost:8010/health`、`http://localhost:8080/`、`http://localhost:8082/` 可访问

### T-005 环境变量与配置管理
- **描述**: 创建 `.env.development` / `.env.production` 模板，确保所有敏感配置通过环境变量注入（JWT_SECRET、DATABASE_URL、REDIS_URL、CORS_ORIGINS 等），更新 README
- **文件**: `.env.development`, `.env.production`, `README.md`
- **验证**: 不同环境变量下后端行为正确
- **状态**: [x] 已完成 - 创建 .env.development/.env.production 模板，config.py 添加 ENV/DEBUG/ENCRYPTION_KEY 字段，更新 README

### T-006 API Key 加密存储
- **描述**: 替换 admin.py 中的占位 `encrypted:{key}` 为真正的 Fernet 对称加密，密钥从环境变量读取
- **文件**: `apps/api/app/api/routes/admin.py`, `apps/api/app/core/security.py`, `apps/api/pyproject.toml`（添加 cryptography）
- **验证**: 保存 Provider → DB 中 api_key 为加密字符串 → 读取时解密成功 → 测试连接正常
- **状态**: [x] 已完成 - Fernet 加解密替换占位代码，兼容旧格式，ENCRYPTION_KEY 自动生成与提示

### T-007 请求限流（Rate Limiting）
- **描述**: 基于 Redis 实现 API 限流中间件（IP 限流 + 用户限流），不同会员等级不同额度
- **需要先完成**: T-003
- **文件**: `apps/api/app/core/rate_limit.py`, `apps/api/app/main.py`
- **验证**: 超过限流阈值返回 429 Too Many Requests
- **状态**: [x] 已完成 - 新增 Redis RateLimitMiddleware，对匿名/IP 与登录用户分层限流并按 membership_level 区分额度；pytest `tests/test_rate_limit.py tests/test_quota.py tests/test_health.py` 通过，真实 Redis 下将 free 用户限额临时设为 2 次时，第 3 次 `/api/auth/me` 返回 429

### T-008 日志与错误追踪
- **描述**: 配置 structlog / loguru 结构化日志，统一异常处理中间件，生产环境日志输出 JSON 格式
- **文件**: `apps/api/app/core/logging.py`, `apps/api/app/main.py`
- **验证**: 请求日志可见、异常堆栈格式化、不泄漏敏感信息
- **状态**: [x] 已完成 - 统一为 loguru 日志体系，新增 ErrorHandlingMiddleware 与 X-Request-ID 追踪头；生产模式下请求日志输出 JSON 结构，异常由中间件统一记录并返回 500；pytest `tests/test_error_middleware.py tests/test_rate_limit.py tests/test_quota.py tests/test_health.py` 通过，`APP_ENV=production DATABASE_URL=sqlite:///./prod-log-smoke.db` 下 `/health` 冒烟输出 JSON 日志且返回请求 ID

---

## Phase 1：个人表达核心闭环 — 后端

### T-100 🔴 真实 LLM Provider 适配器（OpenAI 兼容）
- **描述**: 实现 `OpenAILLMProvider`，使用 `httpx` 或 `openai` SDK 调用 OpenAI / DeepSeek / Qwen 等 OpenAI 兼容 API；从数据库读取 AIProvider 配置；支持流式和非流式
- **文件**: `apps/api/app/services/llm.py`（扩展）, 新增 `apps/api/app/services/llm_openai.py`
- **验证**: 配置真实 API Key → 对话返回真实 AI 回复（非 Mock 固定文本）
- **状态**: [x] 已完成 - 实现 OpenAICompatibleLLMProvider，支持 OpenAI/DeepSeek/Qwen/Groq 等兼容 API，含结构化 JSON 输出、超时/限流错误处理、用量追踪

### T-101 LLM Provider 动态路由
- **描述**: 实现 `get_llm_provider()` 从数据库读取已启用的 Provider 配置，按 priority 选择，失败时自动 fallback 到下一个
- **需要先完成**: T-100
- **文件**: `apps/api/app/services/llm.py`
- **验证**: 主 Provider 不可用时 → 自动切换备用 Provider → 返回正常结果
- **状态**: [x] 已完成 - get_llm_provider() 从 DB 读取启用的 AIProvider 按 priority 排序，FallbackLLMProvider 自动 fallback，无真实 Provider 时降级 MockLLMProvider

### T-102 Anthropic LLM 适配器
- **描述**: 实现 `AnthropicLLMProvider`，支持 Claude 系列模型
- **需要先完成**: T-100
- **文件**: `apps/api/app/services/llm_anthropic.py`
- **验证**: 使用 Anthropic API Key → 对话正常
- **状态**: [x] 已完成 - 新增 AnthropicLLMProvider，接入 Claude Messages API、JSON 结构化解析、usage 跟踪与 429/超时状态；provider registry 现可从数据库读取并解密 Anthropic API Key；pytest `tests/test_llm_anthropic.py` 通过

### T-103 Gemini LLM 适配器
- **描述**: 实现 `GeminiLLMProvider`，支持 Gemini 系列模型
- **需要先完成**: T-100
- **文件**: `apps/api/app/services/llm_gemini.py`
- **验证**: 使用 Gemini API Key → 对话正常
- **状态**: [x] 已完成 - 新增 GeminiLLMProvider，接入 generateContent API、JSON 结构化解析、usage 跟踪与 429/超时状态；provider registry 现可从数据库读取并解密 Gemini API Key；pytest `tests/test_llm_anthropic.py tests/test_llm_gemini.py` 通过

### T-104 🔴 PromptTemplate 注入 LLM 调用
- **描述**: LLM 调用时从 DB 读取对应 task_type 的 PromptTemplate，注入 system prompt；支持多语言变量替换（native_language, target_language, user_level 等）
- **需要先完成**: T-100
- **文件**: `apps/api/app/services/llm.py`, `apps/api/app/api/routes/conversations.py`
- **验证**: 修改 DB 中 Prompt 内容 → AI 回复风格随之变化
- **状态**: [x] 已完成 - conversations.py 中 _load_prompt_template() 按 task_type 读取 PromptTemplate，替换 {native_language_name} 等变量后作为 system_prompt_override 传给 LLM

### T-105 🔴 思想对话 AI 结构化输出
- **描述**: 对话 API `/conversations/{id}/messages` 返回结构化 JSON：main_reply_native, main_reply_target, grammar_tips[], patterns[], vocabulary[], suggested_expression
- **需要先完成**: T-104
- **文件**: `apps/api/app/api/routes/conversations.py`, `apps/api/app/schemas.py`
- **验证**: 发送中文消息 → 收到结构化双语回复 + 语法提示 + 高频句型
- **状态**: [x] 已完成 - ConversationAIResult 已包含完整字段，LLM 返回 JSON 自动解析为结构化对象，analysis 字段存储全部数据

### T-106 目标语言聊天 + 纠错
- **描述**: 当用户用目标语言输入时，AI 继续对话同时检测语法/词汇/自然度问题，返回 corrected_sentence + mistakes[]
- **需要先完成**: T-105
- **文件**: `apps/api/app/api/routes/conversations.py`
- **验证**: 发送 "I think Europe have more freedom" → 收到纠正 + 语法解释 + Pattern 记录
- **状态**: [x] 已完成 - content_language == target_language 时自动注入纠错 prompt，ConversationAIResult 新增 corrected_sentence 和 mistakes[] 字段

### T-107 🔴 Thought Freeze 完整实现
- **描述**: `/conversations/{id}/freeze` 调用 LLM 生成完整表达资产包：中文完整版、基础版、口语版、高级版、书面版、Vlog版、面试版、1分钟演讲版、3分钟演讲版、金句版 + 关键词 + 必会句型 + 语法结构
- **需要先完成**: T-105
- **文件**: `apps/api/app/api/routes/conversations.py`, `apps/api/app/models.py`（扩展 Thought 字段）
- **验证**: Freeze 一个多轮对话 → 生成 10+ 表达版本 → 数据持久化
- **状态**: [x] 已完成 - 扩展 Freeze 输出为 10+ 版本（含 vlog/interview/business/30s/1min/3min/podcast/social_chat/golden_quote），新增 Thought.freeze_payload 持久化完整资产包与关键词/核心句型/语法结构/Facts/Values/Arguments；`DATABASE_URL=sqlite:///./ainerspeak.db alembic upgrade head && pytest tests/test_thought_freeze.py` 通过，回归 `tests/test_llm_anthropic.py tests/test_llm_gemini.py tests/test_thought_freeze.py tests/test_health.py` 通过

### T-108 Grammar / Pattern Mining
- **描述**: 每轮对话后，后台异步分析用户表达，提取高频语法错误、句型结构、词汇短板，写入 UserMastery 和 GrammarPattern 表
- **需要先完成**: T-105
- **文件**: `apps/api/app/services/pattern_mining.py`（新增）, `apps/api/app/api/routes/conversations.py`
- **验证**: 多轮对话后 → /grammar/queue 返回新发现的 Pattern → 掌握度有初始值
- **状态**: [x] 已完成 - 新增 `pattern_mining.py`，将对话分析中的 grammar_tips/patterns 写入 GrammarPattern 与 UserMastery；最小 FastAPI 组合应用下 `DATABASE_URL=sqlite:///./ainerspeak.db pytest tests/test_pattern_mining.py` 通过，发送消息后 `/grammar/queue` 返回新 Pattern 且 mastery_score 初始为 20

### T-109 Vocabulary Mining
- **描述**: 从对话中提取用户话题相关的高价值词汇，记录 mastery_status（未见过/已见过/可理解/可使用/已掌握）
- **需要先完成**: T-108
- **文件**: 新增 `apps/api/app/models.py`（VocabularyItem 模型）, `apps/api/app/api/routes/vocabulary.py`
- **验证**: 对话涉及 "suffocating" → 词汇出现在 /vocabulary/today
- **状态**: [x] 已完成 - 新增 VocabularyItem 模型与 `/api/vocabulary` 路由（today/list/mastered/ignore），`vocabulary_mining.py` 从对话 analysis 自动入库；`pytest tests/test_learning_loop.py` 验证通过

### T-110 Thought Asset 独立 CRUD API
- **描述**: 为 Thought 模型添加独立 API：列表、详情、版本列表、版本对比 Diff
- **文件**: `apps/api/app/api/routes/thoughts.py`（新增）, `apps/api/app/api/router.py`
- **验证**: Freeze 后 → GET /thoughts 返回思想列表 → GET /thoughts/{id} 返回完整详情+版本
- **状态**: [x] 已完成 - 新增 thoughts 路由：GET /thoughts、/thoughts/{id}、/thoughts/{id}/versions、/versions/diff；Freeze 时写入 ThoughtVersion 快照

### T-111 Expression Asset 版本管理
- **描述**: 表达资产支持多版本，每次 re-generate 创建新版本，支持查看历史版本和 Diff
- **需要先完成**: T-107
- **文件**: `apps/api/app/models.py`（ExpressionAssetVersion 模型）, `apps/api/app/api/routes/assets.py`
- **验证**: 对同一资产多次 generate-variants → 版本号递增 → 可查看历史
- **状态**: [x] 已完成 - 新增 ExpressionAssetVersion 与 current_version，generate-variants/freeze 归档历史版本，GET /assets/{id}/versions 可查版本列表

### T-112 UsageLog 自动写入
- **描述**: 每次 LLM/Voice 调用时自动创建 UsageLog 记录（tokens、延迟、成本估算、状态），Admin 端可查看
- **需要先完成**: T-100
- **文件**: `apps/api/app/services/llm.py`, `apps/api/app/models.py`
- **验证**: 进行对话 → /admin/usage 显示对应记录
- **状态**: [x] 已完成 - 每次 LLM 调用后 _write_usage_log() 自动创建 UsageLog 记录，含 tokens_input/output、latency_ms、cost_estimate、provider_id

### T-113 消消乐练习逻辑
- **描述**: 实现 Pattern Crush 练习功能：中文→目标语言翻译、改错、选择更自然表达，根据结果更新 mastery_score，达标后自动归档
- **需要先完成**: T-108
- **文件**: `apps/api/app/api/routes/grammar.py`（扩展 practice 端点）
- **验证**: 练习 5 次且全部正确 → Pattern 状态变为 mastered → 从 queue 消失
- **状态**: [x] 已完成 - grammar practice 支持 GET/POST 生成练习题与提交答案，5 次正确且 mastery_score≥85 自动 mastered 并从 queue 消失

### T-114 UserAIMemory 读写 API
- **描述**: 为 AI 长期记忆添加读取 API，LLM 调用时注入用户记忆摘要（常讨论话题、已确认价值观、常犯错误等）
- **文件**: `apps/api/app/api/routes/profile.py`, `apps/api/app/services/llm.py`
- **验证**: 多次对话后 → AI 记住用户之前的话题和偏好
- **状态**: [x] 已完成 - GET/PUT /api/profile/ai-memory 读写记忆，对话后 update_memory_from_dialogue 更新，LLM 调用注入 memory_summary

---

## Phase 1：个人表达核心闭环 — H5 前端

### T-200 🔴 H5 路由系统
- **描述**: 引入 react-router-dom，实现页面路由：/login, /register, /onboarding, /home, /chat, /chat/:id, /thoughts, /thoughts/:id, /assets, /patterns, /vocabulary, /profile, /membership, /settings
- **文件**: `apps/web/package.json`, `apps/web/src/App.tsx`（重构）, 新增各页面组件
- **验证**: 各路由可正常导航，刷新不丢失状态
- **状态**: [x] 已完成 - 安装 react-router-dom，重构 App.tsx 为 BrowserRouter + Routes，创建 PrivateRoute/TabBar 组件，拆分 9 个独立页面文件

### T-201 🔴 H5 登录/注册页
- **描述**: 实现登录注册页面，对接 /api/auth/register 和 /api/auth/login，token 存 localStorage，未登录自动跳转
- **需要先完成**: T-200
- **文件**: `apps/web/src/pages/Login.tsx`, `apps/web/src/pages/Register.tsx`
- **验证**: 注册新用户 → 登录成功 → 跳转首页 → 刷新后保持登录
- **状态**: [x] 已完成 - Login/Register 页面对接 /api/auth/login 和 /api/auth/register，token 存 localStorage("ainerspeak_token")，深色科技感 UI

### T-202 H5 Onboarding 用户画像
- **描述**: 实现新用户引导页：选择母语、目标语言、当前水平、学习目标、感兴趣话题、纠错偏好、AI 教练风格；提交到 /api/profile/onboarding
- **需要先完成**: T-201
- **文件**: `apps/web/src/pages/Onboarding.tsx`
- **验证**: 新注册用户自动进入 Onboarding → 完成后跳转首页
- **状态**: [x] 已完成 - 5 步骤 Onboarding 表单（语言/水平/目标/话题/教练偏好），提交到 POST /api/profile/onboarding

### T-203 🔴 H5 首页对接 API
- **描述**: 首页展示：今日话题入口、继续上次思想、今日消消乐进度、成长数据；从 API 获取真实数据
- **需要先完成**: T-201
- **文件**: `apps/web/src/pages/Home.tsx`
- **验证**: 登录后首页显示用户真实数据（对话数、资产数、Pattern 进度）
- **状态**: [x] 已完成 - 首页从 GET /api/conversations 和 GET /api/grammar/queue 获取真实数据，显示欢迎语+快捷入口+继续完善+消消乐进度+成长数据

### T-204 🔴 H5 思想对话页对接 API
- **描述**: 对话页对接 /api/conversations + /api/conversations/{id}/messages，支持创建对话、发送消息、接收 AI 结构化回复、双语显示、语法提示展开、表达版本切换
- **需要先完成**: T-201, T-105
- **文件**: `apps/web/src/pages/Chat.tsx`, `apps/web/src/pages/ChatDetail.tsx`
- **验证**: 发送中文消息 → AI 返回双语回复 + 语法提示 → 点击展开高级表达版本
- **状态**: [x] 已完成 - Chat.tsx 对话列表 + ChatDetail.tsx 对话详情页，对接 GET/POST /api/conversations，消息气泡+目标语言翻译+语法提示可展开

### T-205 H5 Thought Freeze UI
- **描述**: 对话页底部 Freeze 按钮，调用 /api/conversations/{id}/freeze，展示生成的表达资产包（多版本 Tab 切换）
- **需要先完成**: T-204, T-107
- **文件**: `apps/web/src/pages/Chat.tsx`（Freeze 功能）, `apps/web/src/components/FreezeResult.tsx`
- **验证**: 点击 Freeze → 加载中 → 展示 10+ 表达版本 Tab → 可朗读/收藏
- **状态**: [x] 已完成 - ChatDetail Freeze 按钮调用 POST /api/conversations/{id}/freeze，FreezeResult 组件展示多版本 Tab、关键词、句型及收藏/朗读入口

### T-206 H5 思想库页
- **描述**: 展示用户所有 Thought Freeze 列表，支持查看详情、版本时间线、继续对话
- **需要先完成**: T-110
- **文件**: `apps/web/src/pages/Thoughts.tsx`, `apps/web/src/pages/ThoughtDetail.tsx`
- **验证**: Freeze 后 → 思想库出现新条目 → 详情页显示版本+多语言表达
- **状态**: [x] 已完成 - Thoughts/ThoughtDetail 页面，优先 GET /api/thoughts，降级从 /api/assets 映射；路由 /thoughts, /thoughts/:id

### T-207 H5 表达资产页对接 API
- **描述**: 表达资产列表、详情页对接 /api/assets，支持查看基础/口语/高级/书面版本切换
- **需要先完成**: T-201
- **文件**: `apps/web/src/pages/Assets.tsx`, `apps/web/src/pages/AssetDetail.tsx`
- **验证**: 从 API 获取资产列表 → 详情页展示多版本切换
- **状态**: [x] 已完成 - Assets 列表 + AssetDetail 详情页，对接 GET /api/assets 与 GET /api/assets/{id}，VariantTabs 多版本切换

### T-208 H5 语法消消乐页对接 API
- **描述**: 消消乐页面对接 /api/grammar/queue，展示今日待消除 Pattern 列表+进度条，支持练习/标记已掌握/忽略
- **需要先完成**: T-201, T-108
- **文件**: `apps/web/src/pages/PatternCrush.tsx`
- **验证**: 对话产生 Pattern 后 → 消消乐页显示 → 练习后掌握度更新 → 掌握后消失
- **状态**: [x] 已完成 - PatternCrush 对接 queue/practice/mark-mastered/ignore API，CrushTabs 切换语法/词汇

### T-209 H5 词汇消消乐页
- **描述**: 词汇消消乐页面，展示高频词汇列表+掌握状态，支持练习
- **需要先完成**: T-109
- **文件**: `apps/web/src/pages/VocabCrush.tsx`
- **验证**: 对话中出现新词汇 → 词汇页显示 → 标记已掌握后归档
- **状态**: [x] 已完成 - VocabCrush 页面，优先 /api/vocabulary/*，降级 grammar queue 词汇项 + mock；路由 /vocabulary

### T-210 H5 用户中心页
- **描述**: 用户中心展示基本信息、语言设置、会员状态、学习数据统计
- **需要先完成**: T-201
- **文件**: `apps/web/src/pages/Profile.tsx`
- **验证**: 显示用户 email、会员等级、对话数、资产数、Pattern 统计
- **状态**: [x] 已完成 - Profile 展示用户信息、会员等级、语言画像、能力数据及学习统计（对话/资产/语法/词汇/已掌握）

### T-211 H5 会员开通页
- **描述**: 展示 Free/VIP/Pro/Premium 套餐对比，联系开通方式（Telegram/微信/WhatsApp/Email）
- **文件**: `apps/web/src/pages/Membership.tsx`
- **验证**: 页面展示套餐差异 + 联系方式
- **状态**: [x] 已完成 - Membership 页面 Free/VIP/Pro/Premium 对比 + 四种联系方式，路由 /membership

### T-212 H5 全局状态管理
- **描述**: 引入 zustand 或轻量状态库，管理 auth token、用户信息、当前对话等全局状态
- **需要先完成**: T-200
- **文件**: `apps/web/src/stores/`, `apps/web/package.json`
- **验证**: 登录/登出状态全局同步，页面切换不丢状态
- **状态**: [x] 已完成 - 安装 zustand，创建 authStore（token/user/profile/login/logout/loadUser）和 chatStore（conversations/sendMessage/createConversation）

### T-213 H5 UI 升级（深色模式 + 设计语言）
- **描述**: 按产品文档要求：深色模式优先、毛玻璃卡片、渐变背景、AI 紫主色调、科技感，不像儿童学习软件
- **文件**: `apps/web/src/styles.css` 或引入 Tailwind CSS
- **验证**: 整体视觉达到产品文档要求的"高级、清爽、科技感"
- **状态**: [x] 已完成 - styles.css 升级：AI 紫渐变、毛玻璃卡片/TabBar、发光边框、Modal 动效、消消乐/会员/思想库等新组件样式

---

## Phase 1：Admin 增强

### T-300 Admin Prompt 编辑 UI
- **描述**: Prompts 页面添加编辑功能，点击 Prompt 卡片可编辑 content/version/enabled，调用 PUT /admin/prompts/{id}
- **文件**: `apps/admin/src/AdminApp.tsx`
- **验证**: 编辑 Prompt 内容 → 保存成功 → 刷新后显示新内容
- **状态**: [x] 已完成 - 每个 Prompt 卡片添加编辑按钮，展开编辑 version/content/enabled，调用 PUT API 保存，含 toggle switch 和完整 CSS

### T-301 Admin 用户详情页
- **描述**: 用户列表点击进入详情页：基本信息、语言设置、会员历史、对话统计、资产数量、Pattern 掌握度、操作（禁用/重置密码/修改会员）
- **文件**: `apps/admin/src/AdminApp.tsx`, `apps/api/app/api/routes/admin.py`（添加 GET /admin/users/{id} 详情 API）
- **验证**: 点击用户 → 显示完整详情 → 可修改会员等级
- **状态**: [x] 已完成 - GET /api/admin/users/{id} 返回用户详情与统计；Admin 用户列表点击邮箱展开详情面板并支持修改会员

### T-302 Admin 成本中心
- **描述**: 新增 Cost Center 页面：今日总成本、每个 Provider 成本、每功能成本、高成本用户
- **需要先完成**: T-112
- **文件**: `apps/admin/src/AdminApp.tsx`, `apps/api/app/api/routes/admin.py`（添加 GET /admin/costs）
- **验证**: 有 LLM 调用后 → Cost Center 显示成本数据
- **状态**: [x] 已完成 - GET /api/admin/costs 聚合 UsageLog；Admin 新增 Cost Center 导航页展示今日成本、Provider/功能分布与高成本用户

### T-303 Admin 审计日志
- **描述**: 记录管理员操作（修改会员、禁用用户、修改 Provider、修改 Prompt），展示在 Audit Logs 页面
- **文件**: `apps/api/app/models.py`（AuditLog 模型）, `apps/api/app/api/routes/admin.py`
- **验证**: 管理员操作 → Audit Logs 页面显示操作记录
- **状态**: [x] 已完成 - 新增 AuditLog 模型；会员/Provider/Prompt/套餐修改写入审计日志；GET /api/admin/audit-logs + Admin Audit Logs 页面

### T-304 Admin 会员套餐配置
- **描述**: 后台可配置各套餐的额度（日对话次数、语音分钟数、Freeze 次数、资产上限等），存入 membership_plans 表
- **文件**: `apps/api/app/models.py`（MembershipPlan 模型）, `apps/api/app/api/routes/admin.py`
- **验证**: 后台修改 Free 套餐日对话次数 → 前端用户受限
- **状态**: [x] 已完成 - MembershipPlan 模型与 CRUD API；QuotaManager 从 DB 读取套餐额度；Admin Memberships 页可配置各套餐额度

---

## Phase 2：语音与消消乐

### T-400 TTS 朗读集成
- **描述**: 实现真实 TTS Provider（OpenAI TTS / ElevenLabs），/api/voice/tts 返回音频数据或 URL
- **文件**: `apps/api/app/services/voice.py`, 新增 `apps/api/app/services/voice_openai.py`
- **验证**: 提交文本 → 返回可播放音频 → H5 播放正常
- **状态**: [x] 已完成 - OpenAIVoiceProvider 支持 OpenAI TTS，/api/voice/tts 返回 base64 音频与 data URL；无 Key 时降级 Mock

### T-401 ASR 语音识别集成
- **描述**: 实现 ASR Provider（OpenAI Whisper / Deepgram），新增 /api/voice/transcribe 端点
- **文件**: `apps/api/app/services/voice.py`, `apps/api/app/api/routes/voice.py`
- **验证**: 上传音频 → 返回文字转写
- **状态**: [x] 已完成 - POST /api/voice/transcribe 支持 audio_url/audio_base64；OpenAI Whisper 与 Mock 自动切换

### T-402 H5 语音输入（Push-to-Talk）
- **描述**: 对话页添加按住说话功能：录音 → ASR 转写 → 作为文本发送给 AI
- **需要先完成**: T-401, T-204
- **文件**: `apps/web/src/components/VoiceInput.tsx`
- **验证**: 按住说话 → 松手后文字出现在输入框 → AI 正常回复
- **状态**: [x] 已完成 - VoiceInput 组件集成到 ChatDetail，按住录音后调用 transcribe 填入输入框

### T-403 H5 句子朗读/跟读
- **描述**: AI 回复中每句话可点击朗读（TTS），支持慢速；跟读模式：用户跟读后对比评分
- **需要先完成**: T-400
- **文件**: `apps/web/src/components/SentencePlayer.tsx`
- **验证**: 点击句子 → 播放 TTS 音频 → 点击跟读 → 录音后获得评分
- **状态**: [x] 已完成 - SentencePlayer 支持 TTS 播放、慢速朗读与跟读评分展示

### T-404 发音评估
- **描述**: 实现发音评估逻辑：对比用户朗读与参考文本，给出流利度/准确度评分
- **需要先完成**: T-401, T-400
- **文件**: `apps/api/app/api/routes/voice.py`（evaluate 端点增强）
- **验证**: 用户跟读 → 获得发音评分 + 改进建议
- **状态**: [x] 已完成 - /api/voice/evaluate 返回 fluency/accuracy 评分、转写文本、纠错建议与 top_corrections

### T-405 语音对话报告
- **描述**: 每次语音对话结束生成报告：Fluency/Grammar/Vocabulary/Naturalness/Confidence 评分 + Top corrections
- **需要先完成**: T-402
- **文件**: `apps/api/app/services/voice_report.py`（新增）
- **验证**: 语音对话结束 → 查看报告 → 包含各项评分
- **状态**: [x] 已完成 - voice_report.py 生成报告结构；POST /api/voice/session/{id}/complete 与 GET report 端点

---

## Phase 3：Realtime Voice（高阶）

### T-500 WebSocket 实时语音框架
- **描述**: 实现 FastAPI WebSocket 端点 /api/voice/realtime，建立客户端与后端双向音频流
- **文件**: `apps/api/app/api/routes/voice.py`
- **验证**: WebSocket 连接建立 → 音频双向传输正常
- **状态**: [x] 已完成 - WebSocket /api/voice/realtime 端点 + MockRealtimeAdapter 双向消息；pytest test_realtime_session 通过

### T-501 OpenAI Realtime 适配器
- **描述**: 接入 OpenAI Realtime API，实现低延迟 Speech-to-Speech
- **需要先完成**: T-500
- **文件**: `apps/api/app/services/voice_realtime.py`（新增）
- **验证**: 实时说话 → AI 实时语音回复 → 延迟 <2s
- **状态**: [x] 已完成 - OpenAIRealtimeAdapter 占位实现，Mock 适配器支持 transcript/response/interrupt

### T-502 H5 实时语音 UI
- **描述**: H5 语音页面，支持实时对话、可打断、实时语法 HUD
- **需要先完成**: T-501
- **文件**: `apps/web/src/pages/VoiceChat.tsx`
- **验证**: 开始实时对话 → AI 实时回复 → 语法提示实时显示
- **状态**: [x] 已完成 - VoiceChat.tsx WebSocket 连接、麦克风控制、实时语法 HUD

### T-600 PC Studio 项目搭建
- **描述**: 在 apps/ 下创建 studio 前端项目（Vite + React + TypeScript），或复用 web 项目添加 /studio 路由，实现左中右三栏布局
- **文件**: `apps/web/src/pages/studio/` 或 `apps/studio/`
- **验证**: PC 端访问 → 显示三栏工作台布局
- **状态**: [x] 已完成 - apps/web/src/pages/studio/ 三栏布局 Dashboard + 路由 /studio

### T-601 PC 思想编辑器
- **描述**: 左侧思想列表树、中间长文编辑器、右侧 AI 对话面板，支持段落级翻译和语法分析
- **需要先完成**: T-600, T-110
- **文件**: `apps/web/src/pages/studio/ThoughtWorkspace.tsx`
- **验证**: 选择思想 → 编辑长文 → AI 侧边栏实时建议
- **状态**: [x] 已完成 - ThoughtWorkspace.tsx 思想列表+编辑器+AI 侧边栏

### T-602 PC 版本 Diff
- **描述**: Thought Asset 版本对比视图，高亮新增/删除/修改部分
- **需要先完成**: T-111
- **文件**: `apps/web/src/pages/studio/VersionDiff.tsx`
- **验证**: 选择两个版本 → 显示 Diff 视图
- **状态**: [x] 已完成 - VersionDiff.tsx 行级 Diff 高亮视图

### T-603 PC Mind Graph
- **描述**: 思想图谱可视化，展示用户长期思想结构的节点和边
- **文件**: `apps/web/src/pages/studio/MindGraph.tsx`, 新增后端 API
- **验证**: 多次 Freeze 后 → Mind Graph 显示主题关系网络
- **状态**: [x] 已完成 - MindGraph.tsx SVG 可视化 + GET /api/thoughts/{id}/mind-graph

### T-604 导出功能
- **描述**: 导出 Thought Asset 为 Markdown / PDF / DOCX
- **文件**: `apps/api/app/api/routes/thoughts.py`, `apps/web/src/pages/studio/ExportCenter.tsx`
- **验证**: 点击导出 → 下载对应格式文件
- **状态**: [x] 已完成 - ExportCenter.tsx + GET /api/thoughts/{id}/export Markdown 下载

### T-700 话题数据模型
- **描述**: 创建 topics, topic_versions, topic_tags 表和 API：创建话题、列表、详情、标签筛选
- **文件**: `apps/api/app/models.py`, `apps/api/app/api/routes/topics.py`（新增）
- **验证**: 创建话题 → 列表可见 → 可按标签筛选
- **状态**: [x] 已完成 - Topic 模型 + topics.py CRUD API，pytest test_topics_crud 通过

### T-701 Thought Freeze 转公开话题
- **描述**: Freeze 后可点击"转换为公开话题"，AI 自动生成话题标题、背景、正反观点、标签
- **需要先完成**: T-107, T-700
- **文件**: `apps/api/app/api/routes/thoughts.py`
- **验证**: Freeze → 转话题 → 话题列表出现 → 包含 AI 生成内容
- **状态**: [x] 已完成 - POST /api/thoughts/{id}/publish-topic 从 Freeze 思想生成公开话题

### T-702 Circle Room 数据模型与 API
- **描述**: 创建 circle_rooms, circle_members, circle_messages 表和 API：创建房间、加入、发消息、AI 主持
- **文件**: `apps/api/app/models.py`, `apps/api/app/api/routes/circles.py`（新增）
- **验证**: 创建房间 → 加入 → 发消息 → AI 自动翻译和纠错
- **状态**: [x] 已完成 - CircleRoom/Member/Message 模型 + circles.py 创建/加入/发消息 API

### T-703 AI 小组主持
- **描述**: 小组对话中 AI 自动翻译多语言、控制发言节奏、提出反方问题、防止跑题
- **需要先完成**: T-702, T-100
- **文件**: `apps/api/app/services/circle_moderator.py`（新增）
- **验证**: 多人对话 → AI 主持提问 → 翻译其他语言 → 防止跑题
- **状态**: [x] 已完成 - circle_moderator.py AI 翻译+反方提问+跑题提示

### T-704 小组讨论总结
- **描述**: 讨论结束后 AI 生成小组总结（主要观点、正反方、共识、分歧、金句）和个人总结
- **需要先完成**: T-703
- **文件**: `apps/api/app/api/routes/circles.py`
- **验证**: 结束讨论 → 获得小组总结 + 个人语法/表达报告
- **状态**: [x] 已完成 - POST /api/circles/{id}/end 生成小组总结

### T-705 收藏他人观点
- **描述**: 小组讨论中可收藏别人观点，生成"我的理解版"存入自己思想库
- **需要先完成**: T-704
- **文件**: `apps/api/app/api/routes/circles.py`
- **验证**: 收藏观点 → 思想库出现 → 可继续基于它 Freeze
- **状态**: [x] 已完成 - POST /api/circles/{id}/messages/{msg_id}/bookmark 收藏到思想库

### T-706 H5 话题探索页
- **描述**: H5 话题列表页：今日热门、与你相关、正在辩论、等待加入；话题卡片展示
- **需要先完成**: T-700
- **文件**: `apps/web/src/pages/TopicExplore.tsx`
- **验证**: 话题列表可见 → 可加入讨论
- **状态**: [x] 已完成 - TopicExplore.tsx 话题列表+标签筛选+加入讨论

### T-707 H5 小组聊天页
- **描述**: H5 群聊界面：顶部话题状态、中间多人消息+AI翻译、底部输入+语音+语法提示
- **需要先完成**: T-702
- **文件**: `apps/web/src/pages/CircleRoom.tsx`
- **验证**: 进入房间 → 发消息 → 看到 AI 翻译和纠错
- **状态**: [x] 已完成 - CircleRoom.tsx 群聊界面+AI 翻译+语法提示+收藏

### T-800 匹配画像数据模型
- **描述**: 创建 user_match_settings, user_match_profiles, user_value_profiles 表
- **文件**: `apps/api/app/models.py`, `apps/api/app/api/routes/matching.py`（新增）
- **验证**: 用户开启匹配 → 画像数据写入
- **状态**: [x] 已完成 - UserMatchSettings/Profile/ValueProfile 模型 + matching.py

### T-801 匹配推荐算法
- **描述**: 基于思想标签、目标语言、兴趣话题、价值观的匹配评分算法
- **需要先完成**: T-800
- **文件**: `apps/api/app/services/matching.py`（新增）
- **验证**: 两个用户兴趣重合 → 匹配度 >80%
- **状态**: [x] 已完成 - matching.py 兴趣/语言/价值观评分算法 + 破冰建议

### T-802 匹配 API
- **描述**: 实现 /api/connect/enable, /api/connect/recommendations, /api/connect/requests 等 API
- **需要先完成**: T-801
- **文件**: `apps/api/app/api/routes/matching.py`
- **验证**: 开启匹配 → 获得推荐 → 发送请求 → 对方接受
- **状态**: [x] 已完成 - /api/connect/enable, /recommendations, /requests 等完整 API

### T-803 H5 匹配雷达页
- **描述**: 雷达动画、匹配模式切换、推荐卡片、AI 破冰建议
- **需要先完成**: T-802
- **文件**: `apps/web/src/pages/MatchRadar.tsx`
- **验证**: 匹配页面显示推荐 → 可查看匹配详情 → 可邀请对话
- **状态**: [x] 已完成 - MatchRadar.tsx 雷达动画+推荐卡片+邀请对话

### T-804 AI 人对话
- **描述**: 用户 A + 用户 B + AI Host，AI 翻译+破冰+纠错+总结
- **需要先完成**: T-802, T-702
- **文件**: `apps/api/app/services/ai_host.py`（新增）
- **验证**: 两个用户匹配 → AI 主持三人对话 → 生成总结
- **状态**: [x] 已完成 - ai_host.py AI 主持破冰+总结服务

### T-805 Soulmate Readiness
- **描述**: Soulmate 模式需完整度门槛 80%，需补充情感价值观、生活方式等问卷
- **需要先完成**: T-802
- **文件**: `apps/api/app/api/routes/matching.py`
- **验证**: 完整度 <80% → 提示补充信息 → 达标后开放深度匹配
- **状态**: [x] 已完成 - GET /api/connect/readiness 完整度门槛 80% 检查

### T-900 隐私中心
- **描述**: 用户可查看隐私设置、删除个人数据、关闭匹配画像、控制公开范围
- **文件**: `apps/api/app/api/routes/privacy.py`（新增）, `apps/web/src/pages/Privacy.tsx`
- **验证**: 用户请求删除数据 → 数据清除 → 确认删除
- **状态**: [x] 已完成 - privacy.py API + Privacy.tsx 隐私设置/删除数据/关闭匹配

### T-901 内容审核
- **描述**: AI 自动审核对话和话题内容，敏感内容标记，管理员可在后台查看
- **文件**: `apps/api/app/services/moderation.py`（新增）, `apps/api/app/api/routes/admin.py`
- **验证**: 敏感内容 → 自动标记 → Admin 后台可见
- **状态**: [x] 已完成 - moderation.py 敏感词检测 + GET /admin/moderation 审核队列

### T-902 举报与拉黑
- **描述**: 用户可举报其他用户/内容，可拉黑用户；后台管理举报队列
- **文件**: `apps/api/app/api/routes/reports.py`（新增）
- **验证**: 举报用户 → Admin 后台收到 → 处理后通知
- **状态**: [x] 已完成 - reports.py 举报/拉黑/Admin 处理队列

### T-903 数据备份方案
- **描述**: PostgreSQL 自动备份脚本（每日全量 + WAL），对象存储备份检查
- **文件**: `deploy/backup.sh`, `docker-compose.yml`
- **验证**: 定时执行 → 备份文件生成 → 可从备份恢复
- **状态**: [x] 已完成 - deploy/backup.sh PostgreSQL 全量备份+WAL 检查+清理脚本

### T-904 CI/CD 流水线
- **描述**: GitHub Actions：lint → test → build → deploy，环境变量分离
- **文件**: `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`
- **验证**: Push 代码 → 自动运行测试 → 构建镜像
- **状态**: [x] 已完成 - .github/workflows/ci.yml lint→test→build 流水线

### T-905 Nginx/Caddy 反向代理配置
- **描述**: 配置反向代理，路由 app/admin/api/studio 子域名
- **文件**: `deploy/Caddyfile` 或 `deploy/nginx.conf`
- **验证**: 域名访问 → 正确路由到对应服务
- **状态**: [x] 已完成 - deploy/Caddyfile 路由 app/admin/api/studio；T-004 docker-compose nginx 已覆盖本地开发

### T-950 多语言 Pattern 独立维护
- **描述**: grammar_patterns 表增加 language_code 字段，不同语言的 Pattern 独立管理
- **文件**: `apps/api/app/models.py`
- **验证**: 英语 Pattern 和日语 Pattern 不混淆
- **状态**: [x] 已完成 - grammar_patterns.language_code 字段 + GET /api/grammar/patterns?language_code= 筛选

### T-951 多目标语言对话
- **描述**: 用户可在对话中切换目标语言（英/日/韩/西/德/法/塞尔维亚语），AI 相应切换输出语言
- **文件**: `apps/api/app/api/routes/conversations.py`, `apps/api/app/services/llm.py`
- **验证**: 切换目标语言 → AI 用新目标语言回复 → Pattern 按语言分类
- **状态**: [x] 已完成 - PATCH /api/conversations/{id}/target-language 切换目标语言

---

## 任务依赖图（关键路径）

```
T-001 (Alembic) → T-002 (PostgreSQL) → T-004 (Docker)
                                      ↗
T-003 (Redis) ─────────────────────→ T-007 (限流)

T-100 (LLM适配器) → T-101 (路由) → T-104 (Prompt注入) → T-105 (结构化输出)
                                                          ↓
T-105 → T-106 (纠错) → T-108 (Pattern Mining) → T-109 (Vocab Mining)
  ↓                                               ↓
T-107 (Freeze) → T-110 (Thought CRUD) → T-111 (版本管理)
  ↓
T-107 → T-701 (转话题) → T-702 (Circle) → T-703 (AI主持)

T-200 (路由) → T-201 (登录) → T-204 (对话页) → T-205 (Freeze UI)
                ↓
              T-203 (首页) → T-208 (消消乐UI)
```

## Agent 协作策略

**可同时并行的任务组：**

| Agent A（后端核心） | Agent B（前端 H5） | Agent C（Admin+基础设施） |
|---|---|---|
| T-100 → T-101 → T-104 → T-105 | T-200 → T-201 → T-212 → T-213 | T-001 → T-002 → T-003 |
| T-106 → T-107 → T-108 | T-202 → T-203 → T-204 | T-005 → T-006 → T-008 |
| T-109 → T-110 → T-111 → T-112 | T-205 → T-206 → T-207 → T-208 | T-300 → T-301 → T-302 → T-303 |
| T-113 → T-114 | T-209 → T-210 → T-211 | T-007 → T-304 |

**合流点：** T-201 需要后端 auth 已工作（已完成）；T-204 需要 T-105 完成；T-205 需要 T-107 完成。

---

> 最后更新：2026-06-13  
> 总任务数：73 个（Phase 0: 8, Phase 1 后端: 15, Phase 1 前端: 14, Admin: 5, Phase 2 语音: 6, Phase 3 实时语音: 3, PC Studio: 5, 社区: 8, 匹配: 6, 安全运维: 6, 多语言: 2）
