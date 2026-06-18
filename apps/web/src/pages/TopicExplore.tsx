import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api";

type Topic = {
  id: string;
  title: string;
  background: string;
  pro_view: string;
  con_view: string;
  tags: string[];
  status: string;
  view_count: number;
  created_at: string;
};

const FILTERS = [
  { key: "all", label: "全部" },
  { key: "hot", label: "热门" },
  { key: "debate", label: "辩论中" }
] as const;

type Filter = typeof FILTERS[number]["key"];

export default function TopicExplore() {
  const navigate = useNavigate();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    apiRequest<Topic[]>("/api/topics")
      .then((data) => setTopics(data?.length ? data : []))
      .catch(() => setTopics([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = topics.filter((t) => {
    if (filter === "hot") return t.view_count > 0 || t.status === "open";
    if (filter === "debate") return !!(t.pro_view && t.con_view);
    return true;
  });

  return (
    <div className="premium min-h-full bg-surface text-on-surface">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute bottom-1/3 -left-16 w-48 h-48 rounded-full bg-tertiary-fixed/15 blur-2xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-white/20 px-margin-mobile h-touch-target-min flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary fill" style={{ fontVariationSettings: "'FILL' 1" }}>forum</span>
          <h1 className="font-bold text-[20px] text-primary">今日话题</h1>
        </div>
        <button
          onClick={() => navigate("/circles/new")}
          className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-[12px] font-bold active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          发布话题
        </button>
      </header>

      <main className="px-margin-mobile pt-4 pb-24 space-y-4">
        {/* Hero description */}
        <p className="text-[14px] text-on-surface-variant">发现热门辩论、加入小组讨论、表达你的观点。</p>

        {/* Filter tabs */}
        <div className="flex p-1 bg-surface-container rounded-xl">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={
                "flex-1 py-2 px-3 rounded-lg text-[13px] font-bold transition-all " +
                (filter === f.key ? "bg-white shadow-sm text-primary" : "text-outline")
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Topic list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant">chat_bubble</span>
            <p className="text-[14px] text-on-surface-variant text-center">暂无话题，Freeze 思想后可发布为公开话题</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((topic) => (
              <article key={topic.id} className="glass-card premium-shadow rounded-2xl p-5 space-y-3">
                {/* Title + status */}
                <div className="flex justify-between items-start gap-3">
                  <h3 className="font-bold text-[16px] text-on-surface leading-tight flex-1">{topic.title}</h3>
                  <span className="px-2 py-0.5 bg-primary-fixed text-primary text-[11px] rounded-full font-bold flex-shrink-0">
                    {topic.status === "open" ? "开放" : topic.status}
                  </span>
                </div>

                {/* Background */}
                <p className="text-[13px] text-on-surface-variant leading-relaxed line-clamp-2">{topic.background}</p>

                {/* Pro/Con views */}
                {topic.pro_view && topic.con_view && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-tertiary-container/10 rounded-xl p-3">
                      <p className="text-[10px] font-bold text-tertiary-container mb-1">PRO</p>
                      <p className="text-[12px] text-on-surface">{topic.pro_view}</p>
                    </div>
                    <div className="bg-error/10 rounded-xl p-3">
                      <p className="text-[10px] font-bold text-error mb-1">CON</p>
                      <p className="text-[12px] text-on-surface">{topic.con_view}</p>
                    </div>
                  </div>
                )}

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {topic.tags.map((tag) => (
                    <span key={tag} className="px-2.5 py-1 bg-surface-container-high text-on-surface-variant text-[11px] rounded-full font-medium">
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Meta + action */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-4 text-[12px] text-outline">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">local_fire_department</span>
                      {topic.view_count} 浏览
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">group</span>
                      可加入
                    </span>
                  </div>
                  <button
                    onClick={() => navigate(`/circles/new?topic=${topic.id}&title=${encodeURIComponent(topic.title)}`)}
                    className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-full text-[13px] font-bold active:scale-95 transition-transform shadow-md"
                  >
                    加入讨论
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
