import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ConversationModePicker from "../components/ConversationModePicker";
import { useI18n } from "../i18n";
import { useAuthStore } from "../stores/authStore";
import { useChatStore } from "../stores/chatStore";
import { apiRequest } from "../api";
import { motion } from "framer-motion";

const MODE_ICONS: Record<string, string> = {
  socratic: "psychology",
  devils_advocate: "swords",
  information_collector: "fact_check",
  debate_training: "gavel",
  role_simulation: "theater_comedy",
  coach: "exercise",
  "free-talk": "chat"
};

const CIRCLE_TINTS = ["from-[#7c3aed] to-[#0058be]", "from-[#005b3d] to-[#0058be]", "from-[#be185d] to-[#7c3aed]"];

type MatchType = "soulmate" | "founder" | "language_partner" | "interest";

type ConnectFriend = {
  id: string;
  user_id?: string;
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

type CircleStrip = { id: string; title: string; member_count?: number };

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
  const { conversations, loading, loadConversations, createConversation, deleteConversation, archiveConversation } = useChatStore();
  const user = useAuthStore((s) => s.user);
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [showModePicker, setShowModePicker] = useState(false);
  const [chatTab, setChatTab] = useState<ChatTab>("ai");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [friends, setFriends] = useState<ConnectFriend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [circles, setCircles] = useState<CircleStrip[]>([]);

  useEffect(() => {
    loadConversations();
    apiRequest<CircleStrip[]>("/api/circles?status=active")
      .then((data) => setCircles(Array.isArray(data) ? data.slice(0, 8) : []))
      .catch(() => setCircles([]));
  }, [loadConversations]);

  useEffect(() => {
    if (chatTab === "friends" && friends.length === 0) {
      setFriendsLoading(true);
      apiRequest<{ items?: ConnectFriend[] }>("/api/connect/friends")
        .then((data) => setFriends(data?.items ?? []))
        .catch(() => setFriends([]))
        .finally(() => setFriendsLoading(false));
    }
  }, [chatTab]);

  async function openFriendChat(friend: ConnectFriend) {
    try {
      const room = await apiRequest<{ id: string }>("/api/connect/dm", {
        method: "POST",
        body: JSON.stringify({ friend_user_id: friend.user_id ?? friend.id }),
      });
      navigate(`/trio-chat?room=${room.id}`);
    } catch {
      navigate("/match");
    }
  }

  async function handleNewConversation(mode?: string) {
    try {
      const conv = await createConversation({ mode: mode || "socratic" });
      setShowModePicker(false);
      navigate(`/chat/${conv.id}`);
    } catch { /* handled in store */ }
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
        <section className="mt-2 mb-4">
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

        {/* Active Circles */}
        <section className="mb-4">
          <div className="flex justify-between items-end mb-2">
            <h2 className="font-label-sm text-label-sm text-outline uppercase tracking-widest">Active Circles</h2>
            <button onClick={() => navigate("/home#today-topics")} className="text-primary font-label-sm text-[12px] font-bold">
              View All
            </button>
          </div>
          <div className="flex gap-[18px] overflow-x-auto hide-scrollbar pb-1.5 -mx-margin-mobile px-margin-mobile">
            {circles.map((c, i) => (
              <button key={c.id} onClick={() => navigate(`/circles/${c.id}`)} className="flex-shrink-0 w-12 flex flex-col items-center gap-1.5">
                <div className="w-12 h-12 rounded-full p-[2px] border-2 border-primary-container relative">
                  <div className={`w-full h-full rounded-full bg-gradient-to-br ${CIRCLE_TINTS[i % CIRCLE_TINTS.length]}`} />
                  {!!c.member_count && (
                    <div className="absolute -bottom-0.5 -right-0.5 bg-on-primary-fixed-variant text-[8px] text-white px-1 py-0.5 rounded-full font-bold border border-white leading-none">
                      {c.member_count}
                    </div>
                  )}
                </div>
                <span className="font-label-sm text-[10px] text-on-surface truncate w-full text-center leading-tight">{c.title}</span>
              </button>
            ))}
            <button onClick={() => navigate("/topics/new")} className="flex-shrink-0 w-12 flex flex-col items-center gap-1.5">
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-outline-variant flex items-center justify-center text-outline">
                <span className="material-symbols-outlined text-[20px]">add</span>
              </div>
              <span className="font-label-sm text-[10px] text-outline truncate w-full text-center leading-tight">Create</span>
            </button>
          </div>
        </section>

        {/* Conversations — with tab switcher */}
        <section className="mb-2">
          {/* Tab Switcher - Moved up and made bigger */}
          <div className="flex bg-surface-container/60 p-1 rounded-2xl mb-3.5 w-full">
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
              <div className="space-y-3.5">
                {conversations.filter(c => c.status !== "archived").map((conv) => {
                  const last = conv.messages?.[conv.messages.length - 1];
                  return (
                    <div
                      key={conv.id}
                      className="relative overflow-hidden rounded-2xl bg-surface-container select-none"
                    >
                      {/* Swipe Underlays */}
                      {/* Left Underlay (revealed when swiping right -> Archive) */}
                      <div className="absolute inset-y-0 left-0 w-1/2 bg-emerald-500/10 flex items-center pl-4 text-emerald-600 font-bold text-xs gap-1.5 z-0">
                        <span className="material-symbols-outlined text-[20px]">archive</span>
                        <span>归档</span>
                      </div>
                      
                      {/* Right Underlay (revealed when swiping left -> Delete) */}
                      <div className="absolute inset-y-0 right-0 w-1/2 bg-rose-500/10 flex items-center justify-end pr-4 text-rose-600 font-bold text-xs gap-1.5 z-0">
                        <span>删除</span>
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </div>

                      {/* Foreground Content Card */}
                      <motion.div
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={{ left: 0.5, right: 0.5 }}
                        onDragEnd={(event, info) => {
                          if (info.offset.x < -85) {
                            if (window.confirm("确定删除这条对话？")) {
                              void deleteConversation(conv.id).catch(() => {
                                window.alert("删除失败，请稍后重试");
                              });
                            }
                          } else if (info.offset.x > 85) {
                            void archiveConversation(conv.id).catch(() => {
                              window.alert("归档失败，请稍后重试");
                            });
                          }
                        }}
                        className="bg-surface hover:bg-surface-container/30 transition-colors relative z-10 w-full"
                      >
                        <button
                          onClick={() => navigate(`/chat/${conv.id}`)}
                          className="w-full flex items-center gap-3 p-2.5 active:scale-[0.98] text-left min-w-0"
                        >
                          <div className="w-11 h-11 rounded-xl resonance-indicator flex items-center justify-center text-white flex-shrink-0">
                            <span className="material-symbols-outlined text-[22px]">{MODE_ICONS[conv.mode] ?? "chat"}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-end mb-0.5">
                              <h4 className="text-[14px] font-bold text-on-surface truncate m-0 leading-tight">{conv.title}</h4>
                              <span className="text-[10px] text-outline flex-shrink-0 ml-2 leading-none">{formatTime(conv.created_at)}</span>
                            </div>
                            <p className="text-[12px] text-on-surface-variant truncate m-0 leading-normal">
                              {last?.content?.slice(0, 60) || t("chat.newConversation")}
                            </p>
                          </div>
                        </button>
                      </motion.div>
                    </div>
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
                        onClick={() => void openFriendChat(friend)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-surface-container transition-colors active:scale-[0.98] text-left"
                      >
                        {/* Avatar with gradient ring */}
                        <div className={`p-[2px] rounded-full bg-gradient-to-br ${meta.ring} flex-shrink-0`}>
                          <div className="w-11 h-11 rounded-full bg-surface-container flex items-center justify-center font-bold text-on-surface text-base">
                            {initial}
                          </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h4 className="text-[14px] font-bold text-on-surface truncate m-0 leading-tight">{friend.username}</h4>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${meta.badge} flex-shrink-0 leading-none`}>
                              {meta.label}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-[12px] text-on-surface-variant truncate flex-1 m-0 leading-normal">{friend.last_message || "开始你们的第一次对话吧"}</p>
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

      <ConversationModePicker
        open={showModePicker}
        onClose={() => setShowModePicker(false)}
        onSelect={(mode) => void handleNewConversation(mode)}
      />
    </div>
  );
}
