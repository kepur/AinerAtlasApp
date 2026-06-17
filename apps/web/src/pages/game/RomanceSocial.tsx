import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft, Volume2, Heart, Coffee, Sparkles, HeartHandshake, Leaf,
  Lightbulb, Send, Mic, Flame, Loader2,
} from "lucide-react";
import { useGameStore, FeedItem } from "../../stores/gameStore";
import TTSButton from "../../components/TTSButton";

const TABS = [
  { id: "warmup", icon: Coffee, label: "暖场", phase: "icebreaker" },
  { id: "flirt", icon: Heart, label: "暧昧", phase: "flirting" },
  { id: "date", icon: Sparkles, label: "约会", phase: "dating" },
  { id: "couple", icon: HeartHandshake, label: "心动·情侣", phase: "couple" },
];

const PHASE_TO_TAB: Record<string, string> = {
  icebreaker: "warmup", flirting: "flirt", dating: "date", couple: "couple",
};

const ACTION_PRESETS: Record<string, string> = {
  轻松回应: "Haha that's so true, I feel the same way!",
  表达好感: "I really enjoy spending time with you.",
  幽默一点: "Careful, you might make me blush! 😄",
  更进一步: "I've really started to fall for you. Want to be more than friends?",
};

interface HintCard { title?: string; en?: string; zh?: string; breakdown?: string[] }

export default function RomanceSocial() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const targetId = id && !/^[0-9a-fA-F-]{36}$/.test(id) ? id : "mia";

  const {
    currentSession, feedItems, currentHud, turnLoading,
    createSession, loadSession, sendTurn, clearCurrent,
  } = useGameStore();

  const [inputText, setInputText] = useState("");
  const [creating, setCreating] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isUuid = id && /^[0-9a-fA-F-]{36}$/.test(id);
    if (isUuid) {
      if (!currentSession || currentSession.id !== id) loadSession(id);
      return;
    }
    (async () => {
      if (creating) return;
      setCreating(true);
      try {
        const sess = await createSession("romance", undefined, { target_id: targetId });
        navigate(`/game/romance-social/${sess.id}`, { replace: true });
      } finally {
        setCreating(false);
      }
    })();
    return () => { /* keep session in store */ };
  }, [id]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [feedItems, turnLoading]);

  const view = (currentSession?.view || {}) as Record<string, any>;
  const target = view.target || { name: "Mia", age: 25, role: "咖啡店常客", initial_scene: "咖啡店初次见面" };
  const score = (currentHud?.relationship_score as number) ?? view.relationship_score ?? 0;
  const phase = currentSession?.phase || "icebreaker";
  const activeTab = PHASE_TO_TAB[phase] || "warmup";

  // Latest hint card for the learning HUD
  const lastHint = [...feedItems].reverse().find((f) => f.type === "hint_card") as (FeedItem & HintCard) | undefined;
  const lastChar = [...feedItems].reverse().find((f) => f.type === "char_msg");
  const learningPoint = (lastChar?.learning_point || null) as { title?: string; desc?: string } | null;

  const phraseEn = lastHint?.en || "You seem really easy to talk to.";
  const phraseZh = lastHint?.zh || "你感觉很容易相处。";
  const breakdown = lastHint?.breakdown || [];

  const send = async (text: string) => {
    if (!currentSession || !text.trim() || turnLoading) return;
    setInputText("");
    await sendTurn(currentSession.id, "user_action", text.trim());
  };

  if (creating || !currentSession) {
    return (
      <div className="w-full h-screen bg-[#fdf2f8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-[#ec4899]" />
          <span className="text-[#9d4d6e] text-sm">正在准备约会场景...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#fdf2f8] flex flex-col max-w-[480px] mx-auto relative overflow-hidden">
      {/* Background board (faint scene) for immersion */}
      {target.cover_url && (
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img src={target.cover_url} alt="" className="w-full h-full object-cover opacity-[0.12]" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#fdf2f8]/70 via-[#fdf2f8]/60 to-[#fdf2f8]" />
        </div>
      )}
      {/* Sticky top */}
      <div className="sticky top-0 z-40 bg-[#fdf2f8]/80 backdrop-blur-sm">
        {/* Header */}
        <header className="flex items-center justify-between px-4 pt-[env(safe-area-inset-top,16px)] h-14">
          <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center text-gray-700 bg-white/60 rounded-full">
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <h1 className="font-bold text-[15px] text-[#be185d]">恋爱社交表达练习</h1>
            <p className="text-[10px] text-[#9ca3af]">Romance Social</p>
          </div>
          <div className="flex items-center gap-1 bg-gradient-to-r from-pink-400 to-rose-400 text-white px-2.5 py-1 rounded-full text-[11px] font-bold shadow-sm">
            <Flame size={12} /> {score}/100
          </div>
        </header>

        {/* Tabs (phase indicators) */}
        <div className="flex gap-2 px-4 pb-2">
          {TABS.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <div key={t.id} className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-full text-[12px] font-bold ${
                isActive ? "bg-gradient-to-r from-pink-400 to-rose-400 text-white shadow-sm" : "bg-white/70 text-[#be185d]"
              }`}>
                <t.icon size={12} /> {t.label}
              </div>
            );
          })}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-44 no-scrollbar relative z-10">
        {/* Learning HUD cards */}
        <div className="px-4 pt-2 grid grid-cols-2 gap-3">
          {/* 自然表达 */}
          <div className="bg-white rounded-2xl border border-pink-100 p-3 shadow-sm">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-100 to-pink-200 flex items-center justify-center"><Leaf size={12} className="text-pink-500" /></div>
              <span className="text-[11px] font-bold text-[#be185d]">自然表达</span>
            </div>
            <div className="text-[12px] font-extrabold text-[#1f2937] leading-snug">{phraseEn}</div>
            <div className="text-[10px] text-[#9ca3af] mt-1">{phraseZh}</div>
            <TTSButton text={phraseEn} lang="en" voice="neutral_narrator" size={12} className="mt-2 w-7 h-7 rounded-full bg-gradient-to-br from-pink-300 to-pink-500 flex items-center justify-center text-white" />
            <button onClick={() => setInputText(phraseEn)} className="mt-2 ml-2 text-[10px] text-pink-500 font-bold">套用</button>
          </div>

          {/* 为什么这么说 */}
          <div className="bg-white rounded-2xl border border-pink-100 p-3 shadow-sm">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center"><Lightbulb size={12} className="text-amber-500" /></div>
              <span className="text-[11px] font-bold text-[#b45309]">为什么这么说</span>
            </div>
            {breakdown.length > 0 ? (
              <div className="flex flex-col gap-1">
                {breakdown.slice(0, 3).map((b, i) => (
                  <p key={i} className="text-[10px] text-[#4b5563] leading-snug">• {b}</p>
                ))}
              </div>
            ) : learningPoint ? (
              <div>
                <p className="text-[11px] font-bold text-[#1f2937]">{learningPoint.title}</p>
                <p className="text-[10px] text-[#6b7280] mt-0.5 leading-snug">{learningPoint.desc}</p>
              </div>
            ) : (
              <p className="text-[10px] text-[#9ca3af]">开始对话，AI 会拆解你的表达技巧。</p>
            )}
          </div>
        </div>

        {/* Scene bar */}
        <div className="mx-4 mt-3 bg-white/70 rounded-2xl border border-pink-100 px-3 py-2.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-300 to-rose-400 flex items-center justify-center shrink-0 overflow-hidden">
            {target.avatar_url
              ? <img src={target.avatar_url} alt={target.name} className="w-full h-full object-cover" />
              : <span className="text-white font-bold">{(target.name || "M").charAt(0)}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold text-[#1f2937]">{target.name} · {target.age}岁 <span className="text-[#9ca3af] font-normal">{target.role}</span></p>
            <p className="text-[10px] text-[#9ca3af] truncate">{target.initial_scene}</p>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-2 px-4 py-3">
          <div className="flex-1 h-px bg-pink-100" />
          <span className="text-[10px] text-pink-300 font-semibold">对话练习</span>
          <div className="flex-1 h-px bg-pink-100" />
        </div>

        {/* Chat messages */}
        <div className="px-3 flex flex-col gap-3">
          {feedItems.filter((f) => f.type === "user_msg" || f.type === "char_msg").length === 0 && (
            <div className="text-center text-[12px] text-[#c98bab] py-6">
              和 {target.name} 打个招呼吧，用中文或英文都可以 💬
            </div>
          )}
          {feedItems.map((msg, i) => {
            if (msg.type === "user_msg") {
              return (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[75%] bg-gradient-to-br from-pink-400 to-rose-400 text-white rounded-[18px] rounded-tr-[4px] px-4 py-2.5 shadow-sm">
                    <p className="text-[13px] leading-snug">{msg.text}</p>
                  </div>
                </div>
              );
            }
            if (msg.type === "char_msg") {
              return (
                <div key={i} className="flex gap-2 items-end">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-300 to-rose-400 flex items-center justify-center shrink-0 overflow-hidden">
                    {target.avatar_url
                      ? <img src={target.avatar_url} alt={target.name} className="w-full h-full object-cover" />
                      : <span className="text-white text-xs font-bold">{((msg.speaker as string) || "M").charAt(0)}</span>}
                  </div>
                  <div className="max-w-[75%]">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[11px] font-bold text-[#be185d]">{msg.speaker as string}</span>
                      <TTSButton text={String(msg.text || "")} lang="en" voice={target.voice || "female_warm"} size={10} className="w-5 h-5 rounded-full bg-pink-50 flex items-center justify-center text-pink-500" />
                      {msg.emotion ? <span className="text-[9px] text-[#c98bab]">({msg.emotion as string})</span> : null}
                    </div>
                    <div className="bg-white rounded-[18px] rounded-tl-[4px] px-4 py-2.5 shadow-sm border border-pink-50">
                      <p className="text-[13px] text-[#1f2937] leading-snug">{msg.text}</p>
                      {msg.text_zh ? <p className="text-[10px] text-[#9ca3af] mt-1">{msg.text_zh as string}</p> : null}
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })}
          {turnLoading && (
            <div className="flex items-center gap-2 px-2">
              <Loader2 size={14} className="animate-spin text-pink-400" />
              <span className="text-[#c98bab] text-xs">{target.name} 正在回复...</span>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>
      </div>

      {/* Bottom: action chips + input */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto bg-[#fdf2f8]/95 backdrop-blur-md border-t border-pink-100 px-3 pt-2 pb-[calc(env(safe-area-inset-bottom,16px)+8px)] z-40">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {Object.keys(ACTION_PRESETS).map((label) => (
            <button
              key={label}
              onClick={() => setInputText(ACTION_PRESETS[label])}
              className="shrink-0 px-3 py-1.5 bg-white border border-pink-200 text-[#be185d] rounded-full text-[11px] font-bold shadow-sm active:scale-95"
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2 border border-pink-100 shadow-sm">
          <button className="w-7 h-7 flex items-center justify-center text-pink-400"><Mic size={16} /></button>
          <input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(inputText)}
            placeholder="输入中文或英文，AI 帮你练习表达..."
            className="flex-1 bg-transparent text-[13px] outline-none placeholder-[#c98bab] text-[#1f2937]"
          />
          <button
            onClick={() => send(inputText)}
            disabled={turnLoading || !inputText.trim()}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-400 to-rose-400 flex items-center justify-center shadow-md shrink-0 disabled:opacity-40"
          >
            {turnLoading ? <Loader2 size={16} className="text-white animate-spin" /> : <Send size={16} className="text-white" />}
          </button>
        </div>
      </div>
    </div>
  );
}
