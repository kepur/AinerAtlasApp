import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ChevronLeft, Search, Bookmark, Volume2, Send, Mic, RefreshCcw,
  Heart, AlertTriangle, Link, Clock, ChevronRight, HelpCircle, Lightbulb, Loader2
} from "lucide-react";
import { useGameStore } from "../../stores/gameStore";
import TTSButton from "../../components/TTSButton";

const EMOTION_LABELS: Record<string, { label: string; emoji: string }> = {
  nervous: { label: "紧张", emoji: "😬" },
  suspicious: { label: "可疑", emoji: "🤨" },
  calm: { label: "镇定", emoji: "😐" },
  angry: { label: "愤怒", emoji: "😠" },
  defensive: { label: "戒备", emoji: "🛡️" },
};

export default function DetectiveInterrogation() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const suspectId = searchParams.get("suspect") || "";

  const { currentSession, feedItems, currentHud, turnLoading, loadSession, sendTurn } = useGameStore();
  const [input, setInput] = useState("");
  const [hintCollapsed, setHintCollapsed] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id && (!currentSession || currentSession.id !== id)) {
      loadSession(id);
    }
  }, [id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [feedItems, turnLoading]);

  const view = (currentSession?.view || {}) as Record<string, any>;
  const suspects: any[] = view.suspects || [];
  const suspect = suspects.find((s) => s.id === suspectId) || suspects[0] || {
    id: suspectId, name: "Anna", role: "服务员", trust: 50, interrogated: false,
  };
  const cluesFound = (view.discovered_clues || []).length;
  const totalClues = view.total_clues || 6;
  const interrogationsUsed = view.interrogations_used || 0;
  const maxInterrogations = view.max_interrogations || 5;

  // Only show this suspect's interrogation messages
  const convo = feedItems.filter(
    (f) => f.type === "user_question" || f.type === "suspect_answer"
  );

  const handleSend = async () => {
    if (!currentSession || !input.trim() || turnLoading) return;
    const q = input.trim();
    setInput("");
    await sendTurn(currentSession.id, "interrogate", q, { suspect_id: suspect.id });
  };

  const suspicionColor = (suspect.trust ?? 50) <= 40 ? "red" : (suspect.trust ?? 50) <= 60 ? "orange" : "green";

  // Learning hint from the latest HUD
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
      className="w-full h-screen flex flex-col font-sans overflow-hidden"
      style={{ background: "linear-gradient(180deg, #f5f3ff 0%, #faf9ff 100%)" }}
    >
      {/* ── Header ── */}
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

      {/* ── Case Banner ── */}
      <div className="shrink-0 mx-4 mt-3 bg-white rounded-2xl border border-purple-100 shadow-sm flex items-center gap-3 px-3 py-2.5">
        <div className="w-14 h-10 rounded-xl bg-purple-900 shrink-0 overflow-hidden flex items-center justify-center">
          <span className="text-2xl">☕</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[13px] text-[#111827] truncate">{currentSession?.title || "咖啡馆的谎言"}</span>
            <span className="bg-orange-100 text-orange-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">审问中</span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[11px] text-purple-600 flex items-center gap-1">
              <Search size={10} /> 线索 {cluesFound}/{totalClues}
            </span>
            <span className="text-[11px] text-orange-500 flex items-center gap-1">
              <span>👤</span> 审问 {interrogationsUsed}/{maxInterrogations}
            </span>
          </div>
        </div>
        <ChevronRight size={16} className="text-[#9ca3af] shrink-0" />
      </div>

      {/* ── Suspect Card ── */}
      <div className="shrink-0 mx-4 mt-3 bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
        <div className="flex gap-3 p-3">
          <div className="w-20 h-24 rounded-xl bg-gradient-to-b from-purple-100 to-purple-50 shrink-0 flex items-center justify-center overflow-hidden border border-purple-100">
            <div className="w-full h-full bg-gradient-to-b from-[#c4b5fd] to-[#a78bfa] flex items-center justify-center">
              <span className="text-white font-extrabold text-3xl">{initial}</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-bold text-[15px] text-[#111827]">{suspect.role} {suspect.name}</h2>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                    suspicionColor === "red" ? "bg-red-50 text-red-600 border-red-200"
                    : suspicionColor === "orange" ? "bg-orange-50 text-orange-600 border-orange-200"
                    : "bg-green-50 text-green-600 border-green-200"}`}>
                    <AlertTriangle size={9} /> 信任度 {suspect.trust ?? 50}
                  </span>
                  {suspect.interrogated && (
                    <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full">已审问</span>
                  )}
                </div>
                <p className="text-[11px] text-[#6b7280] mt-1.5">{suspect.role}</p>
              </div>
              <button className="flex items-center gap-1 text-[#ec4899] text-[11px] font-medium shrink-0">
                <Heart size={12} /> 关注
              </button>
            </div>
            <div className="flex gap-1.5 mt-2 flex-wrap">
              <button className="flex items-center gap-1 bg-purple-50 border border-purple-100 text-purple-700 text-[10px] font-bold px-2 py-1 rounded-lg">
                <span>📋</span> 查看不在场证明
              </button>
              <button className="flex items-center gap-1 bg-purple-50 border border-purple-100 text-purple-700 text-[10px] font-bold px-2 py-1 rounded-lg">
                <Link size={10} /> 关联线索
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Learning Hint ── */}
      <div className="shrink-0 mx-4 mt-3 bg-purple-50 border border-purple-200 rounded-2xl overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-3 py-2"
          onClick={() => setHintCollapsed(!hintCollapsed)}
        >
          <div className="flex items-center gap-1.5">
            <Lightbulb size={14} className="text-purple-500" />
            <span className="text-purple-700 font-bold text-[12px]">学习提示</span>
            <span className="text-[#9ca3af] text-[11px]">Learning Hint</span>
          </div>
          <span className="text-purple-400 text-[11px]">{hintCollapsed ? "展开 ∨" : "收起 ∧"}</span>
        </button>
        {!hintCollapsed && (
          <div className="px-3 pb-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-bold text-[#111827]">{hintEn}</span>
              <TTSButton text={hintEn} lang="en" voice="neutral_narrator" size={12} className="w-6 h-6 rounded-full bg-purple-200 flex items-center justify-center text-purple-600 shrink-0" />
            </div>
            <span className="text-[12px] text-[#6b7280]">{hintZh}</span>
            <div className="flex items-center gap-2 flex-wrap">
              {hintChips.map((c, i) => (
                <button key={i} onClick={() => setInput(typeof c === "string" ? c : "")} className="bg-white border border-purple-200 text-purple-700 text-[10px] font-medium px-2 py-1 rounded-lg">{c}</button>
              ))}
              <button className="ml-auto flex items-center gap-1 text-purple-500 text-[10px] font-bold">
                <RefreshCcw size={10} /> 换一句
              </button>
            </div>
            <div className="bg-white/60 rounded-xl px-2.5 py-1.5 mt-0.5">
              <p className="text-[10px] text-[#6b7280]"><span className="font-bold text-purple-600">句型：</span>{firstPattern}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Chat Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-2 flex flex-col gap-3 no-scrollbar">
        {convo.length === 0 && (
          <div className="text-center text-[12px] text-[#9ca3af] py-6">
            开始审问 {suspect.name}。用中文或英文提问，AI 会帮你学习地道表达。
          </div>
        )}
        {convo.map((msg, i) =>
          msg.type === "user_question" ? (
            <div key={i} className="flex justify-end items-end gap-2">
              <div className="flex flex-col items-end max-w-[72%]">
                <div className="bg-gradient-to-br from-[#7c3aed] to-[#6366f1] text-white rounded-[18px] rounded-tr-[4px] px-4 py-3">
                  <p className="text-sm font-semibold leading-snug">{msg.text}</p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4c1d95] to-[#6d28d9] flex items-center justify-center shrink-0 shadow-sm">
                <span className="text-base">🕵️</span>
              </div>
            </div>
          ) : (
            <div key={i} className="flex items-end gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#c4b5fd] to-[#a78bfa] flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                {suspect.avatar_url
                  ? <img src={suspect.avatar_url} alt={suspect.name} className="w-full h-full object-cover" />
                  : <span className="text-white font-bold text-sm">{((msg.suspect_name as string) || suspect.name || "?").charAt(0)}</span>}
              </div>
              <div className="flex flex-col max-w-[72%]">
                <span className="text-[11px] font-bold text-[#7c3aed] ml-1 mb-0.5 inline-flex items-center gap-1">
                  {(msg.suspect_name as string) || suspect.name}
                  <TTSButton text={String(msg.text || "")} lang="en" voice={suspect.voice || "neutral_narrator"} size={10} className="w-5 h-5 rounded-full bg-purple-50 flex items-center justify-center text-purple-500" />
                  {msg.emotion ? <span className="text-[#9ca3af] font-normal ml-1">{EMOTION_LABELS[msg.emotion as string]?.emoji} {EMOTION_LABELS[msg.emotion as string]?.label}</span> : null}
                </span>
                <div className="bg-white rounded-[18px] rounded-tl-[4px] px-4 py-3 shadow-sm border border-purple-50">
                  <p className="text-sm text-[#111827] leading-relaxed">{msg.text}</p>
                  {msg.text_native ? <p className="text-[10px] text-[#9ca3af] mt-1">{msg.text_native as string}</p> : null}
                </div>
              </div>
            </div>
          )
        )}
        {turnLoading && (
          <div className="flex items-center gap-2 px-2">
            <Loader2 size={14} className="animate-spin text-purple-500" />
            <span className="text-[#6b7280] text-xs">{suspect.name} 正在回答...</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* ── Input Bar ── */}
      <div className="shrink-0 bg-white border-t border-purple-100 px-4 py-3">
        <div className="flex items-center gap-2 bg-[#f5f3ff] rounded-full px-4 py-2.5 border border-purple-100">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="输入中文或英文，AI 帮你组织审问表达..."
            className="flex-1 bg-transparent text-[13px] text-[#374151] outline-none placeholder-[#9ca3af]"
          />
          <button className="w-7 h-7 flex items-center justify-center text-purple-400">
            <Mic size={16} />
          </button>
          <button
            onClick={handleSend}
            disabled={turnLoading || !input.trim()}
            className="w-8 h-8 rounded-full bg-[#7c3aed] flex items-center justify-center shadow-md shrink-0 disabled:opacity-40"
          >
            {turnLoading ? <Loader2 size={14} className="text-white animate-spin" /> : <Send size={14} className="text-white" />}
          </button>
        </div>
      </div>

      {/* ── Action Buttons ── */}
      <div className="shrink-0 bg-white border-t border-gray-50 px-4 pb-6 pt-2">
        <div className="grid grid-cols-4 gap-2">
          <button onClick={() => setInput("Can you explain why ")} className="flex flex-col items-center gap-1 bg-purple-50 border border-purple-100 rounded-xl py-2 px-1">
            <HelpCircle size={16} className="text-purple-500" />
            <span className="text-[10px] font-bold text-purple-700">追问问题</span>
          </button>
          <button onClick={() => setInput("That doesn't add up. ")} className="flex flex-col items-center gap-1 bg-orange-50 border border-orange-100 rounded-xl py-2 px-1">
            <AlertTriangle size={16} className="text-orange-500" />
            <span className="text-[10px] font-bold text-orange-700">指出矛盾</span>
          </button>
          <button onClick={() => navigate(-1)} className="flex flex-col items-center gap-1 bg-blue-50 border border-blue-100 rounded-xl py-2 px-1">
            <Search size={16} className="text-blue-500" />
            <span className="text-[10px] font-bold text-blue-700">查看线索</span>
          </button>
          <button onClick={() => navigate(-1)} className="flex flex-col items-center gap-1 bg-[#7c3aed] rounded-xl py-2 px-1 shadow-md shadow-purple-200">
            <Lightbulb size={16} className="text-white" />
            <span className="text-[10px] font-bold text-white">提交推理</span>
          </button>
        </div>
      </div>
    </div>
  );
}
