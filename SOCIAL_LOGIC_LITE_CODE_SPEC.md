# Social Logic Lite — 前后端代码实现文档（给「代码 Agent」）

> 配合 `SOCIAL_LOGIC_LITE_UI_SPEC.md`。**视觉 Agent 先产出 `pages/game/*`、`components/game/*`（mock 数据驱动），你负责把它们接上后端 API + 实现游戏引擎 + 学习闭环。**
> 整体 app：**学英语为主、游戏为辅；交互必须快、好。token 成本不敏感**——后台分两档调用（高智商 / 低智商，见 §4）。

---

## 1. 关键架构决策（用户明确要求分析的点）

**问：游戏的「对话框」是否沿用当前 Chat 的 Conversation-First + Learning HUD 模式？还是落入独立游戏对话框？**

**结论（必须照此做）：**
- **学习层 100% 复用** Chat 的 Learning HUD 体系：`LearningHUD`、`TokenExplainSheet`、`useTts`（speak/speakMixed）、`TurnSelector`、HUD 卡 CSS。HUD 数据**沿用 `chat_v2` 的 v2 analysis 形状**（`main_expression / variants / why_this_expression / patterns_v2 / agents / vocabulary`），所以游戏「质疑某玩家」产出的 HUD 直接喂给同一个组件。
- **对话层不复用** Chat 的 conversation feed。游戏有**自己的 SpeechFeed**（AI 玩家发言 / AI Host / 矛盾卡 / 投票结果），这是游戏事件流，不是 chat message。
- **输入区不复用** Chat 的 composer。游戏用**阶段化 `ActionPanel`**（白天发言 / 自由提问 / 质疑 / 投票），但「帮我表达」复用 chat_v2 风格的质疑表达生成。
- 一句话：**复用「怎么学」（HUD/TTS/Crush/解释），新建「怎么玩」（game feed/board/action panel）。**

抽取动作：把 `apps/web/src/pages/ChatDetail.tsx` 里的 `LearningHUD` / `TokenExplainSheet` / `useTts` / `splitIntoSentences` 抽到 `apps/web/src/components/learning/`（共享），Chat 与 Game 都 import。**不要复制粘贴两份。**

---

## 2. 现状盘点（我已实现并验证的基础，从这里继续）

### 已存在（可直接用 / 续建）
- 后端引擎：`apps/api/app/services/social_logic_engine.py`（内存 `_GAMES` dict + 阶段机 + LLM 驱动 AI 发言/回答 + 投票/夜晚/胜负判定 + 总结）。**已 docker cp 进 `ainerspeak-api-1` 并验证**：创建/投票/总结 OK。
- 后端路由：`apps/api/app/api/routes/social_logic.py`，已在 `apps/api/app/api/router.py` 注册。前缀 `/api/games/social-logic`。
- Provider 通用方法 `complete_json(system, user, *, temperature, max_tokens)`：`llm_openai.py`（OpenAI 兼容）+ ABC 默认 + `FallbackLLMProvider` 委托。**已验证**简单 prompt 正常返回 JSON。
- 复用件：`addCrushCandidate` / `explainToken` / `ttsMixed`（`apps/web/src/api.ts`）；`POST /api/grammar/candidate`（写复习队列，复用 `pattern_mining._upsert_mastery_item`）；`POST /api/vocabulary/explain`（词解释）；`POST /api/voice/tts` + `/tts-mixed`（TTS 语言路由 `apps/api/app/services/tts_router.py`）。
- 双档模型基础设施：`apps/api/app/services/llm.py` 的 `TASK_MODEL_HINTS` / `_resolve_model_for_task` / `get_llm_provider_for_task(task_type, hint, db)`（按 task 选 cheap/quality 模型）。

### 已知问题 / 必修（P0）
1. **`question_player` 的 HUD 返回空**：当前 system prompt 嵌套太深，DeepSeek 直接回 `{}`。必修：把 prompt 改成「清晰分段 + 干净缩进的 JSON 模板 + 每字段中文描述」（照 `chat_v2` 的 `CHAT_V2_PROMPT` 写法）。已验证简单 prompt 能正常返回，**复杂度是唯一原因**。
2. **解释语言必须是母语**（第一性原理，用户强调）：`chat_v2`（`llm_openai.py` ~line 500）当 `explanation_language == target_language` 时要回退到 `native_language`；游戏 HUD 的 `why_this_expression / agents / meaning_native` **一律中文**。demo 账号 `explanation_language="en"` 导致解释全英文 = bug。
3. **发牌序列缺端点**：当前 `create_game` 直接跳到 `day_discussion`（夜晚+发言一次性算完）。UI 的 S1–S8（大厅→洗牌→发背面牌→翻牌看身份→夜晚→天亮）需要**把开局拆成多步**（见 §5 端点）。
4. **持久化**：内存 `_GAMES` 重启即失。MVP 可接受；上线前换 DB（`GameSession` 表 + JSON state 列）。

---

## 3. 后端：游戏引擎数据模型与状态机

### 玩家状态（每个 AI 独立，狼人/村民可见信息不同）
```
player: { id, name, code, personality, is_user, alive, role(villager|werewolf),
          public_claim, suspicion(0-100), revealed }
knowledge_scope（生成发言时喂给 LLM）:
  - 狼人知道: 自己阵营、其他狼是谁、夜晚结果、自己的谎言
  - 村民知道: 公开发言、公开投票、自己看到的有限事件
```
AI 发言规则（写进 prompt）：每次 1-3 句；不暴露隐藏身份；狼人会伪装但不开挂；性格差异（A 冷静 / B 强势 / C 逻辑 / D 紧张 / E 带节奏）。

### 阶段机（完整版，含发牌序列）
```
lobby → dealing(洗牌+分配) → role_reveal(用户翻牌) → night(自动结算) →
day_discussion(AI 发言 + 用户提问/质疑) → vote(用户+AI投票) → result(出局+揭示) →
  胜负? → ended : 回到 night（下一轮）
```
胜负：狼=0 → 好人胜；狼≥村民 → 狼胜。难度：easy(4AI/1狼/公开身份)、normal(5AI/1狼/公开)、hard(6AI/2狼/不公开+狼会反咬)。

---

## 4. 双档 LLM 调用策略（核心，token 不敏感但要分智商）

用现有 `get_llm_provider_for_task(task_type, hint, db)` + 在 `TASK_MODEL_HINTS` 注册游戏任务类型；引擎里**按任务取对应档位的 provider**，再调 `complete_json`。

| 调用 | 档位 | task_type（注册到 TASK_MODEL_HINTS） | 说明 |
|---|---|---|---|
| AI 玩家白天发言（推理/伪装/性格） | **高** | `game_ai_speech` (prefer quality) | 一次调用生成全部存活 AI 发言（JSON 数组） |
| 被质疑后 in-character 回答 | **高** | `game_ai_answer` (prefer quality) | 不暴露身份 |
| 质疑/反驳/投票**英文表达教学 HUD** | **高** | `game_challenge_hud` (prefer quality) | pedagogy 质量关键，4 版本+why+patterns+agents |
| 矛盾检测 / 可疑度推理 | **高** | `game_reasoning` (prefer quality) | 生成 ContradictionHintCard |
| 结算「推理表现/高光发言」分析 | **高** | `game_summary` (prefer quality) | |
| 中文→英文**字面翻译**（用户输入） | **低** | `game_translate` (prefer cheap) | 仅直译，无 pedagogy |
| 单词 gloss（TokenExplainSheet） | **低** | 复用现有 `explain_token` | |
| AI Host 固定控场短句 / 状态文案 | **低/模板** | 优先**本地模板**，必要时 cheap | 不必每次 LLM |
| 投票理由模板 | **低** | `game_vote_reason` (prefer cheap) | |
| TTS 文本准备 | n/a | 走 `tts_router` | |

实现要点：
- 在 `TASK_MODEL_HINTS` 加上述 key（`{"prefer":"quality"|"cheap","fallback":...}`）。
- 引擎里：`provider = get_llm_provider_for_task("game_ai_speech", resolve_default_llm_provider(db), db)` 然后 `await provider.complete_json(...)`。
- **能用本地模板/规则的别调 LLM**（Host 短句、可疑度数值、投票计票、夜晚结算都用规则；只有"发言内容/回答/教学/分析"才上高智商）。
- 交互要快：AI 发言「一次调用生成全部玩家」而非逐个；提问端点「一次调用同时产出 HUD + 目标回答」（合并，省往返）。

---

## 5. API 契约（端点 + 请求/响应）

前缀 `/api/games/social-logic`。**现有端点已实现**，标注 ✅；**发牌序列需新增**，标注 🆕。所有响应的 `state` 用 `_public_view`（隐藏 AI 角色，除非 revealed 或 ended）。

| 方法 | 路径 | 状态 | 说明 |
|---|---|---|---|
| POST | `` | ✅(需改) | 创建。**改为返回 `phase=lobby`**（仅花名册+局信息，不立刻发牌） |
| POST | `/{id}/deal` | 🆕 | 洗牌+分配隐藏角色，返回 `phase=role_reveal` + 背面牌布局 + 用户自己的 `user_role` |
| POST | `/{id}/start` | 🆕 | 用户确认身份后：night 自动结算 + 生成首轮白天发言，返回 `phase=day_discussion` |
| GET | `/{id}` | ✅ | 取当前 `state`（脱敏） |
| POST | `/{id}/question` | ✅(需修 prompt) | body `{target_player_id, content}` → `{hud, answer, state}`（HUD=质疑表达） |
| POST | `/{id}/help-express` | 🆕(可选) | 只产出「帮我表达」3 版本（不推进游戏），低延迟 |
| POST | `/{id}/vote` | ✅ | body `{target_player_id, reason}` → 计票+出局+揭示+推进，返回 `state` |
| GET | `/{id}/summary` | ✅ | 结算总结（含练习句型，喂给消消乐） |

**HUD 响应形状（与 chat_v2 v2 analysis 对齐，前端同一个 LearningHUD 渲染）：**
```json
{ "hud": { "v2": true, "detected_intent": "expression_learning",
  "main_expression": "...", "meaning_native": "中文",
  "variants": {"natural":"...","assertive":"...","polite":"...","deductive":"..."},
  "why_this_expression": [{"point":"中文标签","explanation":"中文解释"}],
  "patterns_v2": [{"pattern":"Why did you say...?","example":"...","add_to_crush":true}],
  "vocabulary": ["..."],
  "agents": [{"agent":"Logic Agent","result":"..."},{"agent":"Language Coach","result":"..."},{"agent":"Game Coach","result":"..."}] },
  "answer": {"text":"目标玩家英文回答","text_native":"中文"},
  "state": { ...public game state... } }
```
> 注意现引擎 `question_player` 用 `patterns`（非 `patterns_v2`）键。**统一成前端 LearningHUD 读的键名**（`patterns_v2`），或在前端做兼容映射。两边对齐一次即可。

`state`（`_public_view` 已实现）字段：`game_id, difficulty, round, phase, players[]{id,name,code,is_user,alive,suspicion,public_claim,role(脱敏)}, user_player_id, feed[]{type,speaker,text,text_native,...}, winner, alive_count, total_count`。

---

## 6. 前端：路由 / 状态 / 组件接线

### 路由（`apps/web/src/App.tsx` 或路由表）
```
/game/social-logic            → 入口（从 Story Game Forge / Connect 进）
/game/social-logic/:gameId    → 游戏主流程（用 phase 驱动渲染哪个屏）
```
**单页按 `state.phase` 切换屏**（lobby/dealing/role_reveal/night/day_discussion/vote/result/ended），而非多路由，保证状态连续 + 动画顺滑。

### 状态 store（`apps/web/src/stores/gameStore.ts`，参考 `chatStore.ts` 的 turn 系统）
- `game`（当前 `state`）、`hud`（当前 HUD）、`turns`（学习轮，复用 `DialogueTurn` 概念 + `TurnSelector`）、`pinnedTurnId`、`phase`、`loadingLabel`、`error`。
- actions：`createGame(difficulty)` / `deal()` / `start()` / `question(targetId, content)` / `helpExpress(content)` / `vote(targetId, reason)` / `loadSummary()` / `setActiveTurn` / `pinTurn`。
- 每次 `question` 成功 → push 一个 turn（hud），`TurnSelector` 新增标签；未 Pin 时 HUD 自动显示最新。

### 组件复用 / 新建
- **复用（从 learning 抽取的共享件）**：`LearningHUD`、`TokenExplainSheet`、`useTts`、`TurnSelector`、pill/HUD CSS。
- **新建**：`SOCIAL_LOGIC_LITE_UI_SPEC.md` §3 的全部 game 组件（由视觉 Agent 出壳，你接数据）。

### UI ↔ API 数据流（每屏对应调用）
- S1 Lobby：`createGame` → `state(lobby)`。
- S2/S3 洗牌+发背面：`deal()` → `state(role_reveal)` + `user_role`（洗牌动画为前端纯动画，期间显示 loadingLabel）。
- S4/S5 翻牌揭示：本地翻牌动画 + 渲染 `user_role`。
- S6/S7/S8：`start()` → night/day 过场用 `state.feed` 里的 host/night 事件驱动 → 进 day_discussion 主屏。
- 主屏发言流：渲染 `state.feed`；玩家条渲染 `state.players`；矛盾卡由 `feed[].type==="contradiction"`（引擎 `game_reasoning` 产出）驱动。
- 提问：`ActionPanel` 选玩家+输入 → `question()` → 回填 `feed`（用户问句+AI回答）+ 更新 `hud`（HUD 切到本轮）。
- 「帮我表达」：`helpExpress()` 或 `question` 的 hud.variants → 让用户选版本再发送。
- 投票：`VotePanel` → `vote()` → `VoteResultCard`（票型来自响应 `feed[].type==="vote_result".votes`）→ 下一轮/结算。
- 结算：`loadSummary()` → `GameSummary`；「加入消消乐」→ `addCrushCandidate(每个 pattern)`；「保存到 Assets」→ 复用 assets API；「再玩一局」→ `createGame`。

### 学习闭环接线（HUD → Crush → 消消乐 → Assets）
- HUD pill 点击 → `TokenExplainSheet`（`explainToken`）→「加入消消乐」`addCrushCandidate(token)`。
- HUD「加入今日练习」/ 结算「加入消消乐」→ `addCrushCandidate(pattern, example)`（已实现，进 `/grammar/queue` 复习队列 → PatternCrush 页消消乐）。
- 所有英文句/词 🔊 → `useTts.speak`；混合中英行 → `speakMixed`（走 tts 语言路由，英文用英文音色）。

---

## 7. 错误 / 加载 / 降级（交互要稳）

- 任一 LLM 调用失败：**不阻断游戏**。AI 发言失败 → 用兜底短句；HUD 生成失败 → HUD 显示「学习点生成失败，不影响游戏继续」，游戏照常推进。
- 所有 loading 用 UI §7 文案；错误用 UI §7 文案，**永不暴露技术错误**。
- 高智商调用加超时（如 30-40s）+ 重试一次；低智商调用快失败快兜底。

---

## 8. 实现步骤（给代码 Agent 的有序 checklist）

**阶段 A — 共享学习层抽取（先做，Chat 与 Game 共用）**
1. 抽 `LearningHUD` / `TokenExplainSheet` / `useTts` / `splitIntoSentences` / `TurnSelector` → `apps/web/src/components/learning/`；改 `ChatDetail.tsx` 引用，确保 Chat 不回归（tsc + vite build 绿）。

**阶段 B — 后端引擎补全 + 必修**
2. 修 `question_player` prompt（清晰分段 JSON 模板，参考 `CHAT_V2_PROMPT`）；键名统一 `patterns_v2`。
3. 修解释语言：`chat_v2` 加 `explanation_code == target_language → native_language` 守卫；游戏 HUD prompt 全中文解释。
4. 拆开局：`create_game` 返回 lobby；新增 `/deal`、`/start`；`_public_view` 增 `user_role` 字段。
5. 注册双档 `TASK_MODEL_HINTS`（§4 的 key）；引擎按 task 取 provider。
6. 矛盾检测：`game_reasoning` 调用，产出 `feed[].type==="contradiction"`。
7. （可选上线）持久化：`GameSession` 表替换 `_GAMES`。

**阶段 C — 前端接线**
8. `gameStore.ts`（参考 chatStore turn 系统）。
9. 视觉 Agent 的 game 组件接 store/API；按 `phase` 单页切屏。
10. 学习闭环接线（§6）。

**阶段 D — 验收**
11. 全链路自测（§9）；tsc + vite build 绿；docker cp 后端 + 重启验证端点。

---

## 9. 验证方法（已跑通的方式，照此测）

- 后端同步：`docker cp apps/api/app/... ainerspeak-api-1:/app/app/...` + `docker restart ainerspeak-api-1`，等 `/docs` 200。容器 app 路径 `/app/app/`。
- 取 token（demo 账号）：`POST /api/auth/login {"email":"demo@ainerspeak.com","password":"Demo123!"}` → `access_token`。
- 端到端：`POST /api/games/social-logic {difficulty:"easy"}` → `/deal` → `/start` → `/{id}/question {target_player_id, content:"你昨晚在哪里？"}`（断言 hud.main_expression / variants / why(中文) / answer 非空）→ `/{id}/vote` → `/{id}/summary`。
- 前端：tsc `npx tsc --noEmit`、`npx vite build`；Vite dev `server.proxy` 已把 `/api`→`localhost:7070`。
- 验收红线：① AI 隐藏身份不泄露 ② HUD 解释为中文 ③ 提问 HUD 非空 ④ 交互快（AI 发言一次调用、提问 HUD+回答合并一次调用）⑤ 学习点能进消消乐。

---

## 10. 关键文件索引

- 后端引擎：`apps/api/app/services/social_logic_engine.py`（续建）
- 后端路由：`apps/api/app/api/routes/social_logic.py` / 注册 `apps/api/app/api/router.py`
- LLM：`apps/api/app/services/llm_openai.py`（`complete_json` / `chat_v2` / `explain_token`）、`apps/api/app/services/llm.py`（`TASK_MODEL_HINTS` / `get_llm_provider_for_task` / Fallback 委托）
- TTS 路由：`apps/api/app/services/tts_router.py`
- Crush 写入：`POST /api/grammar/candidate`（`pattern_mining._upsert_mastery_item`）
- 前端复用源：`apps/web/src/pages/ChatDetail.tsx`（LearningHUD/TokenExplainSheet/useTts）、`apps/web/src/stores/chatStore.ts`（turn 系统）、`apps/web/src/api.ts`（addCrushCandidate/explainToken/ttsMixed）、`apps/web/src/MessageBubble.css`
- UI 参考：`h5_game_ui/<screen>/{screen.png,code.html}`（见 UI 文档 §4 映射）
