# Social Logic Lite — 视觉 UI 实现文档（给「视觉 Agent」）

> 这份文档只负责 **UI 视觉与静态交互**。后端/数据接线由 `SOCIAL_LOGIC_LITE_CODE_SPEC.md`（代码 Agent）负责。两份配合：**视觉 Agent 先做出页面与组件（mock 数据驱动）→ 代码 Agent 再接 API**。

---

## ⚠️ Git 工作规则（强制，每次修改必须遵守）

> **所有 Agent 在修改任何代码文件前，必须先执行 Git 操作。没有例外。**

1. **开始任务前**：先 `git status` 查看当前状态，确认工作区干净。
2. **修改代码前**：先 `git add -A && git commit -m "checkpoint: 修改前快照"` 创建一个检查点，确保当前状态可回退。
3. **每完成一个独立功能/修复后**：立即 `git add <具体文件> && git commit -m "feat/fix: 描述"` 提交，不要积攒多个改动。
4. **出错需要回退时**：用 `git log --oneline -10` 查看历史，`git checkout <commit> -- <file>` 恢复单文件，或 `git reset --hard <commit>` 全量回退。
5. **禁止**：在没有 commit 的情况下大幅重写文件——这会导致无法恢复。

```bash
# 标准工作流模板
git status                                    # 1. 检查状态
git add -A && git commit -m "checkpoint: before <任务描述>"  # 2. 快照
# ... 修改代码 ...
git add <修改的文件> && git commit -m "feat: <描述>"        # 3. 提交
```

---

## 0. 一句话目标

在「AinerWise（学英语为主、游戏为辅）」里做一个**单人狼人杀/阵营推理**游戏。玩家与多个 AI 玩家回合制推理，**顶部固定 Learning HUD 教用户用英文质疑/反驳/投票**。整体要：沉浸、悬疑、高级，但学习系统安静常驻、不打断游戏。

## 1. 技术栈与约束（必须遵守）

- React 18 + Vite + TypeScript，**Tailwind v3**（配置在 `apps/web/tailwind.config.cjs`，`preflight: false`）。
- 复用设计令牌：Premium "Amethyst"（`primary #630ed4` / `secondary #0058be` / `tertiary-fixed` 等，见 tailwind.config）。图标用 `lucide-react` 或 `material-symbols-outlined`（项目两者都在用）。
- **新页面统一放** `apps/web/src/pages/game/`，组件放 `apps/web/src/components/game/`，样式可新建 `apps/web/src/game.css`（参考现有 `MessageBubble.css` / `premium.css` 的写法）。
- 移动优先（iPhone 15 Pro，~390px 宽）。所有屏幕在 390px 下不溢出。
- **参考 mockup 在 `h5_game_ui/<screen>/`**，每个目录有 `screen.png`（视觉稿）+ `code.html`（可直接参考的 HTML/CSS 结构）。**按 screen.png 还原视觉，把 code.html 的结构翻译成 React+Tailwind 组件**。

## 2. 主题：深色游戏氛围（与主 app 浅色的关系）

主 app（Chat/Home/Connect）是**浅色 Premium Amethyst**。游戏需要**深色沉浸氛围**。处理方式：

- 游戏页根容器加 `.game-dark` 作用域类，背景用 **深蓝→紫渐变**（`#0b0a1f → #1a1140 → #241548`），不污染主 app 浅色。
- 玻璃拟态卡片：`bg-white/8 backdrop-blur-xl border border-white/12`，圆角 `rounded-2xl/3xl`，premium 阴影。
- 文字主色浅（`text-white` / `text-white/70`），强调色用 **霓虹紫/蓝**（`primary` / `#7c5cff` / `#4edea3` 点缀）。
- 缓慢漂浮的粒子/光晕（`blur-3xl` 渐变圆，低透明度，CSS animation）。
- **Learning HUD 卡片**：游戏内沿用 Chat 的 HUD 结构，但配色转深色玻璃（见 §5）。
- **禁止**：廉价赌博卡牌感、幼稚卡通、密集后台表格、普通聊天机器人样式。

## 3. 全局组件清单（要交付的组件）

放 `apps/web/src/components/game/`：

| 组件 | 说明 |
|---|---|
| `GameShell` | 深色根容器 + 背景粒子/光晕 + 安全区 |
| `GameStatusBar` | 顶部状态栏（轮次/阶段/存活/身份/语言 + 规则/记录/暂停） |
| `PhaseBanner` | 阶段切换横幅（夜晚/天亮/投票…） |
| `RoleCard` | 单张身份牌（正面/背面/翻牌动画） |
| `CardDeck` | 洗牌中的发光牌堆 |
| `PlayerStrip` + `PlayerCard` | 玩家头像条 + 单个玩家卡（存活/可疑度/发言态/claim 徽章） |
| `PlayerDetailSheet` | 玩家详情底部弹层（公开信息/发言摘要/可疑点/操作按钮） |
| `SpeechFeed` + `PlayerSpeechCard` | 发言流 + AI 玩家发言卡（🔊/质疑/保存/翻译） |
| `ContradictionHintCard` | 矛盾提示卡（橙红边，轻提示，不给答案） |
| `AIHostCard` | AI Host 控场短发言卡 |
| `UserSpeechCard` | 用户发言卡（英文 + 中文原意 + 学习点入口） |
| `ActionPanel` | 阶段化底部操作区（白天发言/自由提问/质疑/投票） |
| `QuestionBuilder` | 选玩家 + 快捷问句 chips + 输入框 + 「帮我表达」 |
| `VotePanel` + `VoteCard` | 投票选择 + 理由生成 |
| `VoteResultCard` | 投票结果（票型 + 出局 + 身份揭示/隐藏） |
| `SuspicionMeter` | 可疑度（低/中/高 或 进度条 + 「仅估算」提示） |
| `TimelineDrawer` | 发言记录抽屉（按玩家/矛盾/投票/提问筛选） |
| `GameLearningHUD` | 游戏内学习 HUD（**复用** Chat HUD，深色皮肤，见 §5） |
| `TurnSelector` | 学习轮次切换（T1/T2…，可 Pin），**复用 Chat 已有的 turn 概念** |
| `GameSummary` | 结算/学习总结屏 |

> **复用 Chat 已有组件（不要重写）**：`LearningHUD`、`TokenExplainSheet`、`useTts`（speak/speakMixed）、pill/HUD 卡 CSS（`MessageBubble.css`）。代码 Agent 会把它们抽成可共享组件；视觉 Agent 在游戏内**沿用同一套卡片视觉语言**，仅换深色皮肤。

## 4. 十个屏幕逐个规格

> 每屏标注：① 参考 mockup 路径 ② 布局 ③ 状态/动画 ④ 绑定的数据字段（代码 Agent 提供，视觉先用 mock）。所有「身份」相关：**绝不提前暴露 AI 隐藏身份**。

### S1. 游戏大厅就绪 `Social Logic Lobby Ready`
- 参考：`h5_game_ui/social_logic_lobby_ready/`
- 布局：标题「狼人杀 Lite」+ 副标题「AI 正在准备本局身份牌」；局信息（6 人局 / 2 狼 4 好 / English / Normal）；玩家列表（You + A~E，每个：头像、性格标签如「冷静型/强势型/逻辑型/紧张型/带节奏型」、状态「等待发牌」）；主按钮「开始发牌」。
- 数据：`players[]{name, code, personality, status}`、`mode`、`difficulty`、`roles_summary`。

### S2. AI 洗牌 `AI Shuffling Cards`
- 参考：`h5_game_ui/ai_shuffling_cards/`
- 中央发光牌堆 `CardDeck`，文案「AI 正在洗牌...」+ 小字「身份将随机分配，每个 AI 只知道自己该知道的信息」。
- 动画：牌堆轻微洗牌左右滑动 + 发光 + 背景粒子慢移 + loading ring/dots。**不显示任何真实身份**。

### S3. 身份牌已发（背面）`Face-down Role Cards Dealt`
- 参考：`h5_game_ui/face_down_role_cards_dealt/`
- 6 张背面牌，半圆/横向排列，每张在对应玩家头像上方；**用户的牌紫色辉光 + 轻微弹跳**，标签「你的身份牌」；AI 牌背面 + 小标「已发牌」。
- 文案「身份牌已发放 / 点击你的身份牌查看身份」；按钮「查看我的身份」「稍后查看」。

### S4+S5. 抽牌 + 身份揭示 `User Role Card Reveal`
- 参考：`h5_game_ui/user_role_card_reveal/`
- S4 抽牌交互：点用户牌 → 牌抬起 → 3D 翻转 → 辉光爆发 → 角色图标淡入；翻牌前文案「正在揭示你的身份...」。
- S5 身份大卡居中：
  - 村民：身份「村民」/ 阵营「好人」/ 能力「无」/ 目标「找出狼人」；绿/蓝辉光；英文学习提示「本局你会练习：I suspect that... / That sounds suspicious. / Can you explain why...? / I vote for...」。
  - 狼人：身份「狼人」/ 阵营「狼人」/ 能力「夜晚选择目标」/ 目标「隐藏身份，误导好人」；不同配色；练习句不同（I was near... / I didn't see anyone suspicious. / That doesn't prove anything. ...）。
  - 按钮「我知道了，进入游戏」「查看规则」。**只显示用户自己的身份**。
- 数据：`user_role{role, camp, ability, goal, practice_phrases[]}`。

### S6. AI 收到身份（过场）
- 文案「AI 玩家已收到各自身份」+ 小字「每个 AI 将根据身份、性格和已知信息发言」；`PlayerStrip` 每张：头像 + 性格 + 「身份已隐藏」徽章 + 状态「准备中」。

### S7. 夜晚降临 `Night Phase Transition`
- 参考：`h5_game_ui/night_phase_transition/`
- 暗色覆盖 + 月亮图标 + 柔蓝辉光 + 玩家卡变暗；文案「夜晚降临 / 所有人闭眼，AI 玩家开始行动...」；按钮「继续」或 2s 自动过渡。

### S8. 白天主游戏屏 `Day Discussion Main Game Screen`（核心）
- 参考：`h5_game_ui/day_discussion_main_game_screen/`（已看过 screen.png，深色，5 层结构）
- 过场「天亮了 / 昨晚 Player D 被淘汰 / 进入第 1 轮白天发言」→ 进入主屏。
- **主屏 5 层（从上到下）**：
  1. `GameStatusBar`：「狼人杀 Lite · 第1轮白天」「存活 5/6 · 你的身份：村民 · English」+ 右侧 规则/记录/暂停。
  2. `GameLearningHUD`（固定、横向滑动 5 卡，深色皮肤）：质疑表达 / 为什么这么说 / 推理句型 / Agent 简析 / 加入消消乐（详见 §5）。
  3. `PlayerStrip`：A/B/C/D/E/You，可疑度色（绿低/橙疑/红高疑/灰出局/紫当前）；点开 `PlayerDetailSheet`。
  4. `SpeechFeed`：`PlayerSpeechCard`（英文发言 + 中文 gloss + 🔊/质疑/保存/翻译）；穿插 `ContradictionHintCard`（⚠ 可能的矛盾 + 「质疑 B / 继续观察」）；`AIHostCard` 控场短句。
  5. `ActionPanel`：白天发言态（发表怀疑/解释自己/支持某人/观察不发言/自己输入）。

### S9. 玩家详情弹层 `Player Detail Sheet`
- 底部弹层：玩家名 + 公开身份「未知」+ 状态 + 发言摘要（bullet）+ 可疑点（bullet）+ 操作「提问 / 质疑发言 / 查看历史 / 标记可疑」。**只显示公开信息与用户已发现信息**。

### S10a. 提问/质疑操作区 `Question / Challenge Action Panel`
- 自由提问态：「你想问谁？」+ 玩家按钮 A~E + 快捷问句 chips（你昨晚在哪里？/你为什么这么说？/你的说法和他矛盾/你能解释一下吗？）+ 输入框「输入你的问题，中文或英文都可以...」+ 「帮我表达」「发送」。
- 质疑某条发言态：「你正在质疑 Player B」+ 输入 + 「帮我表达」（生成礼貌/强势/推理 3 版）+ 「发送」。

### S10b. 投票阶段 `Vote Phase Screen`
- 参考：`h5_game_ui/vote_phase_screen/`
- 标题「投票阶段 / 请选择最可疑的玩家并给出一句理由」；`VoteCard`（每玩家 + 可疑度 + 矛盾标注；出局者灰显不可选）；选中后「投票理由」（自动生成英文理由 / 自己输入 / 确认投票）；**确认按钮在选中目标前禁用**。

### S10c. 投票结果
- 「投票结果」+ 票型（A→B / B→C / ...）+ 结果卡「Player B 被投票出局」+（普通模式「身份公开：狼人」/ 硬核「身份不公开」）+ 按钮「进入下一轮」。

### S10d. 游戏总结 `Game Summary Screen`
- 参考：`h5_game_ui/game_summary_screen/`
- 结果「好人/狼人阵营胜利」；分区：① 你的推理表现 ② 关键矛盾 ③ 你的高光发言 ④ 学到的英文句型 ⑤ 加入消消乐 ⑥ 保存到 Assets ⑦ 再玩一局；按钮「加入消消乐 / 保存到 Assets / 再玩一局 / 提高难度」。

## 5. 游戏内 Learning HUD 规格（复用 Chat HUD，深色皮肤）

横向滑动 5 卡（与 Chat 的 `LearningHUD` 同结构/同数据契约，仅换深色）：

1. **质疑表达**：大字英文质疑句 + 🔊 + 中文含义；版本切换 Tab「自然 / 更强势 / 更礼貌 / 更像推理」（切换只换主句）。
2. **为什么这么说**：2-3 条 bullet，**解释必须中文**（第一性原理：学习者看不懂英文解释）。
3. **推理句型**：chips（Why did you say...? / That doesn't add up. / I suspect that... / Can you explain...? / If you were innocent, why...? / That contradicts what you said earlier.）；每个 chip 点击 → `TokenExplainSheet`（朗读/解释/收藏/加入消消乐/生成类似句）。
4. **Agent 简析**：Logic Agent（指出矛盾）/ Language Coach（点评英文表达）/ Game Coach（建议下一步），各一行短句。
5. **加入消消乐**：高频句型 + 「加入今日练习 / 稍后 / 不再提醒」。

HUD 顶部 `TurnSelector`：T1 开局 / T2 问 B / T3 质疑 C / T4 投票理由 / T5 复盘；默认显示最新轮，点历史轮切换，可 Pin（Pin 后新学习点只在 Turn 标签新增，不覆盖当前）。

## 6. 动画规范（轻量、移动友好，纯 CSS/transform，不引游戏引擎）

- **洗牌**：牌堆左右轻滑 + 发光呼吸。
- **发牌**：牌从中央堆飞向各玩家，用户牌落定时更强辉光，AI 牌保持背面。
- **翻牌**：`rotateY` 3D 翻转 + 角色图标淡入 + 短辉光爆发。
- **阶段切换**：夜=暗覆盖+月亮+玩家变暗；昼=日出柔光+玩家条提亮；投票=卡片上滑入投票面板。
- **HUD 更新**：slide/fade，**不跳动、不遮挡发言流**。
- 复用 `premium.css` 已有的 `fadeInUp` / `lyric-shimmer` / `pulse-soft` 关键帧；新增的关键帧放 `game.css`。

## 7. 文案：空 / 加载 / 错误态（永不暴露技术错误）

- 加载：「AI 正在洗牌... / AI 正在分配身份... / AI 玩家正在行动... / 正在生成发言... / 正在生成学习点...」
- 错误：「身份分配失败，请重新开始本局。/ AI 发言生成失败，请重试。/ 学习点生成失败，不影响游戏继续。」

## 8. 给视觉 Agent 的验收清单

- [ ] 10 个屏幕在 390px 宽全部不溢出、深色氛围统一。
- [ ] 复用 Premium Amethyst 令牌 + lucide/material 图标；不引入新 UI 库。
- [ ] 所有「身份」只显示用户自己的；AI 身份在揭示前一律「已隐藏」。
- [ ] HUD 视觉与 Chat 一致（同卡片语言，深色皮肤）；解释文字位中文占位。
- [ ] 每个组件 props 用 mock 数据可独立渲染（便于代码 Agent 接 API）。
- [ ] 动画轻量、不卡顿；阶段切换清晰；HUD 更新不打断发言流。
- [ ] 交付：`pages/game/*` + `components/game/*` + `game.css`，并在 `SOCIAL_LOGIC_LITE_CODE_SPEC.md` 的「数据契约」里对齐字段名。
