import { useState } from "react";
import { useNavigate } from "react-router-dom";

export type TodayTopic = {
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
  { key: "debate", label: "辩论中" },
] as const;

type Filter = (typeof FILTERS)[number]["key"];

type Props = {
  topics: TodayTopic[];
  loading: boolean;
};

export default function TodayTopicsSection({ topics, loading }: Props) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = topics.filter((t) => {
    if (filter === "hot") return t.view_count > 0 || t.status === "open";
    if (filter === "debate") return !!(t.pro_view && t.con_view);
    return true;
  });

  return (
    <section id="today-topics" className="pb-2 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-primary fill"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            forum
          </span>
          <h3 className="font-headline-lg text-headline-lg text-on-surface">今日话题</h3>
        </div>
        <button
          onClick={() => navigate("/circles/new")}
          className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-[12px] font-bold active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          发布话题
        </button>
      </div>

      <p className="text-[14px] text-on-surface-variant">发现热门辩论、加入小组讨论、表达你的观点。</p>

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

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 rounded-2xl bg-surface-container-lowest border border-outline-variant/20">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant">chat_bubble</span>
          <p className="text-[14px] text-on-surface-variant text-center px-6">
            暂无话题，Freeze 思想后可发布为公开话题
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((topic) => (
            <article key={topic.id} className="glass-card premium-shadow rounded-2xl p-5 space-y-3">
              <div className="flex justify-between items-start gap-3">
                <h4 className="font-bold text-[16px] text-on-surface leading-tight flex-1">{topic.title}</h4>
                <span className="px-2 py-0.5 bg-primary-fixed text-primary text-[11px] rounded-full font-bold flex-shrink-0">
                  {topic.status === "open" ? "开放" : topic.status}
                </span>
              </div>

              {topic.background && (
                <p className="text-[13px] text-on-surface-variant leading-relaxed line-clamp-2">{topic.background}</p>
              )}

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

              {topic.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {topic.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 bg-surface-container-high text-on-surface-variant text-[11px] rounded-full font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

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
                  onClick={() =>
                    navigate(`/circles/new?topic=${topic.id}&title=${encodeURIComponent(topic.title)}`)
                  }
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
    </section>
  );
}
