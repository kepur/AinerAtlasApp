import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../i18n";
import { useAuthStore } from "../stores/authStore";
import { useChatStore } from "../stores/chatStore";
import { apiRequest } from "../api";

const MODES = [
  { key: "socratic", icon: "🧠" },
  { key: "devils_advocate", icon: "😈" },
  { key: "information_collector", icon: "📋" },
  { key: "debate_training", icon: "⚔️" },
  { key: "role_simulation", icon: "🎭" },
  { key: "coach", icon: "💪" },
  { key: "free-talk", icon: "💬" }
] as const;

const MODE_ICONS: Record<string, string> = {
  socratic: "psychology",
  devils_advocate: "swords",
  information_collector: "fact_check",
  debate_training: "gavel",
  role_simulation: "theater_comedy",
  coach: "exercise",
  "free-talk": "chat"
};

const MOCK_CIRCLES = [
  { id: "c1", name: "Paris Salon", count: "12+", tint: "from-[#7c3aed] to-[#0058be]" },
  { id: "c2", name: "Tech Ethics", count: "", tint: "from-[#005b3d] to-[#0058be]" }
];

type MatchType = "soulmate" | "founder" | "language_partner" | "interest";

type ConnectFriend = {
  id: string;
  username: string;
  match_type: MatchType;
  last_message?: string;
  last_time?: string;
  unread?: number;
  score: number;
};

const MATCH_TYPE_META: Record<MatchType, { label: string; ring: string; badge: string; dot: string }> = {
  soulmate: {
    label: "灵魂好友",
    ring: "from-[#ec4899] to-[#8b5cf6]",
    badge: "bg-[#fdf2f8] text-[#ec4899] border-[#fbcfe8]",
    dot: "bg-[#ec4899]",
  },
  founder: {
    label: "创业好友",
    ring: "from-[#10b981] to-[#06b6d4]",
    badge: "bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0]",
    dot: "bg-[#10b981]",
  },
  language_partner: {
    label: "语言伙伴",
    ring: "from-[#3b82f6] to-[#6366f1]",
    badge: "bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]",
    dot: "bg-[#3b82f6]",
  },
  interest: {
    label: "同趣好友",
    ring: "from-[#6366f1] to-[#8b5cf6]",
    badge: "bg-[#f5f3ff] text-[#6d28d9] border-[#ddd6fe]",
    dot: "bg-[#6366f1]",
  },
};

const MOCK_FRIENDS: ConnectFriend[] = [
  { id: "f1", username: "Kevin · Japan", match_type: "founder", last_message: "你好！我们可以聊一下AI创业方向吗？", last_time: "刚刚", unread: 2, score: 87 },
  { id: "f2", username: "Luna · Beijing", match_type: "soulmate", last_message: "上次聊的那个话题我一直在想...", last_time: "2小时前", unread: 0, score: 79 },
  { id: "f3", username: "Aria · Singapore", match_type: "language_partner", last_message: "Hi! Shall we practice English today?", last_time: "昨天", unread: 1, score: 71 },
  { id: "f4", username: "Mike · London", match_type: "interest", last_message: "发现一个很有意思的观点...", last_time: "3天前", unread: 0, score: 65 },
];

type ChatTab = "ai" | "friends";
type FilterType = "all" | MatchType;

const FILTER_TABS: { key: FilterType; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "soulmate", label: "灵魂好友" },
  { key: "founder", label: "创业好友" },
  { key: "language_partner", label: "语言伙伴" },
  { key: "interest", label: "同趣好友" },
];

export default function Chat() {
  const { conversations, loading, loadConversations, createConversation } = useChatStore();
  const user = useAuthStore((s) => s.user);
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [showModePicker, setShowModePicker] = useState(false);
  const [chatTab, setChatTab] = useState<ChatTab>("ai");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [friends, setFriends] = useState<ConnectFriend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (chatTab === "friends" && friends.length === 0) {
      setFriendsLoading(true);
      apiRequest<{ items?: ConnectFriend[] }>("/api/connect/requests?status=accepted")
        .then((data) => {
          if (data?.items?.length) setFriends(data.items);
          else setFriends(MOCK_FRIENDS);
        })
        .catch(() => setFriends(MOCK_FRIENDS))
        .finally(() => setFriendsLoading(false));
    }
  }, [chatTab]);

  async function handleNewConversation(mode?: string) {
    try {
      const conv = await createConversation({ mode: mode || "socratic" });
      setShowModePicker(false);
      navigate(`/chat/${conv.id}`);
    } catch { /* handled in store */ }
  }

  function continueSession() {
    if (conversations[0]) navigate(`/chat/${conversations[0].id}`);
    else setShowModePicker(true);
  }

  function formatTime(dateStr: string) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const diff = Date.now() - d.getTime();
    if (diff < 3600000) return t("chat.minutesAgo", { count: Math.max(1, Math.floor(diff / 60000)) });
    if (diff < 86400000) return t("chat.hoursAgo", { count: Math.floor(diff / 3600000) });
    return d.toLocaleDateString(locale);
  }

  const username = user?.username || "You";
  const filteredFriends = filterType === "all" ? friends : friends.filter((f) => f.match_type === filterType);

  return (
    <div className="premium min-h-full bg-surface text-on-surface">
      {/* Top AppBar */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-margin-mobile h-touch-target-min bg-surface/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/profile")}
            className="w-8 h-8 rounded-full overflow-hidden border border-primary/20 bg-primary-fixed flex items-center justify-center font-bold text-primary text-sm"
          >
            {username.charAt(0).toUpperCase()}
          </button>
          <h1 className="font-headline-md text-headline-md font-bold text-primary tracking-tight">AinerWise</h1>
        </div>
        <button onClick={() => navigate("/voice")} className="text-primary hover:opacity-80 transition-opacity active:scale-95">
          <span className="material-symbols-outlined">auto_awesome</span>
        </button>
      </header>

      <main className="px-margin-mobile pb-8">
        {/* Search */}
        <section className="mt-4 mb-8">
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-outline">
              <span className="material-symbols-outlined text-[20px]">search</span>
            </div>
            <input
              className="w-full h-12 pl-12 pr-4 bg-surface-container rounded-2xl text-body-md focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline/60 outline-none"
              placeholder="Search insights or circles..."
              type="text"
            />
          </div>
        </section>

        {/* Digital Mentor */}
        <section className="mb-8">
          <h2 className="font-label-sm text-label-sm text-outline mb-3 uppercase tracking-widest">Digital Mentor</h2>
          <div className="relative overflow-hidden rounded-[20px] p-4 ai-glow glass-card border border-primary/10">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-3xl" />
            <div className="flex items-start gap-3 relative z-10">
              <div className="relative">
                <div className="w-12 h-12 rounded-xl resonance-indicator flex items-center justify-center text-white shadow-lg">
                  <span className="material-symbols-outlined fill text-[24px]">psychology</span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-tertiary-fixed-dim border-2 border-surface rounded-full" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">AinerWise Coach</h3>
                  <span className="font-label-sm text-[10px] text-primary font-bold">LIVE</span>
                </div>
                <p className="text-[13px] text-on-surface-variant line-clamp-2 leading-relaxed">
                  "You've expressed new nuances today. Ready to refine your philosophical vocabulary?"
                </p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-outline-variant/30 flex gap-2">
              <button
                onClick={continueSession}
                className="flex-1 h-9 bg-primary text-white rounded-xl font-label-sm text-[13px] font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                Continue Session
              </button>
              <button onClick={() => navigate("/voice")} className="w-9 h-9 flex items-center justify-center text-primary bg-primary-fixed/30 rounded-xl active:scale-95 transition-transform">
                <span className="material-symbols-outlined text-[18px]">settings_voice</span>
              </button>
            </div>
          </div>
        </section>

        {/* Active Circles */}
        <section className="mb-8">
          <div className="flex justify-between items-end mb-4">
            <h2 className="font-label-sm text-label-sm text-outline uppercase tracking-widest">Active Circles</h2>
            <button onClick={() => navigate("/topics")} className="text-primary font-label-sm text-[12px] font-bold">
              View All
            </button>
          </div>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2 -mx-margin-mobile px-margin-mobile">
            {MOCK_CIRCLES.map((c) => (
              <button key={c.id} onClick={() => navigate("/topics")} className="flex-shrink-0 w-16 flex flex-col items-center gap-1.5">
                <div className="w-16 h-16 rounded-full p-[3px] border-2 border-primary-container relative">
                  <div className={`w-full h-full rounded-full bg-gradient-to-br ${c.tint}`} />
                  {c.count && (
                    <div className="absolute -bottom-1 -right-1 bg-on-primary-fixed-variant text-[9px] text-white px-1.5 py-0.5 rounded-full font-bold border border-white">
                      {c.count}
                    </div>
                  )}
                </div>
                <span className="font-label-sm text-[11px] text-on-surface truncate w-full text-center">{c.name}</span>
              </button>
            ))}
            <button onClick={() => navigate("/topics/new")} className="flex-shrink-0 w-16 flex flex-col items-center gap-1.5">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-outline-variant flex items-center justify-center text-outline">
                <span className="material-symbols-outlined text-[24px]">add</span>
              </div>
              <span className="font-label-sm text-[11px] text-outline truncate w-full text-center">Create</span>
            </button>
          </div>
        </section>

        {/* Conversations — with tab switcher */}
        <section className="mb-4">
          {/* Tab Switcher - Moved up and made bigger */}
          <div className="flex bg-surface-container/60 p-1 rounded-2xl mb-5 w-full">
            <button
              onClick={() => setChatTab("ai")}
              className={`flex-1 py-2.5 rounded-xl text-[14px] font-bold transition-all ${
                chatTab === "ai"
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "text-on-surface-variant hover:bg-surface-variant/50"
              }`}
            >
              AI 对话
            </button>
            <button
              onClick={() => setChatTab("friends")}
              className={`flex-1 py-2.5 rounded-xl text-[14px] font-bold transition-all flex items-center justify-center gap-1.5 ${
                chatTab === "friends"
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "text-on-surface-variant hover:bg-surface-variant/50"
              }`}
            >
              好友聊天
              {friends.some((f) => (f.unread ?? 0) > 0) && chatTab !== "friends" && (
                <span className="w-2 h-2 rounded-full bg-[#ec4899] shadow-sm" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between mb-3">
            <h2 className="font-label-sm text-label-sm text-outline uppercase tracking-widest">
              {chatTab === "ai" ? "Recent Chats" : "Friends"}
            </h2>
          </div>

          {/* AI conversations tab */}
          {chatTab === "ai" && (
            loading && conversations.length === 0 ? (
              <p className="text-body-md text-on-surface-variant px-2">{t("common.loading")}</p>
            ) : conversations.length === 0 ? (
              <div className="glass-card rounded-2xl p-6 text-center">
                <p className="text-body-md text-on-surface-variant mb-4">{t("chat.emptyDesc")}</p>
                <button onClick={() => setShowModePicker(true)} className="h-10 px-6 bg-primary text-white rounded-xl font-bold active:scale-95 transition-transform">
                  {t("chat.startNew")}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map((conv) => {
                  const last = conv.messages?.[conv.messages.length - 1];
                  return (
                    <button
                      key={conv.id}
                      onClick={() => navigate(`/chat/${conv.id}`)}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-surface-container transition-colors active:scale-[0.98] text-left"
                    >
                      <div className="w-14 h-14 rounded-2xl resonance-indicator flex items-center justify-center text-white flex-shrink-0">
                        <span className="material-symbols-outlined text-[28px]">{MODE_ICONS[conv.mode] ?? "chat"}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-end mb-1">
                          <h4 className="font-headline-md text-headline-md text-on-surface truncate">{conv.title}</h4>
                          <span className="text-[11px] text-outline flex-shrink-0 ml-2">{formatTime(conv.created_at)}</span>
                        </div>
                        <p className="text-body-md text-on-surface-variant truncate">
                          {last?.content?.slice(0, 60) || t("chat.newConversation")}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )
          )}

          {/* Friends tab */}
          {chatTab === "friends" && (
            <div>
              {/* Filter chips */}
              <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-3 -mx-margin-mobile px-margin-mobile mb-1">
                {FILTER_TABS.map((tab) => {
                  const meta = tab.key !== "all" ? MATCH_TYPE_META[tab.key as MatchType] : null;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setFilterType(tab.key)}
                      className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
                        filterType === tab.key
                          ? (meta ? `${meta.badge} border-current` : "bg-primary text-white border-primary")
                          : "bg-surface-container text-on-surface-variant border-transparent"
                      }`}
                    >
                      {meta && filterType === tab.key && (
                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                      )}
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Friend list */}
              {friendsLoading ? (
                <p className="text-body-md text-on-surface-variant px-2 py-4 text-center">加载中...</p>
              ) : filteredFriends.length === 0 ? (
                <div className="glass-card rounded-2xl p-6 text-center">
                  <p className="text-[32px] mb-2">👋</p>
                  <p className="text-body-md text-on-surface-variant mb-3">
                    {filterType === "all" ? "还没有 Connect 好友，去雷达页发现同频的人吧" : `暂无${MATCH_TYPE_META[filterType as MatchType]?.label}好友`}
                  </p>
                  <button
                    onClick={() => navigate("/match")}
                    className="h-10 px-6 bg-primary text-white rounded-xl font-bold active:scale-95 transition-transform text-sm"
                  >
                    去发现同频好友
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredFriends.map((friend) => {
                    const meta = MATCH_TYPE_META[friend.match_type];
                    const initial = friend.username.charAt(0).toUpperCase();
                    return (
                      <button
                        key={friend.id}
                        onClick={() => navigate("/match")}
                        className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-surface-container transition-colors active:scale-[0.98] text-left"
                      >
                        {/* Avatar with gradient ring */}
                        <div className={`p-[2px] rounded-full bg-gradient-to-br ${meta.ring} flex-shrink-0`}>
                          <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center font-bold text-on-surface text-lg">
                            {initial}
                          </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h4 className="font-headline-md text-headline-md text-on-surface truncate text-[14px]">{friend.username}</h4>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${meta.badge} flex-shrink-0`}>
                              {meta.label}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-[12px] text-on-surface-variant truncate flex-1">{friend.last_message || "开始你们的第一次对话吧"}</p>
                            <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                              {friend.last_time && <span className="text-[10px] text-outline">{friend.last_time}</span>}
                              {(friend.unread ?? 0) > 0 && (
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold ${meta.dot}`}>
                                  {friend.unread}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Discover more */}
              <button
                onClick={() => navigate("/match")}
                className="mt-4 w-full h-10 border border-dashed border-outline-variant rounded-2xl text-[12px] text-outline flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
              >
                <span className="material-symbols-outlined text-[16px]">radar</span>
                发现更多同频好友
              </button>
            </div>
          )}
        </section>
      </main>

      {/* FAB */}
      <button
        onClick={() => setShowModePicker(true)}
        className="fixed bottom-[88px] left-1/2 translate-x-[135px] w-14 h-14 resonance-indicator rounded-2xl text-white shadow-xl flex items-center justify-center active:scale-90 transition-transform z-40"
      >
        <span className="material-symbols-outlined text-[28px]">edit_square</span>
      </button>

      {/* Mode picker */}
      {showModePicker && (
        <div className="premium fixed inset-0 z-[200] flex items-end justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowModePicker(false)}>
          <div
            className="w-[min(100%,430px)] bg-surface rounded-t-3xl p-5 pb-8 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline-md text-headline-md text-on-surface">{t("chat.selectMode")}</h3>
              <button onClick={() => setShowModePicker(false)} className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {MODES.map((m) => (
                <button
                  key={m.key}
                  onClick={() => handleNewConversation(m.key)}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-surface-container-low hover:bg-primary/10 transition-colors text-left active:scale-[0.98]"
                >
                  <span className="text-2xl">{m.icon}</span>
                  <div className="min-w-0">
                    <strong className="block font-body-md font-semibold text-on-surface">{modeLabel(t, m.key)}</strong>
                    <span className="text-[12px] text-on-surface-variant line-clamp-1">{modeDesc(t, m.key)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function modeLabel(t: (k: string) => string, key: string) {
  const map: Record<string, string> = {
    socratic: t("chat.modeSocratic"),
    devils_advocate: t("chat.modeDevilsAdvocate"),
    information_collector: t("chat.modeInfoCollector"),
    debate_training: t("chat.modeDebateTraining"),
    role_simulation: t("chat.modeRoleSimulation"),
    coach: t("chat.modeCoach"),
    "free-talk": t("chat.modeFreeTalk")
  };
  return map[key] || key;
}

function modeDesc(t: (k: string) => string, key: string) {
  const map: Record<string, string> = {
    socratic: t("chat.modeSocraticDesc"),
    devils_advocate: t("chat.modeDevilsAdvocateDesc"),
    information_collector: t("chat.modeInfoCollectorDesc"),
    debate_training: t("chat.modeDebateTrainingDesc"),
    role_simulation: t("chat.modeRoleSimulationDesc"),
    coach: t("chat.modeCoachDesc"),
    "free-talk": t("chat.modeFreeTalkDesc")
  };
  return map[key] || "";
}
