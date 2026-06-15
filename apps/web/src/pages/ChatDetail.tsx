import "../MessageBubble.css";
import {
  ArrowLeft, Loader, Send, Volume2, Lightbulb, GraduationCap,
  MessageSquare, Flame, X, Mic, Sparkles, Pin,
} from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Asset, Message, ChatV2WhyItem, ChatV2PatternItem, ChatV2AgentItem, ChatV2NextQuestion, TokenExplain } from "../api";
import { freezeConversation, explainToken, addCrushCandidate } from "../api";
import FreezeResult from "../components/FreezeResult";
import TabBar from "../components/TabBar";
import { useI18n } from "../i18n";
import { useChatStore, type DialogueTurn, type HudData } from "../stores/chatStore";

/* ─── TTS hook ─── */
function useTts() {
  const [cfg, setCfg] = useState({ voice: "Cherry", speed: 0.9, pitch: 1.1, provider: "browser" });

  useEffect(() => {
    fetch("/api/config/tts")
      .then(r => r.json())
      .then((c: any) => setCfg({ voice: c.tts_voice || "Cherry", speed: c.tts_speed || 0.9, pitch: c.tts_pitch || 1.1, provider: c.tts_provider || "browser" }))
      .catch(() => {});
  }, []);

  const speak = useCallback(async (text: string, lang?: string) => {
    if (cfg.provider && cfg.provider !== "browser") {
      try {
        const resp = await fetch("/api/voice/tts", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voice: cfg.voice, speed: cfg.speed, language: lang || "" }),
        });
        if (resp.ok) {
          const d = await resp.json() as { audio_url?: string; audio_base64?: string };
          const src = d.audio_url || (d.audio_base64 ? `data:audio/mpeg;base64,${d.audio_base64}` : "");
          if (src) { new Audio(src).play(); return; }
        }
      } catch { /* fall through to browser */ }
    }
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang || (/[一-鿿]/.test(text) ? "zh-CN" : "en-US");
    u.rate = cfg.speed; u.pitch = cfg.pitch;
    window.speechSynthesis.speak(u);
  }, [cfg]);

  return { speak };
}

/* ─── Learning HUD (horizontal scroll cards) ─── */
function LearningHUD({ hud, streamPhase, speak, onTokenClick }: {
  hud: HudData;
  streamPhase: "replying" | "analyzing" | null;
  speak: (text: string, lang?: string) => void;
  onTokenClick: (token: string, context: string) => void;
}) {
  const [variantTab, setVariantTab] = useState("natural_spoken");
  const [crushAdded, setCrushAdded] = useState<Set<string>>(new Set());

  if (streamPhase === "analyzing") {
    return (
      <div className="learning-hud">
        <div className="hud-status">
          <Loader size={14} className="spin hud-status-icon" />
          <span>AI 正在分析学习要点...</span>
        </div>
      </div>
    );
  }

  if (!hud || !hud.main_expression) {
    if (streamPhase === "replying") return null;
    return (
      <div className="learning-hud">
        <div className="hud-status hud-empty">
          <Sparkles size={14} className="hud-status-icon" />
          <span>发送消息后，学习要点会显示在这里</span>
        </div>
      </div>
    );
  }

  const variants: Record<string, string> = hud.variants || hud.expression_versions || {};
  const variantKeys = ["natural_spoken", "basic", "written", "advanced"].filter(k => variants[k]);
  const mainExpr = variants[variantTab] || hud.main_expression;
  const whyItems: ChatV2WhyItem[] = Array.isArray(hud.why_this_expression) ? hud.why_this_expression : [];
  const vocab: string[] = Array.isArray(hud.vocabulary) ? hud.vocabulary : [];
  const patternsV2: ChatV2PatternItem[] = Array.isArray(hud.patterns_v2) ? hud.patterns_v2 : [];
  const agents: ChatV2AgentItem[] = Array.isArray(hud.agents) ? hud.agents : [];
  const nextQ: ChatV2NextQuestion | undefined = hud.next_question;

  const handleCrush = async (pattern: string, example: string) => {
    if (crushAdded.has(pattern)) return;
    try { await addCrushCandidate(pattern, example); setCrushAdded(s => new Set(s).add(pattern)); } catch { /* ignore */ }
  };

  return (
    <div className="learning-hud">
      <div className="hud-scroll">
        {/* Card 1: Expression */}
        <div className="hud-card">
          <div className="hud-card-title"><Sparkles size={12} /> 自然表达</div>
          {variantKeys.length > 1 && (
            <div className="hud-variant-tabs">
              {variantKeys.map(k => (
                <button key={k} className={`hud-variant-tab ${variantTab === k ? "active" : ""}`} onClick={() => setVariantTab(k)}>
                  {k === "natural_spoken" ? "自然" : k === "basic" ? "口语" : k === "written" ? "书面" : "高级"}
                </button>
              ))}
            </div>
          )}
          <div className="hud-expression-rows">
            <div className="hud-expression-row">
              <p className="hud-expression-text">{mainExpr}</p>
              <button className="tts-btn" onClick={() => speak(mainExpr, "en-US")}><Volume2 size={16} /></button>
            </div>
          </div>
          {hud.meaning_native && <p className="hud-native">{hud.meaning_native}</p>}
        </div>

        {/* Card 2: Why this expression */}
        {whyItems.length > 0 && (
          <div className="hud-card">
            <div className="hud-card-title"><Lightbulb size={12} /> 为什么这么写</div>
            <ul className="hud-why-list">
              {whyItems.map((item, i) => (
                <li key={i} onClick={() => onTokenClick(item.point, mainExpr)}>
                  <strong>{item.point}</strong> — {item.explanation}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Card 3: Key points */}
        {(vocab.length > 0 || patternsV2.length > 0) && (
          <div className="hud-card">
            <div className="hud-card-title"><GraduationCap size={12} /> 本句重点</div>
            <div className="hud-pills">
              {vocab.slice(0, 5).map((v, i) => (
                <span key={`v-${i}`} className="pill" onClick={() => onTokenClick(v, mainExpr)}>{v}</span>
              ))}
              {patternsV2.map((p, i) => (
                <span
                  key={`p-${i}`}
                  className={`pill pill-crush ${crushAdded.has(p.pattern) ? "added" : ""}`}
                  onClick={() => handleCrush(p.pattern, p.example)}
                >
                  <Flame size={10} /> {p.pattern} {crushAdded.has(p.pattern) ? "✓" : ""}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Card 4: Multi-agent analysis */}
        {agents.length > 0 && (
          <div className="hud-card">
            <div className="hud-card-title"><MessageSquare size={12} /> 多智能体解析</div>
            <div className="hud-agents">
              {agents.map((a, i) => (
                <div key={i} className="hud-agent-row">
                  <span className="hud-agent-name">{a.agent}</span>
                  <span className="hud-agent-result">{a.result}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Card 5: AI follow-up question */}
        {nextQ && (
          <div className="hud-card">
            <div className="hud-card-title"><MessageSquare size={12} /> AI 追问</div>
            <div className="hud-expression-rows">
              <div className="hud-expression-row">
                <p className="hud-expression-text" style={{ fontSize: 15 }}>{nextQ.target}</p>
                <button className="tts-btn" onClick={() => speak(nextQ.target, "en-US")}><Volume2 size={14} /></button>
              </div>
            </div>
            {nextQ.native && <p className="hud-native">{nextQ.native}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Turn Selector (horizontal chips) ─── */
function TurnSelector({ turns, activeTurnId, pinnedTurnId, onSelect, onPin, onUnpin }: {
  turns: DialogueTurn[];
  activeTurnId: string | null;
  pinnedTurnId: string | null;
  onSelect: (id: string) => void;
  onPin: (id: string) => void;
  onUnpin: () => void;
}) {
  if (turns.length <= 1) return null;
  return (
    <div className="turn-selector">
      {turns.map((turn, idx) => (
        <div
          key={turn.turn_id}
          className={`turn-chip ${turn.turn_id === activeTurnId ? "active" : ""} ${turn.pinned ? "pinned" : ""}`}
          onClick={() => onSelect(turn.turn_id)}
        >
          <span className="turn-index">T{idx + 1}</span>
          <span>{turn.label}</span>
          {turn.focusCount > 0 && <span className="turn-count">{turn.focusCount}</span>}
          {turn.pinned && <Pin size={10} className="turn-pin-icon" />}
        </div>
      ))}
      {pinnedTurnId ? (
        <button className="turn-pin-btn" onClick={onUnpin} title="取消固定"><X size={14} /></button>
      ) : activeTurnId && turns.length > 1 ? (
        <button className="turn-pin-btn" onClick={() => onPin(activeTurnId)} title="固定此轮"><Pin size={14} /></button>
      ) : null}
    </div>
  );
}

/* ─── Conversation Feed (pure chat bubbles grouped by turn) ─── */
function ConversationFeed({ messages, turns, activeTurnId, sending, streamPhase, speak, onTurnClick }: {
  messages: Message[];
  turns: DialogueTurn[];
  activeTurnId: string | null;
  sending: boolean;
  streamPhase: "replying" | "analyzing" | null;
  speak: (text: string, lang?: string) => void;
  onTurnClick: (turnId: string) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const turnByMsg = new Map<string, DialogueTurn>();
  for (const t of turns) {
    turnByMsg.set(t.user_message_id, t);
    turnByMsg.set(t.assistant_message_id, t);
  }

  const rendered: React.ReactNode[] = [];
  let i = 0;
  while (i < messages.length) {
    const msg = messages[i];
    const turn = turnByMsg.get(msg.id);

    if (turn && msg.role === "user") {
      const assistant = messages[i + 1];
      const isActive = turn.turn_id === activeTurnId;
      rendered.push(
        <div key={turn.turn_id} className={`turn-block ${isActive ? "active" : ""}`} onClick={() => onTurnClick(turn.turn_id)}>
          <div className="conv-row user">
            <div className="conv-bubble user">{msg.content}</div>
            <span className="conv-time">{new Date(msg.created_at || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          {assistant && assistant.role === "assistant" ? (
            <div className="conv-row assistant">
              <div className="conv-avatar"><MessageSquare size={12} /></div>
              <div>
                <div className="conv-bubble assistant">
                  <span>{assistant.content || ""}</span>
                  {assistant.content && (
                    <button className="conv-speak" onClick={e => { e.stopPropagation(); speak(assistant.content, "en-US"); }}><Volume2 size={14} /></button>
                  )}
                </div>
                {turn.status === "replying" && !assistant.content && (
                  <div className="conv-bubble assistant typing"><div className="thinking-dots"><i /><i /><i /></div></div>
                )}
                <span className="conv-time">
                  {turn.status === "analyzing" && <span className="learning-badge analyzing"><Loader size={10} className="spin" /> 分析中</span>}
                  {turn.status === "ready" && turn.focusCount > 0 && (
                    <span className="learning-badge" onClick={e => { e.stopPropagation(); onTurnClick(turn.turn_id); }}>
                      <Sparkles size={10} /> {turn.focusCount} 学习点
                    </span>
                  )}
                </span>
              </div>
            </div>
          ) : turn.status === "pending" || turn.status === "replying" ? (
            <div className="conv-row assistant">
              <div className="conv-avatar"><MessageSquare size={12} /></div>
              <div className="conv-bubble assistant typing"><div className="thinking-dots"><i /><i /><i /></div></div>
            </div>
          ) : null}
        </div>,
      );
      i += assistant && assistant.role === "assistant" ? 2 : 1;
    } else {
      if (msg.role === "user") {
        rendered.push(
          <div key={msg.id} className="conv-row user">
            <div className="conv-bubble user">{msg.content}</div>
          </div>,
        );
      } else {
        rendered.push(
          <div key={msg.id} className="conv-row assistant">
            <div className="conv-avatar"><MessageSquare size={12} /></div>
            <div className="conv-bubble assistant">
              <span>{msg.content}</span>
              {msg.content && <button className="conv-speak" onClick={() => speak(msg.content, "en-US")}><Volume2 size={14} /></button>}
            </div>
          </div>,
        );
      }
      i++;
    }
  }

  if (sending && streamPhase === null && (messages.length === 0 || messages[messages.length - 1].role === "user")) {
    rendered.push(
      <div key="sending-indicator" className="conv-row assistant">
        <div className="conv-avatar"><MessageSquare size={12} /></div>
        <div className="conv-bubble assistant typing"><div className="thinking-dots"><i /><i /><i /></div></div>
      </div>,
    );
  }

  return (
    <div className="conversation-feed">
      {messages.length === 0 && !sending && (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
          <p style={{ fontSize: 16, marginBottom: 8 }}>开始你的表达之旅</p>
          <span style={{ fontSize: 13 }}>输入中文或英文，AI 帮你升级表达</span>
        </div>
      )}
      {rendered}
      <div ref={bottomRef} />
    </div>
  );
}

/* ─── Token Explain Sheet (bottom sheet for clicked word) ─── */
function TokenExplainSheet({ token, context, onClose, speak }: {
  token: string; context: string;
  onClose: () => void;
  speak: (text: string, lang?: string) => void;
}) {
  const [data, setData] = useState<TokenExplain | null>(null);
  const [loading, setLoading] = useState(true);
  const [crushDone, setCrushDone] = useState(false);

  useEffect(() => {
    setLoading(true);
    explainToken(token, context).then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, [token, context]);

  return (
    <div className="knowledge-modal-overlay" onClick={onClose}>
      <div className="knowledge-modal token-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3><span className="token-title">{token}</span></h3>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        {loading ? (
          <div className="token-loading"><Loader size={16} className="spin" /> 正在查询...</div>
        ) : data ? (
          <div className="token-body">
            <div className="token-toprow">
              <button className="token-speak" onClick={() => speak(token, "en-US")}><Volume2 size={14} /> 朗读</button>
              {data.part_of_speech && <span className="token-pos">{data.part_of_speech}</span>}
            </div>
            <p className="token-line"><strong>释义：</strong>{data.meaning}</p>
            <p className="token-line"><strong>用法：</strong>{data.usage}</p>
            {data.example && (
              <div className="token-example">
                <span style={{ fontSize: 13 }}>📝 {data.example}</span>
                <button className="tts-btn" onClick={() => speak(data.example, "en-US")}><Volume2 size={12} /></button>
              </div>
            )}
            <button
              className={`hud-crush-btn ${crushDone ? "added" : ""}`}
              onClick={async () => {
                if (crushDone || !data) return;
                try { await addCrushCandidate(token, data.example, "en", "vocabulary"); setCrushDone(true); } catch {}
              }}
            >
              <Flame size={12} /> {crushDone ? "已加入消消乐" : "加入消消乐"}
            </button>
          </div>
        ) : (
          <p style={{ color: "var(--text-muted)" }}>查询失败，请稍后重试</p>
        )}
      </div>
    </div>
  );
}

/* ─── Mode indicator above composer ─── */
function ModeIndicator({ hud }: { hud: HudData }) {
  const intent = hud?.detected_intent;
  const map: Record<string, [string, string]> = {
    expression_learning: ["表达学习", "学习如何用英语表达这个意思"],
    target_correction: ["英文纠错", "帮你修正英语语法和表达"],
    free_chat: ["自由对话", "和 AI 随意交流"],
    meta_chat: ["学习讨论", "讨论学习方法和策略"],
  };
  const [label, hint] = map[intent || ""] || ["对话中", "发送消息开始学习"];
  return (
    <div className="mode-indicator">
      <span className="mode-label">{label}</span>
      <span className="mode-hint">{hint}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════════════════ */
export default function ChatDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const {
    currentConversation, loading, sending, error,
    loadConversation, streamMessage, clearCurrent,
    turns, activeTurnId, pinnedTurnId, streamPhase, hud,
    setActiveTurn, pinTurn, unpinTurn,
  } = useChatStore();

  const [draft, setDraft] = useState("");
  const [freezing, setFreezing] = useState(false);
  const [freezeAsset, setFreezeAsset] = useState<Asset | null>(null);
  const [freezeError, setFreezeError] = useState<string | null>(null);
  const [showFreeze, setShowFreeze] = useState(false);
  const [tokenSheet, setTokenSheet] = useState<{ token: string; context: string } | null>(null);

  const { speak } = useTts();

  useEffect(() => { if (id) loadConversation(id); return () => clearCurrent(); }, [id, loadConversation, clearCurrent]);

  async function handleSend() {
    const text = draft.trim();
    if (!text || !id || sending) return;
    setDraft("");
    try { await streamMessage(id, text); } catch { setDraft(text); }
  }

  async function handleFreeze() {
    if (!id || freezing || !currentConversation?.messages.length) return;
    setShowFreeze(true); setFreezing(true); setFreezeAsset(null); setFreezeError(null);
    try { const a = await freezeConversation(id, currentConversation.title); setFreezeAsset(a); }
    catch (e) { setFreezeError(e instanceof Error ? e.message : t("chat.freezeFailed")); }
    finally { setFreezing(false); }
  }

  if (loading && !currentConversation) {
    return <div className="page-center"><Loader size={24} className="spin" /></div>;
  }
  if (!currentConversation) {
    return (
      <div className="page-center">
        <p>{t("chat.notFound")}</p>
        <button className="primary-btn" onClick={() => navigate("/chat")}>{t("chat.backToList")}</button>
      </div>
    );
  }

  const messages = currentConversation.messages;

  return (
    <div className="chat-detail-layout">
      {/* Header */}
      <header className="chat-detail-header-rich">
        <div className="header-left">
          <button className="icon-btn menu-btn" onClick={() => navigate("/chat")}><ArrowLeft size={22} /></button>
          <div className="header-logo">
            <div className="logo-sparkle">✨</div>
            <div className="logo-text"><h1>Mind Dialogue</h1><p>Think in your language. Grow in another.</p></div>
          </div>
        </div>
        <div className="header-streak"><Flame size={16} color="#f97316" fill="#f97316" /> <span>连续学习</span></div>
      </header>

      {/* Turn selector */}
      <TurnSelector turns={turns} activeTurnId={activeTurnId} pinnedTurnId={pinnedTurnId} onSelect={setActiveTurn} onPin={pinTurn} onUnpin={unpinTurn} />

      {/* Learning HUD */}
      <LearningHUD hud={hud} streamPhase={streamPhase} speak={speak} onTokenClick={(token, ctx) => setTokenSheet({ token, context: ctx })} />

      {/* Conversation feed */}
      <ConversationFeed messages={messages} turns={turns} activeTurnId={activeTurnId} sending={sending} streamPhase={streamPhase} speak={speak} onTurnClick={setActiveTurn} />

      {/* Mode indicator + Composer */}
      <ModeIndicator hud={hud} />
      <div className="chat-composer-rich">
        <button className="composer-voice-btn" disabled={sending}><Mic size={20} /></button>
        <div className="composer-input-wrapper">
          <input
            value={draft}
            placeholder="输入中文或英文，AI 帮你升级表达..."
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            disabled={sending}
          />
        </div>
        <button onClick={handleSend} disabled={!draft.trim() || sending} className="composer-send-btn"><Send size={18} /></button>
      </div>

      {showFreeze && <FreezeResult asset={freezeAsset} loading={freezing} error={freezeError} onClose={() => { setShowFreeze(false); setFreezeAsset(null); setFreezeError(null); }} />}
      {tokenSheet && <TokenExplainSheet token={tokenSheet.token} context={tokenSheet.context} onClose={() => setTokenSheet(null)} speak={speak} />}

      <TabBar />
    </div>
  );
}
