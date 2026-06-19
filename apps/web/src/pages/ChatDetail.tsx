import "../MessageBubble.css";
import "../components/ambient/ambient.css";
import {
  ArrowLeft, Loader, Send, Volume2, VolumeX, Lightbulb,
  MessageSquare, Flame, X, Mic, Sparkles, Pin,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Asset, Message } from "../api";
import { freezeConversation } from "../api";
import { AmbientScene, CompanionPet, deriveChatSceneMood } from "../components/ambient";
import FreezeResult from "../components/FreezeResult";
import { LearningHUD, TokenExplainSheet, TurnSelector, useTts } from "../components/learning";
import { useI18n } from "../i18n";
import { useChatStore, type DialogueTurn, type HudData } from "../stores/chatStore";
import { useChatPrefsStore } from "../stores/chatPrefsStore";

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
                <div className={`conv-bubble assistant${!assistant.content && turn.status === "replying" ? " typing" : ""}`}>
                  {assistant.content ? (
                    <>
                      <span>{assistant.content}</span>
                      <button className="conv-speak" onClick={e => { e.stopPropagation(); speak(assistant.content, "en-US"); }}><Volume2 size={14} /></button>
                    </>
                  ) : (turn.status === "replying" || turn.status === "pending") ? (
                    <div className="thinking-dots"><i /><i /><i /></div>
                  ) : null}
                </div>
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
          ) : (turn.status === "pending" || turn.status === "replying") ? (
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

/* ─── Correction Banner (subtle breathing-light strip) ─── */
function CorrectionBanner({ hud, speak }: { hud: HudData; speak: (text: string, lang?: string) => void }) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => { setDismissed(false); }, [hud?.corrected_sentence]);

  if (dismissed || !hud?.corrected_sentence || hud.detected_intent !== "target_correction") return null;

  const mistakes = Array.isArray(hud.mistakes) ? hud.mistakes : [];

  return (
    <div className="correction-banner">
      <div className="correction-glow" />
      <div className="correction-content">
        <div className="correction-label">
          <span className="correction-dot" />
          <span>{mistakes.length > 0 ? `${mistakes.length} 处修正` : "语法修正"}</span>
        </div>
        <div className="correction-sentence" onClick={() => speak(hud.corrected_sentence!, "en-US")}>
          <span className="correction-text">{hud.corrected_sentence}</span>
          <Volume2 size={14} className="correction-play" />
        </div>
      </div>
      <button className="correction-dismiss" onClick={() => setDismissed(true)}><X size={12} /></button>
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
  const [autoTts, setAutoTts] = useState(() => {
    const v = localStorage.getItem("ainerspeak_auto_tts");
    return v !== null ? v === "true" : true;
  });

  const { speak } = useTts();
  const fontSize = useChatPrefsStore((s) => s.fontSize);
  const bubbleDensity = useChatPrefsStore((s) => s.bubbleDensity);

  useEffect(() => { localStorage.setItem("ainerspeak_auto_tts", String(autoTts)); }, [autoTts]);

  const prevSendingRef = useRef(false);
  useEffect(() => {
    if (prevSendingRef.current && !sending && autoTts) {
      const latest = turns[turns.length - 1];
      if (latest?.status === "ready" && latest.ai_reply) {
        speak(latest.ai_reply, "en-US");
      }
    }
    prevSendingRef.current = sending;
  }, [sending, autoTts, turns, speak]);

  useEffect(() => { if (id) loadConversation(id); return () => clearCurrent(); }, [id, loadConversation, clearCurrent]);

  const petMood = useMemo(
    () => deriveChatSceneMood({ sending, streamPhase, turns, draft }),
    [sending, streamPhase, turns, draft],
  );
  const sceneEnergized = sending || draft.trim().length > 0;

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
    <div
      className={`chat-detail-layout ambient-shell chat-font-${fontSize} chat-density-${bubbleDensity}`}
    >
      <AmbientScene mood={petMood} energized={sceneEnergized} />

      <div className="chat-detail-ambient-body">
      {/* Header */}
      <header className="chat-detail-header-rich">
        <div className="header-left">
          <button className="icon-btn menu-btn" onClick={() => navigate("/chat")}><ArrowLeft size={22} /></button>
          <div className="header-logo">
            <div className="logo-sparkle">✨</div>
            <div className="logo-text"><h1>Mind Dialogue</h1><p>Think in your language. Grow in another.</p></div>
          </div>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="freeze-header-btn"
            onClick={() => void handleFreeze()}
            disabled={freezing || messages.length < 2}
            title={t("chat.freezeTitle")}
          >
            <Pin size={16} />
            <span>{freezing ? t("chat.freezing") : t("chat.freeze")}</span>
          </button>
          <button className={`auto-tts-toggle ${autoTts ? "on" : "off"}`} onClick={() => setAutoTts(v => !v)} title={autoTts ? "自动语音已开启" : "自动语音已关闭"}>
            {autoTts ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <div className="header-streak"><Flame size={16} color="#f97316" fill="#f97316" /> <span>连续学习</span></div>
        </div>
      </header>

      {/* Turn selector */}
      <TurnSelector turns={turns} activeTurnId={activeTurnId} pinnedTurnId={pinnedTurnId} onSelect={setActiveTurn} onPin={pinTurn} onUnpin={unpinTurn} />

      {/* Learning HUD — per-turn tips, not the Freeze report */}
      <p className="chat-hud-hint px-4 text-[11px] text-on-surface-variant">
        本轮学习要点（实时）· 完整思想资产请点右上角 Freeze
      </p>
      <LearningHUD hud={hud} streamPhase={streamPhase} speak={speak} onTokenClick={(token, ctx) => setTokenSheet({ token, context: ctx })} />

      {/* Conversation feed */}
      <ConversationFeed messages={messages} turns={turns} activeTurnId={activeTurnId} sending={sending} streamPhase={streamPhase} speak={speak} onTurnClick={setActiveTurn} />

      {/* Correction banner (subtle, above composer) */}
      <CorrectionBanner hud={hud} speak={speak} />

      {/* Mode indicator + Composer */}
      <CompanionPet mood={petMood} compact />
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
      </div>

      {showFreeze && <FreezeResult asset={freezeAsset} loading={freezing} error={freezeError} onClose={() => { setShowFreeze(false); setFreezeAsset(null); setFreezeError(null); }} />}
      {tokenSheet && <TokenExplainSheet token={tokenSheet.token} context={tokenSheet.context} onClose={() => setTokenSheet(null)} speak={speak} />}
    </div>
  );
}
