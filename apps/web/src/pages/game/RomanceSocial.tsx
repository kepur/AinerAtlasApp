import { useState, useRef, useEffect, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft, Heart, Coffee, Sparkles, HeartHandshake,
  Send, Flame, Loader2,
  Handshake, TrendingUp, Scale, FileText,
  Plane, Hotel, Map, Compass,
  MapPin, Home, Users, CheckCircle,
} from "lucide-react";
import { useGameStore, FeedItem } from "../../stores/gameStore";
import TTSButton from "../../components/TTSButton";
import VoiceInput from "../../components/VoiceInput";
import { LearningHUD, useTts } from "../../components/learning";
import { useChatPrefsStore } from "../../stores/chatPrefsStore";
import type { HudData } from "../../stores/chatStore";

const getCategoryTabs = (category: string) => {
  if (category === "商务谈判") {
    return [
      { id: "intro", icon: Handshake, label: "接触", phase: "icebreaker" },
      { id: "pitch", icon: TrendingUp, label: "报价", phase: "flirting" },
      { id: "negotiate", icon: Scale, label: "谈判", phase: "dating" },
      { id: "sign", icon: FileText, label: "签约", phase: "couple" },
    ];
  }
  if (category === "移民生活") {
    return [
      { id: "arrival", icon: MapPin, label: "入境", phase: "icebreaker" },
      { id: "settle", icon: Home, label: "安置", phase: "flirting" },
      { id: "integrate", icon: Users, label: "融入", phase: "dating" },
      { id: "settled", icon: CheckCircle, label: "定居", phase: "couple" },
    ];
  }
  if (category === "旅游出差") {
    return [
      { id: "depart", icon: Plane, label: "启程", phase: "icebreaker" },
      { id: "lodging", icon: Hotel, label: "入住", phase: "flirting" },
      { id: "explore", icon: Map, label: "探索", phase: "dating" },
      { id: "joy", icon: Compass, label: "尽兴", phase: "couple" },
    ];
  }
  // Default: 恋爱社交
  return [
    { id: "warmup", icon: Coffee, label: "暖场", phase: "icebreaker" },
    { id: "flirt", icon: Heart, label: "暧昧", phase: "flirting" },
    { id: "date", icon: Sparkles, label: "约会", phase: "dating" },
    { id: "couple", icon: HeartHandshake, label: "心动·情侣", phase: "couple" },
  ];
};

const PHASE_TO_INDEX: Record<string, number> = {
  icebreaker: 0,
  flirting: 1,
  dating: 2,
  couple: 3,
};

const ACTION_PRESETS: Record<string, string> = {
  轻松回应: "Haha that's so true, I feel the same way!",
  表达好感: "I really enjoy spending time with you.",
  幽默一点: "Careful, you might make me blush! 😄",
  更进一步: "I've really started to fall for you. Want to be more than friends?",
};

// Fallback emotion → emoji when the model didn't return emotion_emoji.
function emotionEmoji(emotion?: string): string {
  if (!emotion) return "";
  const e = emotion;
  if (/开心|高兴|愉快|喜悦|happy/i.test(e)) return "😊";
  if (/害羞|羞涩|脸红|shy/i.test(e)) return "😳";
  if (/心动|喜欢|爱|love/i.test(e)) return "🥰";
  if (/疑惑|困惑|好奇|谨慎|犹豫/i.test(e)) return "🤔";
  if (/生气|愤怒|不满|angry/i.test(e)) return "💢";
  if (/紧张|不安|nervous/i.test(e)) return "😬";
  if (/感动|温暖|moved/i.test(e)) return "🥹";
  if (/冷淡|无聊|失望|敷衍/i.test(e)) return "😐";
  if (/惊讶|意外/i.test(e)) return "😮";
  return "💬";
}

const getTheme = (category: string) => {
  const c = category || "恋爱社交";
  if (c === "商务谈判") {
    return {
      bg: "bg-[#f0f7ff]",
      bgStyle: { backgroundColor: "#f0f7ff" },
      bgGradient: "from-blue-200/50 to-[#f0f7ff]",
      accent: "text-blue-600",
      accentBg: "bg-blue-600",
      accentBorder: "border-blue-100",
      accentBorderLight: "border-blue-50/60",
      accentBorderStrong: "border-blue-100/80",
      gradient: "from-blue-500 to-indigo-600",
      shadow: "shadow-[0_4px_20px_rgba(59,130,246,0.06)]",
      shadowTop: "shadow-[0_-8px_30px_rgba(59,130,246,0.04)]",
      shadowBtn: "shadow-blue-500/20",
      nodeCompleted: "bg-blue-100 border-blue-200 text-blue-500",
      nodeLocked: "bg-white/95 border-blue-100 text-blue-300",
      nodeTextActive: "text-blue-700",
      nodeTextCompleted: "text-blue-600",
      nodeTextLocked: "text-blue-300",
      title: "商务谈判表达练习",
      subtitle: "Business Negotiation",
      tagBg: "bg-blue-50 text-blue-600 border border-blue-100",
      tagBgLight: "bg-blue-50/70 text-blue-500 border border-blue-100/50",
      btnPreset: "text-blue-700 border-blue-200 hover:bg-white",
      micBg: "bg-blue-50 text-blue-500 hover:bg-blue-100",
      sendGradient: "from-blue-500 to-indigo-600",
      loaderColor: "text-blue-500",
      bubbleGradient: "from-blue-500 to-indigo-600",
      bubbleBg: "bg-white border-blue-50",
      bubbleText: "text-blue-600",
      avatarGradient: "from-blue-300 to-indigo-400",
      progressBg: "bg-blue-100/70",
      ttsBg: "bg-blue-50 text-blue-500",
      ttsPlayGradient: "from-blue-400 to-indigo-500",
      dividerBg: "bg-blue-100",
      dividerText: "text-blue-300",
      toastBg: "bg-gradient-to-r from-blue-500 to-indigo-500",
      glowAnimation: "active-node-pulse-blue",
      glowColor: "rgba(37, 99, 235, 0.3)",
      glowColorHalf: "rgba(37, 99, 235, 0.1)",
      glowColorBig: "rgba(37, 99, 235, 0.6)",
      glowColorBigHalf: "rgba(37, 99, 235, 0.15)",
      nodeShape: "rounded-xl",
      nodeRotate: "",
      iconRotate: "",
      iconRotateClass: "",
      activeIcon: Handshake,
      progressTooltipPrefix: "🤝 达成率",
      tooltipArrowClass: "after:border-t-blue-500",
    };
  }
  if (c === "移民生活") {
    return {
      bg: "bg-[#f0fdfa]",
      bgStyle: { backgroundColor: "#f0fdfa" },
      bgGradient: "from-teal-200/50 to-[#f0fdfa]",
      accent: "text-teal-600",
      accentBg: "bg-teal-600",
      accentBorder: "border-teal-100",
      accentBorderLight: "border-teal-50/60",
      accentBorderStrong: "border-teal-100/80",
      gradient: "from-teal-500 to-emerald-600",
      shadow: "shadow-[0_4px_20px_rgba(13,148,136,0.06)]",
      shadowTop: "shadow-[0_-8px_30px_rgba(13,148,136,0.04)]",
      shadowBtn: "shadow-teal-500/20",
      nodeCompleted: "bg-teal-100 border-teal-200 text-teal-500",
      nodeLocked: "bg-white/95 border-teal-100 text-teal-300",
      nodeTextActive: "text-teal-700",
      nodeTextCompleted: "text-teal-600",
      nodeTextLocked: "text-teal-300",
      title: "移民生活表达练习",
      subtitle: "Immigration Life",
      tagBg: "bg-teal-50 text-teal-600 border border-teal-100",
      tagBgLight: "bg-teal-50/70 text-teal-500 border border-teal-100/50",
      btnPreset: "text-teal-700 border-teal-200 hover:bg-white",
      micBg: "bg-teal-50 text-teal-500 hover:bg-teal-100",
      sendGradient: "from-teal-500 to-emerald-600",
      loaderColor: "text-teal-500",
      bubbleGradient: "from-teal-500 to-emerald-600",
      bubbleBg: "bg-white border-teal-50",
      bubbleText: "text-teal-600",
      avatarGradient: "from-teal-300 to-emerald-400",
      progressBg: "bg-teal-100/70",
      ttsBg: "bg-teal-50 text-teal-500",
      ttsPlayGradient: "from-teal-400 to-emerald-500",
      dividerBg: "bg-teal-100",
      dividerText: "text-teal-300",
      toastBg: "bg-gradient-to-r from-teal-500 to-emerald-500",
      glowAnimation: "active-node-pulse-teal",
      glowColor: "rgba(13, 148, 136, 0.3)",
      glowColorHalf: "rgba(13, 148, 136, 0.1)",
      glowColorBig: "rgba(13, 148, 136, 0.6)",
      glowColorBigHalf: "rgba(13, 148, 136, 0.15)",
      nodeShape: "rounded-[14px_4px_14px_4px]",
      nodeRotate: "",
      iconRotate: "",
      iconRotateClass: "",
      activeIcon: Home,
      progressTooltipPrefix: "🏡 融入度",
      tooltipArrowClass: "after:border-t-teal-500",
    };
  }
  if (c === "旅游出差") {
    return {
      bg: "bg-[#faf5ff]",
      bgStyle: { backgroundColor: "#faf5ff" },
      bgGradient: "from-violet-200/50 to-[#faf5ff]",
      accent: "text-violet-600",
      accentBg: "bg-violet-600",
      accentBorder: "border-violet-100",
      accentBorderLight: "border-violet-50/60",
      accentBorderStrong: "border-violet-100/80",
      gradient: "from-violet-500 to-fuchsia-600",
      shadow: "shadow-[0_4px_20px_rgba(139,92,246,0.06)]",
      shadowTop: "shadow-[0_-8px_30px_rgba(139,92,246,0.04)]",
      shadowBtn: "shadow-violet-500/20",
      nodeCompleted: "bg-violet-100 border-violet-200 text-violet-500",
      nodeLocked: "bg-white/95 border-violet-100 text-violet-300",
      nodeTextActive: "text-violet-700",
      nodeTextCompleted: "text-violet-600",
      nodeTextLocked: "text-violet-300",
      title: "旅游出差表达练习",
      subtitle: "Travel & Business Trip",
      tagBg: "bg-violet-50 text-violet-600 border border-violet-100",
      tagBgLight: "bg-violet-50/70 text-violet-500 border border-violet-100/50",
      btnPreset: "text-violet-700 border-violet-200 hover:bg-white",
      micBg: "bg-violet-50 text-violet-500 hover:bg-violet-100",
      sendGradient: "from-violet-500 to-fuchsia-600",
      loaderColor: "text-violet-500",
      bubbleGradient: "from-violet-500 to-fuchsia-600",
      bubbleBg: "bg-white border-violet-50",
      bubbleText: "text-violet-600",
      avatarGradient: "from-violet-300 to-fuchsia-400",
      progressBg: "bg-violet-100/70",
      ttsBg: "bg-violet-50 text-violet-500",
      ttsPlayGradient: "from-violet-400 to-fuchsia-500",
      dividerBg: "bg-violet-100",
      dividerText: "text-violet-300",
      toastBg: "bg-gradient-to-r from-violet-500 to-fuchsia-500",
      glowAnimation: "active-node-pulse-violet",
      glowColor: "rgba(139, 92, 246, 0.3)",
      glowColorHalf: "rgba(139, 92, 246, 0.1)",
      glowColorBig: "rgba(139, 92, 246, 0.6)",
      glowColorBigHalf: "rgba(139, 92, 246, 0.15)",
      nodeShape: "rotate-45 rounded-xl",
      nodeRotate: "rotate(45deg)",
      iconRotate: "-rotate-45",
      iconRotateClass: "rotate(-45deg)",
      activeIcon: Compass,
      progressTooltipPrefix: "✈️ 顺利度",
      tooltipArrowClass: "after:border-t-violet-500",
    };
  }
  // Default: 恋爱社交
  return {
    bg: "bg-[#fdf2f8]",
    bgStyle: { backgroundColor: "#fdf2f8" },
    bgGradient: "from-pink-200/50 to-[#fdf2f8]",
    accent: "text-[#be185d]",
    accentBg: "bg-[#be185d]",
    accentBorder: "border-pink-100",
    accentBorderLight: "border-pink-50/60",
    accentBorderStrong: "border-pink-100/80",
    gradient: "from-pink-400 to-rose-500",
    shadow: "shadow-[0_4px_20px_rgba(244,63,94,0.06)]",
    shadowTop: "shadow-[0_-8px_30px_rgba(244,63,94,0.04)]",
    shadowBtn: "shadow-pink-500/20",
    nodeCompleted: "bg-pink-100 border-pink-200 text-pink-500",
    nodeLocked: "bg-white/95 border-pink-100 text-pink-300",
    nodeTextActive: "text-[#be185d]",
    nodeTextCompleted: "text-pink-600",
    nodeTextLocked: "text-pink-300",
    title: "恋爱社交表达练习",
    subtitle: "Romance Social",
    tagBg: "bg-pink-50 text-pink-600 border border-pink-100",
    tagBgLight: "bg-pink-50/70 text-pink-500 border border-pink-100/50",
    btnPreset: "text-[#be185d] border-pink-200 hover:bg-white",
    micBg: "bg-pink-50 text-pink-500 hover:bg-pink-100",
    sendGradient: "from-pink-400 to-rose-500",
    loaderColor: "text-pink-500",
    bubbleGradient: "from-pink-400 to-rose-400",
    bubbleBg: "bg-white border-pink-50",
    bubbleText: "text-[#be185d]",
    avatarGradient: "from-pink-300 to-rose-400",
    progressBg: "bg-pink-100/70",
    ttsBg: "bg-pink-50 text-pink-500",
    ttsPlayGradient: "from-pink-400 to-rose-500",
    dividerBg: "bg-pink-100",
    dividerText: "text-pink-300",
    toastBg: "bg-gradient-to-r from-pink-400 to-rose-400",
    glowAnimation: "active-node-pulse-pink",
    glowColor: "rgba(244, 63, 94, 0.3)",
    glowColorHalf: "rgba(244, 63, 94, 0.1)",
    glowColorBig: "rgba(244, 63, 94, 0.6)",
    glowColorBigHalf: "rgba(244, 63, 94, 0.15)",
    nodeShape: "rounded-full",
    nodeRotate: "",
    iconRotate: "",
    iconRotateClass: "",
    activeIcon: Heart,
    progressTooltipPrefix: "💖 满意度",
    tooltipArrowClass: "after:border-t-pink-500",
  };
};

export default function RomanceSocial() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const templateId = new URLSearchParams(location.search).get("template") || undefined;
  const targetId = id && !/^[0-9a-fA-F-]{36}$/.test(id) ? id : "mia";

  const {
    currentSession, feedItems, currentHud, turnLoading,
    createSession, loadSession, sendTurn, clearCurrent,
  } = useGameStore();

  const [inputText, setInputText] = useState("");
  const [creating, setCreating] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const prevTurnLoadingRef = useRef(false);

  const { speak } = useTts();
  const autoReadMode = useChatPrefsStore((s) => s.autoReadMode);
  const shouldAutoRead = autoReadMode === "always" || autoReadMode === "target_only";

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
        const sess = await createSession(
          "romance",
          templateId,
          templateId ? undefined : { target_id: targetId },
        );
        navigate(`/game/romance-social/${sess.id}`, { replace: true });
      } finally {
        setCreating(false);
      }
    })();
    return () => { /* keep session in store */ };
  }, [id, templateId]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [feedItems, turnLoading]);

  useEffect(() => {
    if (prevTurnLoadingRef.current && !turnLoading && shouldAutoRead) {
      const lastChar = [...feedItems].reverse().find((f) => f.type === "char_msg");
      const text = lastChar?.text ? String(lastChar.text).trim() : "";
      if (text) speak(text, "en-US");
    }
    prevTurnLoadingRef.current = turnLoading;
  }, [turnLoading, feedItems, shouldAutoRead, speak]);

  const view = (currentSession?.view || {}) as Record<string, any>;
  const target = view.target || { name: "Mia", age: 25, role: "咖啡店常客", initial_scene: "咖啡店初次见面", gender: "female" };
  const characterVoice = (target.voice as string) || (target.gender === "male" ? "male_warm" : "female_warm");
  const score = (currentHud?.relationship_score as number) ?? view.relationship_score ?? 0;
  const phase = currentSession?.phase || "icebreaker";

  const learningHud = useMemo((): HudData => {
    if (!currentHud) return null;
    if (currentHud.main_expression || currentHud.v2) return currentHud as HudData;
    return null;
  }, [currentHud]);

  const lastFeed = feedItems[feedItems.length - 1];
  const streamPhase = turnLoading
    ? ((lastFeed as FeedItem & { _streaming?: boolean })?._streaming ? "replying" : "analyzing")
    : null;

  const send = (text: string) => {
    if (!currentSession || !text.trim()) return;
    setInputText("");
    // Fire-and-forget: don't await so the user can keep chatting
    sendTurn(currentSession.id, "user_action", text.trim()).catch(console.error);
  };

  const category = target.category || "恋爱社交";
  const dimension = (view.progress_dimension as string) || "好感度";
  const th = getTheme(category);
  const categoryTabs = getCategoryTabs(category);
  const currentIndex = PHASE_TO_INDEX[phase] ?? 0;

  if (creating || !currentSession) {
    return (
      <div className="w-full h-screen bg-[#fdf2f8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-[#ec4899]" />
          <span className="text-[#9d4d6e] text-sm">正在准备对话场景...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full ${th.bg} flex flex-col max-w-[480px] mx-auto relative overflow-hidden transition-colors duration-500`}>
      {/* Background board (faint scene) for immersion */}
      {target.cover_url && (
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img src={target.cover_url} alt="" className="w-full h-full object-cover opacity-[0.12]" />
          <div className={`absolute inset-0 bg-gradient-to-b ${th.bgGradient}`} />
        </div>
      )}
      {/* Sticky top */}
      <div className={`sticky top-0 z-40 ${th.bg}/80 backdrop-blur-sm transition-colors duration-500`}>
        {/* Header */}
        <header className="flex items-center justify-between px-4 pt-[env(safe-area-inset-top,16px)] h-14">
          <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center text-gray-700 bg-white/60 rounded-full">
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <h1 className={`font-bold text-[15px] ${th.accent}`}>{th.title}</h1>
            <p className="text-[10px] text-[#9ca3af]">{th.subtitle}</p>
          </div>
          <div className={`flex items-center gap-1 bg-gradient-to-r ${th.gradient} text-white px-2.5 py-1 rounded-full text-[11px] font-bold shadow-sm`}>
            <Flame size={12} /> {dimension} {score}/100
          </div>
        </header>

        {/* Style block for animations */}
        <style>{`
          @keyframes ${th.glowAnimation} {
            0%, 100% { transform: scale(1) ${th.nodeRotate || ""}; box-shadow: 0 0 8px ${th.glowColor}, 0 0 0 4px ${th.glowColorHalf}; }
            50% { transform: scale(1.05) ${th.nodeRotate || ""}; box-shadow: 0 0 16px ${th.glowColorBig}, 0 0 0 8px ${th.glowColorBigHalf}; }
          }
          @keyframes active-icon-pulse {
            0%, 100% { transform: scale(1) ${th.iconRotateClass || ""}; }
            50% { transform: scale(1.18) ${th.iconRotateClass || ""}; }
          }
          .active-node {
            animation: ${th.glowAnimation} 2s infinite ease-in-out;
          }
        `}</style>

        {/* Relationship Phase Road Progress Bar */}
        <div className="px-6 pb-4 pt-8 relative flex items-center justify-between w-full select-none">
          {/* Background line */}
          <div className={`absolute left-[44px] right-[44px] top-[48px] h-1 ${th.progressBg} rounded-full z-0`} />
          
          {/* Filled progress line */}
          <div 
            className={`absolute left-[44px] top-[48px] h-1 bg-gradient-to-r ${th.gradient} rounded-full z-0 transition-all duration-700 ease-out`}
            style={{ 
              width: `${(currentIndex / 3) * 100}%`
            }}
          />

          {/* Nodes */}
          {categoryTabs.map((t, idx) => {
            const isCompleted = idx < currentIndex;
            const isActive = idx === currentIndex;
            const isLocked = idx > currentIndex;
            const ActiveIcon = th.activeIcon;

            return (
              <div key={t.id} className="flex flex-col items-center z-10 relative">
                {/* Node icon area */}
                <div 
                  className={`w-10 h-10 flex items-center justify-center border transition-all duration-500 ${th.nodeShape} ${
                    isActive 
                      ? `bg-gradient-to-br ${th.gradient} border-transparent text-white active-node shadow-lg`
                      : isCompleted 
                        ? th.nodeCompleted
                        : th.nodeLocked
                  }`}
                >
                  {isActive ? (
                    <ActiveIcon size={16} className={`${th.iconRotate} text-white`} style={{ animation: "active-icon-pulse 1.2s infinite ease-in-out" }} />
                  ) : (
                    <t.icon size={15} className={th.iconRotate} />
                  )}
                </div>
                
                {/* Node text */}
                <span 
                  className={`text-[10px] font-bold mt-1.5 tracking-wide transition-colors duration-500 ${
                    isActive 
                      ? `${th.nodeTextActive} scale-105 font-extrabold` 
                      : isCompleted 
                        ? th.nodeTextCompleted
                        : th.nodeTextLocked
                  }`}
                >
                  {t.label}
                </span>

                {/* Pulsing satisfaction hint badge above the active stage */}
                {isActive && (
                  <div className={`absolute -top-7.5 whitespace-nowrap bg-gradient-to-r ${th.gradient} text-white text-[8px] font-black px-1.5 py-0.5 rounded-md shadow-md ${th.shadowBtn} after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent ${th.tooltipArrowClass}`}>
                    {th.progressTooltipPrefix} {score}%
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Learning HUD — same chat_v2 pipeline as Chat */}
        <div className="px-4 pb-3">
          <LearningHUD
            hud={learningHud}
            streamPhase={streamPhase}
            speak={speak}
            className="romance-learning-hud"
          />
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-44 no-scrollbar relative z-10">

        {/* Scene bar */}
        <div className={`mx-4 mt-3 bg-white/70 rounded-2xl border ${th.accentBorder} px-3 py-2.5 flex items-center gap-3`}>
          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${th.avatarGradient} flex items-center justify-center shrink-0 overflow-hidden`}>
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
          <div className={`flex-1 h-px ${th.dividerBg}`} />
          <span className={`text-[10px] ${th.dividerText} font-semibold`}>对话练习</span>
          <div className={`flex-1 h-px ${th.dividerBg}`} />
        </div>

        {/* Chat messages */}
        <div className="px-3 flex flex-col gap-3">
          {feedItems.filter((f) => f.type === "user_msg" || f.type === "char_msg").length === 0 && (
            <div className="text-center text-[12px] text-[#c98bab] py-6">
              和 {target.name} 打个招呼吧，用中文或英文都可以 💬
            </div>
          )}
          {feedItems.filter((f) => f.type === "user_msg" || f.type === "char_msg").map((msg, i) => {
            if (msg.type === "user_msg") {
              return (
                <div key={i} className="flex justify-end">
                  <div className={`max-w-[75%] bg-gradient-to-br ${th.bubbleGradient} text-white rounded-[18px] rounded-tr-[4px] px-4 py-2.5 shadow-sm`}>
                    <p className="text-[13px] leading-snug">{msg.text}</p>
                  </div>
                </div>
              );
            }
            if (msg.type === "char_msg") {
              const emoji = (msg.emotion_emoji as string) || emotionEmoji(msg.emotion as string);
              const delta = Number(msg.relationship_change ?? 0);
              return (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="flex gap-2 items-end">
                    <div className="relative shrink-0">
                      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${th.avatarGradient} flex items-center justify-center overflow-hidden`}>
                        {target.avatar_url
                          ? <img src={target.avatar_url} alt={target.name} className="w-full h-full object-cover" />
                          : <span className="text-white text-xs font-bold">{((msg.speaker as string) || "M").charAt(0)}</span>}
                      </div>
                      {emoji && (
                        <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white shadow-sm border border-pink-100 flex items-center justify-center text-[11px] leading-none">{emoji}</span>
                      )}
                    </div>
                    <div className="max-w-[75%]">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <span className={`text-[11px] font-bold ${th.accent}`}>{msg.speaker as string}</span>
                        {msg.emotion ? <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${th.tagBgLight}`}>{emoji} {msg.emotion as string}</span> : null}
                        {delta !== 0 && (
                          <span className={`text-[9px] font-bold ${delta > 0 ? "text-rose-500" : "text-slate-400"}`}>{delta > 0 ? `+${delta} ${dimension}` : `${delta} ${dimension}`}</span>
                        )}
                        <TTSButton text={String(msg.text || "")} lang="en" voice={characterVoice} size={10} className={`w-5 h-5 rounded-full ${th.ttsBg} flex items-center justify-center ${th.bubbleText}`} />
                      </div>
                      <div className={`bg-white rounded-[18px] rounded-tl-[4px] px-4 py-2.5 shadow-sm border ${th.accentBorderLight}`}>
                        <p className="text-[13px] text-[#1f2937] leading-snug">{msg.text}</p>
                        {msg.text_zh ? <p className="text-[10px] text-[#9ca3af] mt-1">{msg.text_zh as string}</p> : null}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })}
          {turnLoading && !(feedItems[feedItems.length - 1] as FeedItem & { _streaming?: boolean })?._streaming && (
            <div className="flex items-center gap-2 px-2">
              <Loader2 size={14} className={`animate-spin ${th.loaderColor}`} />
              <span className="text-[#c98bab] text-xs">{target.name} 正在回复...</span>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>
      </div>

      {/* Bottom: action chips + input */}
      <div className={`fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto ${th.bg}/90 backdrop-blur-xl border-t ${th.accentBorderLight} px-4 pt-3 pb-[calc(env(safe-area-inset-bottom,16px)+12px)] z-40 ${th.shadowTop}`}>
        <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-3">
          {Object.keys(ACTION_PRESETS).map((label) => (
            <button
              key={label}
              onClick={() => setInputText(ACTION_PRESETS[label])}
              className={`shrink-0 px-4 py-2 bg-white/90 border ${th.accentBorder} ${th.accent} rounded-full text-xs font-bold ${th.shadow} active:scale-95 transition-all hover:bg-white`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className={`flex items-center gap-2 bg-white rounded-2xl pl-3 pr-2 py-2 border ${th.accentBorderStrong} ${th.shadow}`}>
          <VoiceInput
            className={`w-9 h-9 rounded-xl flex items-center justify-center ${th.micBg} transition-colors shrink-0 border-0 shadow-none`}
            iconSize={18}
            disabled={turnLoading}
            mode="hold"
            onTranscript={(text) => { if (text.trim()) send(text); }}
            title="按住说话，松开发送 · 上滑取消"
          />
          <input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(inputText)}
            placeholder="输入中文或英文，AI 帮你练习表达..."
            className="flex-1 bg-transparent text-sm outline-none placeholder-[#c98bab] text-[#1f2937] px-1"
            style={{ border: "none", boxShadow: "none" }}
          />
          <button
            onClick={() => send(inputText)}
            disabled={!inputText.trim()}
            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${th.sendGradient} flex items-center justify-center shadow-lg ${th.shadowBtn} shrink-0 disabled:opacity-40 active:scale-95 transition-transform`}
          >
            {turnLoading ? <Loader2 size={18} className="text-white animate-spin" /> : <Send size={16} className="text-white fill-white ml-0.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
