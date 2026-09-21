# 全局多语言学习与课程包架构

## 目标与边界

在现有 FastAPI / React、账号 Profile、Crush、词汇、游戏和资产服务上扩展，
不另建学习应用或用户体系。学习语言不是 UI 翻译语言：界面仍可用中文解释，
目标内容、练习队列和新建会话使用账号当前选择的语言。

当前提供 sr / en / es / fr / de / ja / ko 七套起步内容。首页依次展示：

1. 疑问词、完整问句、求助与回应；
2. 该语言的语序、介词、助词或词尾词块；
3. 把词填入已知句子；
4. 购物、交通、求助场景。

后续模块可预览，但通过前置模块才能提交考核。课程通过不等于长期掌握：
词汇与句式仍进入原有复习系统。当前每语言只内置 10 个句中核心词，不是完整的
500 / 800 / 1200 词库；阶梯是累计掌握目标，不是内容已交付的声明。

## 数据流与复用

| 层 | 实现 | 职责 |
|---|---|---|
| 账号语言 | `UserProfile.primary_target_language` | 服务端权威设置；切换后同步前端账号状态 |
| 语言解析 | `services/learning_language.py` | 显式记录语言优先，否则采用账号设置 |
| 课程包 | `curriculum_packs.py`、`learning_curriculum.py` | 语言内容、稳定模块/课时 ID、选项、答案、先后顺序 |
| 进度 | `LanguageCourseProgress.state.curriculum_v1` | 按用户和语言保存已过课时、错题和最近重试结果 |
| 练习流水 | `LanguagePracticeAttempt` | 每次有效提交、正确性、日期与每日练习数 |
| 复习衔接 | `VocabularyItem`、`UserMastery` | 词进入词汇队列；句式进入 Crush，不把所有句子算作单词 |
| 前端 | `learningLanguageStore`、`LearningPath`、`LearningModule` | 全局切换、首页路径、单课学习与刷新恢复 |
| 报告 | `/api/learning/summary` | 当前语言的课程、词汇、会话、资产、游戏及 7 日练习统计 |

切换语言会重建当前页的学习上下文、清理旧会话缓存并停止旧音频；它不会删除或
翻译历史记录。历史会话/游戏详情沿用记录本身的语言，保存学习收获也保留原语言。
新建对话和单人游戏默认采用账号语言，不再由英文模板覆盖。多人的房间语言属于
房间契约，不能因某位成员切换个人语言而擅自改变整间房；此路径尚待独立多语验收。

## API

- `POST /api/survival-sprint/select-language`：保存账号当前语言。
- `GET /api/survival-sprint/catalog`：可选语言与各语言课程进度。
- `GET /api/learning/path`：当前语言的模块路线、解锁条件与每日练习。
- `GET /api/learning/modules/{id}`：课时、选项与个人状态，不返回考核答案字段。
- `POST /api/learning/modules/{id}/answer`：服务端校验顺序与答案、更新进度和复习队列。
- `GET /api/learning/summary`：按当前语言统计；上述读取接口也支持显式 `language`。

提交携带 `language`、`lesson_id`、`answer`、`request_id`。同模块最近 20 个请求 ID
支持重试去重；不是无限期幂等账本。Postgres 使用行锁串行更新，SQLite 用于本机
开发，不作为高并发生产验证。每日统计沿用既有 UTC 日期口径。

## 扩展一个语言或模块

在应用启动时通过 `register_language_pack(code, metadata, builder)` 注册受信任的
代码适配器，所有 API worker 必须加载同一版本。不是上传任意可执行插件的后台功能。

`metadata` 必须含 `name`、`native_name`、`locale`、`voice`；`builder(code)` 返回：

- `modules`：按课程顺序排列的 `(id, title, description, icon)` 列表；可以增加发音等模块；
- `lessons`：以模块 ID 索引的非空课时列表；
- 每课含 `id/title/target/meaning/rule/prompt/answer/options`；当前考核器支持单选，
  选项应是同语言的真实表达、互不重复且有唯一正确答案；
- 词汇课额外提供 `word`，并确保它是例句中真实出现的形式。

稳定 ID 是持久化键：不要通过重排数组偷偷改变既有课时含义；破坏性课程变动需
显式版本迁移策略。当前 `curriculum_v1` 是全局状态版本，包内随意加 `version`
不会自动迁移已有学习记录。旧 `/survival-sprint/reference` 仅是内置七语参考资料，
新注册语言如需参考页须另提供内容适配器。

同语种选项与 Unicode 判分已有测试；课程语料后续仍应经过母语教师审核。
当前句中词按表面形式入库，未来若扩充 500+ 词库，应增加 lemma（词元）映射，
避免把屈折变化当成不同基础词。

## AI、音频与升级

固定课时本身不依赖 LLM。AI 用于辅助解释与动态对话，不用拼接假英文生成题目；
缺少人工选项的旧复习条目采用原句回忆题。游戏保留既有 `text_en` 等字段契约，
提示词明确字段内容使用目标语言，不通过改名破坏现有客户端。

音频继续走现有 Edge TTS 服务端静态缓存与浏览器缓存，传入目标语言。此次没有
重写缓存实现，也没有改用系统 TTS。已生成资源在升级时应保留。实际音频生成与
多语言云模型质量须独立验证，构建通过不能替代这两项验收。

本补丁没有新增表或迁移，前提是数据库已到 `m8n9o0p1q2r3`。生产部署见
[UPGRADE.md](../UPGRADE.md)，本地启动见 [LOCAL_DEPLOYMENT.md](../LOCAL_DEPLOYMENT.md)。
旧用户资料中的等级/XP 仍是既有全局字段；新的语言报告不再用它们冒充当前语种
的独立能力评分。能力测评与更细的分语种等级属于后续扩展。

## 验收建议

用测试账号选择塞语完成第一课，刷新应恢复第二课；切到日语应显示独立零进度，
切回后应保留塞语记录。再核查当前语言的 Crush、词汇、资产、报告及新会话语言。
答错后应进入复习，重试相同请求不应增加当日次数；跨用户不应读到另一人的进度。
免费 LLM 额度不足或 Redis 未启动时须明确记录失败，不开启付费兜底来通过验收。
