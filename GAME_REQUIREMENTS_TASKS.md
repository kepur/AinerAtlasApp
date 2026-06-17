# AinerSpeak 游戏模块 — 需求与任务清单（多 Agent 协作）

> 原则（用户第一性）：**① 用户界面视觉感官第一 → ② 游戏沉浸感第二 → ③ 语言学习性第三**。
> UI 严格对齐根目录设计图（01–11.png），**不要乱改 UI、不要删配置功能**。后端依据前端页面扩展。
> 设计图：01 侦探总结 / 02 侦探素材库+审讯+多人 / 03 恋爱社交 / 04 角色扮演 Adventure / 05 AI侦探主板 / 06 Roleplay Setup / 07 海龟汤详情 / 08 海龟汤结算 / 09 海龟汤对话 / 10 Story Dialogue / 11 侦探审讯（真人头像+学习栏）。

最后更新：2026-06-17

---

## ✅ 已完成（本轮 + 前序）

- **海龟汤**：详情(07)→对话(09，AI判定+学习HUD)→提交推理→真相揭晓→结算(08，真实真相/关键问句/3智能体)。闭环✅
- **AI侦探**：主板(05，线索图片缩略图+嫌疑人真人头像+嫌疑度条+学习提示)→审讯(02/11，LLM问答+学习HUD)→推理弹窗→结算(01)。闭环✅
- **角色扮演/剧情**：Home(04)/系统故事线/选择角色/AI讲故事→对话(10，**流式**+角色真人头像+背景板+学习HUD多智能体+选项)→章节推进→结算。闭环✅
  - 修复：流式去重 bug、`complete_json_stream` 空 choices/usage 崩溃、Fallback `_stream_json_result` 不传播(break→continue)、正则增量提取 narrator_text 平滑出文。
- **恋爱社交(03)**：LLM回复+双语、关系值递进、**心动·情侣**阶段(原"保持边界"已修正)、对面角色真人头像、背景板、动作按钮、学习卡。闭环✅
- **狼人杀 Lite**：大厅→发牌→翻身份牌→夜晚→白天讨论(真实AI发言+LLM问答+学习HUD)→投票→结算。闭环✅（修复 ActionPanel 发送未接线、HUD兜底、不能选自己）
- **内容中台**：
  - 素材库 `GameAsset`(封面/头像，按 era/gender/age 分类) + `/api/games/assets` CRUD + picker + 后台页 `/admin/asset-library`。
  - AI 故事发布 `/admin/story-publisher`：自定义篇幅/章节数/结局数 + 分支结局 + 后端按年代/性别从素材库自动配图。
  - 已发布内容管理 `/admin/templates`：列出/上架下架/删除。
  - 4 类游戏(海龟汤/侦探/恋爱/角色扮演)引擎 init 优先用完整 config，**全类型后台可发布**，前端读静态内容不每次调 AI。
- **高级后台基础**：
  - 角色音色：`VOICE_PRESETS` + `GET /api/games/voices` + generate-story 按性别分配 `voice` + 视图暴露 voice。
  - 游戏 Prompt 后台化：`services/game_prompts.py` `get_game_prompt(db,key,default,**fmt)` DB覆盖+安全回退；seed 8 个 `game.*` 槽位(admin 可编辑)；已接入 `turtle_soup.judge`/`detective.interrogate`。
- **系统性修复**：`flag_modified(sess,"state")` 解决 JSON state 不持久化；引擎统一回显用户输入(store 不再重复加气泡)。

---

## ⬜ 待做（按优先级，可分配给其他 agent）

### ✅ P0 — 已完成（2026-06-17）
1. **角色音色 TTS 播放接线** ✅
   - `TTSButton` 加 `voice` 参数 + **浏览器 speechSynthesis 兜底**（无服务端 TTS key 也能朗读）；`audioCacheStore.getOrFetch(text,lang,voice)` 透传到 `/api/voice/tts`；后端把游戏音色预设 id 映射为 provider 音色。
   - 已接线：`UnifiedMainFeed`(character/judge/suspect_answer)、`UnifiedLearningHUD`(主表达)、`RomanceSocial`(char_msg/自然表达)、`DetectiveInterrogation`(嫌疑人/学习提示)、`SocialLogicGame`(玩家发言 onSpeak)。
   - 待做(P1)：StoryPublisher 角色卡的"音色绑定下拉"(写入 config.characters[].voice)。
2. **游戏 Prompt 后台化** ✅
   - 全部引擎接 `get_game_prompt`：turtle_soup.judge/hud、detective.interrogate/hud、romance.turn、roleplay.narrative、social_logic.answer/hud；seed 8 个 `game.*` 槽位(content 空=用默认)。
   - 待做(P1)：admin Prompts 面板按 `task_type=game` 分组的专属编辑 UI（目前可通过通用 Prompt 接口编辑）。

### ✅ 额外完成：所有对话页角色头像（11.png 风格）
roleplay 角色 / romance 对象 / detective 嫌疑人(审讯+主板) / social_logic 玩家 全部真人头像；后端 init 拷贝 avatar_url、视图暴露。

### P1 — 进度（功能接线，UI 已冻结）
- ✅ **狼人杀天亮发言修复**：白天进入自动 question 模式+预选首个存活 AI，输入框不再锁死，闭环可走。
- ✅ **各结算页 保存到Assets/加入消消乐接后端**：TurtleSoupSummary、GameSummaryDetective、UnifiedGameChat(roleplay/通用) 都接 `POST /api/assets` + `POST /api/grammar/candidate`（含 saving/saved 态）。
- ✅ **海龟汤详情页接真实数据**：`TurtleSoupDetail` 读 `loadTemplate(slug)`（标题/简介/封面/难度/时长/学习重点），带回退。
- ✅ **角色音色绑定后台**：RomanceCharacterManager 加音色下拉(`/api/games/voices`)，写入 config.voice，play 时 RomanceSocial 按角色音色朗读；补 romance 角色 DELETE 路由。
- ⬜ 待做：
  - **AI侦探主板 推理关系图(05.png)**：节点图(线索↔嫌疑人)，已发现才连线（涉及 UI，需确认解冻该局部）。
  - **侦探时间线**：审讯陈述聚合成事件时间线。
  - **Roleplay Setup(06.png)** 三入口 + 自定义剧情页接通（涉及 UI）。
  - **StoryPublisher 角色音色下拉**（roleplay 目前按性别自动配音色，可加手动选择）。
  - **admin Prompts 面板 `task_type=game` 分组编辑 UI**（目前可通过通用 Prompt 接口编辑 `game.*`）。
  - 详情页模式切换(Solo/Party、文字/语音)落地。

### P2 — 新玩法 / 基础设施
8. **多人剧本杀 Party Room(02.png 屏8)**：需真实多人后端(房间/WS/座位/角色分发)。当前 `PartyRoom.tsx` 未注册路由。较大工程。
9. **social_logic 持久化**：引擎为内存 `_GAMES`，API 重启清空活动局 → 迁到 DB(GameSession 或独立表)。
10. **策划词汇/句型包**：学习内容现全 AI 生成；增加策划可维护的精选词汇/句型库 + 关联到游戏/章节。
11. **难度曲线/CEFR 后台调参**：模板 `difficulty` 可改但缺可视化；按等级调 AI 输出复杂度。
12. **Pattern Crush / 词汇消消乐 联动**：游戏结算的句型/词汇一键加入消消乐练习闭环。

---

## 关键文件索引
- 引擎：`apps/api/app/services/{turtle_soup,detective,roleplay,romance}_engine.py`、`social_logic_engine.py`、`game_engine.py`(统一调度+`flag_modified`)。
- 内容中台：`game_assets.py`(素材+音色)、`game_prompts.py`(prompt覆盖)、`api/routes/games.py`(模板/素材/voices/generate-story)、`api/routes/social_logic.py`。
- 规范前端组件：`UnifiedGameChat.tsx`+`components/game/unified/*`(海龟汤/角色扮演)、`DetectiveBoard/DetectiveInterrogation/GameSummaryDetective.tsx`、`RomanceSocial.tsx`、`SocialLogicGame.tsx`+`components/game/*`、`TurtleSoupSummary.tsx`。
- 后台：`pages/admin/{StoryPublisher,AssetLibrary,TemplateManager}.tsx`。
- 流式：gameStore `sendTurnStream` → `POST /api/games/sessions/{id}/turns/stream`（roleplay 启用；其它回退单事件）。

## 开发约定
- 改后端要同步容器：`docker cp apps/api/app/. ainerspeak-api-1:/app/app/ && docker restart ainerspeak-api-1`；持久化 `docker compose build api && docker compose up -d api`。
- 预览：Vite `7075`(HMR)，API `7070`(docker)。登录 token 见 [[ainerspeak-preview-setup]]。
- 每次改完跑 `npx tsc --noEmit`(web) + `python test_games.py`(api) 回归。
