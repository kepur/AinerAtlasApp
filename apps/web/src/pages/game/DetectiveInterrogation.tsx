import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ChevronLeft, Search, Bookmark, Send, RefreshCcw,
  Heart, AlertTriangle, Link, ChevronRight, HelpCircle, Lightbulb,
} from "lucide-react";
import { useGameStore } from "../../stores/gameStore";
import TTSButton from "../../components/TTSButton";
import VoiceInput from "../../components/VoiceInput";

const EMOTION_LABELS: Record<string, { label: string; emoji: string }> = {
  nervous: { label: "紧张", emoji: "😬" },
  suspicious: { label: "可疑", emoji: "🤨" },
  calm: { label: "镇定", emoji: "😐" },
  angry: { label: "愤怒", emoji: "😠" },
  defensive: { label: "戒备", emoji: "🛡️" },
};

function TypingDots() {
  return (
    <span className="detective-typing-dots" aria-label="对方正在输入">
      <span /><span /><span />
    </span>
  );
}

export default function DetectiveInterrogation() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const suspectId = searchParams.get("suspect") || "";

  const { currentSession, feedItems, currentHud, inFlightTurns, loadSession, sendDetectiveInterrogate } = useGameStore();
  const [input, setInput] = useState("");
  const [hintCollapsed, setHintCollapsed] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id && (!currentSession || currentSession.id !== id)) {
      loadSession(id);
    }
  }, [id, currentSession, loadSession]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [feedItems, inFlightTurns]);

  const view = (currentSession?.view || {}) as Record<string, any>;
  const suspects: any[] = view.suspects || [];
  const suspect = suspects.find((s) => s.id === suspectId) || suspects[0] || {
    id: suspectId, name: "Anna", role: "服务员", trust: 50, interrogated: false,
  };
  const cluesFound = (view.discovered_clues || []).length;
  const totalClues = view.total_clues || 6;
  const interrogationsUsed = view.interrogations_used || 0;
  const maxInterrogations = view.max_interrogations || 5;

  const convo = feedItems.filter(
    (f) =>
      (f.type === "user_question" || f.type === "suspect_answer") &&
      (!f.suspect_id || f.suspect_id === suspect.id)
  );

  const handleSend = (overrideText?: string) => {
    const q = (overrideText ?? input).trim();
    if (!currentSession || !q) return;
    setInput("");
    setVoiceError(null);
    void sendDetectiveInterrogate(currentSession.id, q, { suspect_id: suspect.id }).catch(() => {
      setVoiceError("发送失败，请重试");
    });
  };

  const handleVoiceTranscript = (text: string) => {
    if (!text.trim()) {
      setVoiceError("未识别到语音，请再试一次");
      return;
    }
    setVoiceError(null);
    handleSend(text);
  };

  const suspicionColor = (suspect.trust ?? 50) <= 40 ? "red" : (suspect.trust ?? 50) <= 60 ? "orange" : "green";

  const hud = (currentHud || {}) as Record<string, any>;
  const hintEn = hud.main_expression || "When was the last time you saw the owner?";
  const hintZh = hud.meaning_native || "你最后一次见到老板是什么时候？";
  const firstPattern = Array.isArray(hud.patterns_v2) && hud.patterns_v2[0]
    ? (typeof hud.patterns_v2[0] === "string" ? hud.patterns_v2[0] : hud.patterns_v2[0].pattern)
    : "When was the last time you...?";
  const hintChips: string[] = Array.isArray(hud.vocabulary) && hud.vocabulary.length
    ? hud.vocabulary.slice(0, 3)
    : ["询问具体时间线", "When was the last time you...?"];

  const initial = (suspect.name || "?").charAt(0);

  return (
    <div
      className="detective-interrogation immersive-layout w-full h-full min-h-0 flex flex-col font-sans overflow-hidden"
      style={{ background: "linear-gradient(180deg, #f5f3ff 0%, #faf9ff 100%)" }}
    >
      <header className="shrink-0 flex items-center justify-between px-4 pt-3 pb-2 bg-white border-b border-purple-100">
        <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-purple-50">
          <ChevronLeft size={22} className="text-[#374151]" />
        </button>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5">
            <span className="text-lg">🕵️</span>
            <span className="font-bold text-[16px] text-[#111827]">AI侦探</span>
          </div>
          <span className="text-[11px] text-[#9ca3af]">嫌疑人审问</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">
            <Search size={11} className="text-purple-500" />
            <span className="text-[11px] text-purple-700 font-bold">线索 {cluesFound}/{totalClues}</span>
          </div>
          <button className="w-8 h-8 flex items-center justify-center rounded-full bg-purple-50 border border-purple-100">
            <Bookmark size={16} className="text-purple-500" />
          </button>
        </div>
      </header>

      <div className="detective-glass-surface shrink-0 mx-4 mt-3 flex items-center gap-3 px-4 py-3">
        <div className="w-12 h-10 rounded-xl bg-purple-900 shrink-0 overflow-hidden flex items-center justify-center shadow-inner">
          <span className="text-xl">☕</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[13px] text-[#111827] truncate">{currentSession?.title || "咖啡馆的谎言"}</span>
            <span className="bg-orange-50 text-orange-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-orange-100">审问中</span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[11px] text-purple-600 flex items-center gap-1 font-medium">
              <Search size={10} /> 线索 {cluesFound}/{totalClues}
            </span>
            <span className="text-[11px] text-orange-500 flex items-center gap-1 font-medium">
              <span>👤</span> 审问 {interrogationsUsed}/{maxInterrogations}
            </span>
          </div>
        </div>
        <ChevronRight size={16} className="text-[#9ca3af] shrink-0" />
      </div>

      <div className="detective-glass-surface shrink-0 mx-4 mt-2 overflow-hidden">
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <div className="w-14 h-14 rounded-[16px] shrink-0 overflow-hidden border border-white/60 shadow-sm bg-gradient-to-br from-[#c4b5fd] to-[#a78bfa] flex items-center justify-center">
            <span className="text-white font-extrabold text-xl leading-none">{initial}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 flex-wrap">
              <h2 className="font-bold text-[13px] text-[#111827] truncate">{suspect.role} {suspect.name}</h2>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 border shrink-0 ${
                suspicionColor === "red" ? "bg-red-50/90 text-red-600 border-red-100"
                : suspicionColor === "orange" ? "bg-orange-50/90 text-orange-600 border-orange-100"
                : "bg-green-50/90 text-green-600 border-green-100"}`}>
                <AlertTriangle size={8} /> {suspect.trust ?? 50}
              </span>
              {suspect.interrogated && (
                <span className="bg-purple-50/90 border border-purple-100/60 text-purple-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0">已审问</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-auto">
            <button type="button" className="detective-glass-chip detective-glass-chip--sm whitespace-nowrap">
              <span>📋</span> 不在场证明
            </button>
            <button type="button" className="detective-glass-icon-btn w-7 h-7" title="关联线索">
              <Link size={12} className="text-purple-600" />
            </button>
            <button type="button" className="detective-glass-icon-btn w-7 h-7 text-[#ec4899]" title="关注">
              <Heart size={12} fill="currentColor" />
            </button>
          </div>
        </div>
      </div>

      <div className="detective-glass-surface detective-hint-panel shrink-0 mx-4 mt-2">
        <button
          type="button"
          className="detective-hint-header"
          onClick={() => setHintCollapsed(!hintCollapsed)}
        >
          <div className="flex items-center gap-1.5">
            <span className="detective-glass-icon-btn w-6 h-6">
              <Lightbulb size={12} className="text-purple-500" />
            </span>
            <span className="text-purple-700 font-bold text-[12px]">学习提示</span>
            <span className="text-[#9ca3af] text-[11px] font-medium">Learning Hint</span>
          </div>
          <span className="detective-collapse-pill">{hintCollapsed ? "展开 ∨" : "收起 ∧"}</span>
        </button>
        {!hintCollapsed && (
          <div className="detective-hint-body">
            <div className="flex items-center gap-2">
              <span className="detective-hint-en">{hintEn}</span>
              <TTSButton text={hintEn} lang="en" voice="neutral_narrator" size={12} className="detective-glass-icon-btn" />
            </div>
            <span className="detective-hint-zh">{hintZh}</span>
            <div className="detective-chip-row">
              {hintChips.map((c, i) => (
                <button key={i} type="button" onClick={() => setInput(typeof c === "string" ? c : "")} className="detective-glass-chip">{c}</button>
              ))}
              <button type="button" className="detective-glass-refresh">
                <RefreshCcw size={11} /> 换一句
              </button>
            </div>
            <div className="detective-glass-inset">
              <p><b>句型：</b>{firstPattern}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-2 flex flex-col gap-3.5 no-scrollbar">
        {convo.length === 0 && (
          <div className="text-center text-[12px] text-[#9ca3af] py-8 font-medium">
            开始审问 {suspect.name}。用中文或英文提问，AI 会帮你学习地道表达。
          </div>
        )}
        {convo.map((msg, i) =>
          msg.type === "user_question" ? (
            <div key={msg.turn_id ? `${msg.turn_id}-q` : i} className="flex justify-end items-end gap-2">
              <div className="flex flex-col items-end max-w-[75%]">
                <div className="bg-gradient-to-br from-[#7c3aed] to-[#6366f1] text-white rounded-[22px] rounded-br-[6px] px-4.5 py-3 shadow-[0_3px_12px_rgba(124,58,237,0.15)]">
                  <p className="text-[13px] font-semibold leading-snug">{msg.text}</p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4c1d95] to-[#6d28d9] flex items-center justify-center shrink-0 shadow-md">
                <span className="text-base">🕵️</span>
              </div>
            </div>
          ) : (
            <div key={msg.turn_id ? `${msg.turn_id}-a` : i} className="flex items-end gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#c4b5fd] to-[#a78bfa] flex items-center justify-center shrink-0 shadow-md overflow-hidden border border-purple-100">
                {suspect.avatar_url
                  ? <img src={suspect.avatar_url} alt={suspect.name} className="w-full h-full object-cover" />
                  : <span className="text-white font-bold text-sm">{((msg.suspect_name as string) || suspect.name || "?").charAt(0)}</span>}
              </div>
              <div className="flex flex-col max-w-[75%]">
                <span className="text-[11px] font-bold text-[#7c3aed] ml-1 mb-0.5 inline-flex items-center gap-1.5">
                  {(msg.suspect_name as string) || suspect.name}
                  {!msg._thinking && msg.text ? (
                    <TTSButton text={String(msg.text || "")} lang="en" voice={suspect.voice || "neutral_narrator"} size={10} className="w-5 h-5 rounded-full bg-purple-50 flex items-center justify-center text-purple-500 hover:bg-purple-100 transition-colors" />
                  ) : null}
                  {msg.emotion && !msg._thinking ? (
                    <span className="text-[#9ca3af] font-normal ml-1 bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded-full text-[9px]">
                      {EMOTION_LABELS[msg.emotion as string]?.emoji} {EMOTION_LABELS[msg.emotion as string]?.label}
                    </span>
                  ) : null}
                  {msg._thinking ? <span className="text-[#9ca3af] font-normal text-[9px]">思考中</span> : null}
                </span>
                <div className="bg-white rounded-[22px] rounded-bl-[6px] px-4.5 py-3 shadow-[0_3px_12px_rgba(124,58,237,0.03)] border border-purple-50/80 min-h-[44px] flex items-center">
                  {msg._thinking && !msg.text ? (
                    <TypingDots />
                  ) : (
                    <>
                      <p className="text-[13px] text-[#111827] leading-relaxed font-medium">{msg.text}</p>
                      {msg.text_native ? <p className="text-[10px] text-[#9ca3af] mt-1.5">{msg.text_native as string}</p> : null}
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        )}
        <div ref={endRef} />
      </div>

      <div className="detective-glass-input-bar shrink-0 px-4 py-3.5">
        {voiceError ? <p className="text-[11px] text-red-500 mb-2 px-1">{voiceError}</p> : null}
        <div className="detective-glass-input-wrap">
          <VoiceInput
            className="voice-input-glass voice-input-glass--compact"
            iconSize={18}
            mode="tap"
            autoStopSilenceMs={1200}
            language="auto"
            onTranscript={handleVoiceTranscript}
            onError={(msg) => setVoiceError(msg)}
            title="点击说话 · 停顿 1.2 秒自动识别"
          />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
            placeholder="输入中文或英文，AI 帮你组织审问表达..."
            className="flex-1 bg-transparent text-[14px] text-[#374151] border-none outline-none placeholder-[#9ca3af]"
            style={{ border: "none", outline: "none", boxShadow: "none" }}
          />
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!input.trim()}
            className="w-10 h-10 rounded-full bg-gradient-to-r from-[#7c3aed] to-[#6366f1] flex items-center justify-center shadow-[0_4px_14px_rgba(124,58,237,0.32),inset_0_1px_0_rgba(255,255,255,0.25)] shrink-0 disabled:opacity-40 active:scale-95 transition-all duration-200"
          >
            <Send size={15} className="text-white" />
          </button>
        </div>
        {inFlightTurns > 0 ? (
          <p className="text-[10px] text-purple-500 mt-2 px-1">{inFlightTurns} 条审问等待回复中，你可以继续提问</p>
        ) : null}
      </div>

      <div className="detective-glass-action-bar shrink-0 px-4 pt-3 pb-[max(env(safe-area-inset-bottom,12px),12px)]">
        <div className="grid grid-cols-4 gap-3">
          <button type="button" onClick={() => setInput("Can you explain why ")} className="detective-glass-action detective-glass-action--purple">
            <HelpCircle size={16} className="text-purple-500" />
            <span>追问问题</span>
          </button>
          <button type="button" onClick={() => setInput("That doesn't add up. ")} className="detective-glass-action detective-glass-action--orange">
            <AlertTriangle size={16} className="text-orange-500" />
            <span>指出矛盾</span>
          </button>
          <button type="button" onClick={() => navigate(-1)} className="detective-glass-action detective-glass-action--blue">
            <Search size={16} className="text-blue-500" />
            <span>查看线索</span>
          </button>
          <button type="button" onClick={() => navigate(-1)} className="detective-glass-action detective-glass-action--accent">
            <Lightbulb size={16} />
            <span>提交推理</span>
          </button>
        </div>
      </div>
    </div>
  );
}
