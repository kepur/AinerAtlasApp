import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api";

type BookmarkedThought = {
  id: string;
  title: string;
  summary: string;
  final_content_native: string;
  final_content_target: string;
  freeze_payload: {
    source?: string;
    room_id?: string;
    analysis?: Record<string, unknown>;
  };
  created_at: string;
};

export default function CollectedViewpoint() {
  const navigate = useNavigate();
  const [bookmarks, setBookmarks] = useState<BookmarkedThought[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<BookmarkedThought[]>("/api/circles/bookmarks")
      .then(setBookmarks)
      .catch(() => setBookmarks([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="premium min-h-full bg-surface text-on-surface">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-primary/8 blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-white/20 px-margin-mobile h-touch-target-min flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="material-symbols-outlined text-primary">arrow_back</button>
        <div>
          <h1 className="font-bold text-[16px] text-on-surface">收藏观点</h1>
          <p className="text-[11px] text-on-surface-variant">{loading ? "加载中..." : `共 ${bookmarks.length} 条收藏`}</p>
        </div>
      </header>

      <main className="px-margin-mobile pt-5 pb-24 space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : bookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[40px] text-primary">bookmarks</span>
            </div>
            <h2 className="font-bold text-[18px] text-on-surface">还没有收藏的观点</h2>
            <p className="text-[14px] text-on-surface-variant text-center px-8">在小组讨论中点击消息旁的"收藏"按钮，精彩观点会保存到这里</p>
            <button
              onClick={() => navigate("/home#today-topics")}
              className="bg-primary text-white px-6 py-2.5 rounded-full font-bold text-[14px] shadow-md active:scale-95 transition-all"
            >
              去发现讨论
            </button>
          </div>
        ) : (
          bookmarks.map((b) => {
            const isOpen = expanded === b.id;
            return (
              <article key={b.id} className="glass-card premium-shadow rounded-2xl overflow-hidden">
                {/* Header */}
                <button
                  onClick={() => setExpanded(isOpen ? null : b.id)}
                  className="w-full p-5 text-left flex items-start gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-primary text-[20px] fill" style={{ fontVariationSettings: "'FILL' 1" }}>bookmark</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[15px] text-on-surface leading-tight line-clamp-2">{b.title.replace("收藏观点 - ", "")}</p>
                    <p className="text-[12px] text-on-surface-variant mt-1">
                      {new Date(b.created_at).toLocaleDateString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant text-[20px] flex-shrink-0 mt-1">
                    {isOpen ? "expand_less" : "expand_more"}
                  </span>
                </button>

                {/* Expanded content */}
                {isOpen && (
                  <div className="px-5 pb-5 space-y-3 border-t border-white/20">
                    <div className="mt-3 bg-surface-container-low rounded-xl p-3 border-l-4 border-primary/40">
                      <p className="text-[13px] text-primary font-bold mb-1">原文</p>
                      <p className="text-[14px] text-on-surface leading-relaxed">{b.final_content_native}</p>
                    </div>
                    {b.final_content_target && (
                      <div className="bg-surface-container-low rounded-xl p-3 border-l-4 border-tertiary-container/40">
                        <p className="text-[13px] text-tertiary-container font-bold mb-1">英文版</p>
                        <p className="text-[14px] text-on-surface leading-relaxed italic">{b.final_content_target}</p>
                      </div>
                    )}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => navigate("/chat")}
                        className="flex-1 h-10 bg-primary/10 text-primary rounded-full text-[13px] font-bold active:scale-95 transition-all"
                      >
                        深入讨论
                      </button>
                      <button
                        onClick={() => navigate("/thoughts")}
                        className="flex-1 h-10 bg-surface-container text-on-surface rounded-full text-[13px] font-bold active:scale-95 transition-all"
                      >
                        加入思想库
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </main>
    </div>
  );
}
