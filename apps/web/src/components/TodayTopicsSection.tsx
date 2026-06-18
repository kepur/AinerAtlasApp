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
    <section id="today-topics" className="pb-1 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="material-symbols-outlined text-primary fill text-[18px] flex-shrink-0"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            forum
          </span>
          <h3 className="text-[15px] font-bold text-on-surface leading-tight">今日话题</h3>
        </div>
        <button
          onClick={() => navigate("/circles/new")}
          className="flex items-center gap-1 bg-primary/10 text-primary px-2.5 py-1 rounded-full text-[11px] font-bold active:scale-95 transition-transform flex-shrink-0"
        >
          <span className="material-symbols-outlined text-[14px]">add</span>
          发布话题
        </button>
      </div>

      <p className="text-[12px] text-on-surface-variant leading-snug">发现热门辩论、加入小组讨论、表达你的观点。</p>

      <div className="flex p-0.5 bg-surface-container rounded-lg">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={
              "flex-1 py-1.5 px-2 rounded-md text-[12px] font-bold transition-all " +
              (filter === f.key ? "bg-white shadow-sm text-primary" : "text-outline")
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-7 h-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2 rounded-xl bg-surface-container-lowest border border-outline-variant/20">
          <span className="material-symbols-outlined text-[36px] text-on-surface-variant">chat_bubble</span>
          <p className="text-[12px] text-on-surface-variant text-center px-4">
            暂无话题，Freeze 思想后可发布为公开话题
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((topic) => (
            <article key={topic.id} className="glass-card premium-shadow rounded-xl p-3.5 space-y-2">
              <div className="flex justify-between items-start gap-2">
                <h4 className="font-semibold text-[14px] text-on-surface leading-snug flex-1">{topic.title}</h4>
                <span className="px-1.5 py-0.5 bg-primary-fixed text-primary text-[10px] rounded-full font-bold flex-shrink-0">
                  {topic.status === "open" ? "开放" : topic.status}
                </span>
              </div>

              {topic.background && (
                <p className="text-[12px] text-on-surface-variant leading-relaxed line-clamp-2">{topic.background}</p>
              )}

              {topic.pro_view && topic.con_view && (
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="bg-tertiary-container/10 rounded-lg p-2">
                    <p className="text-[9px] font-bold text-tertiary-container mb-0.5">PRO</p>
                    <p className="text-[11px] text-on-surface leading-snug line-clamp-2">{topic.pro_view}</p>
                  </div>
                  <div className="bg-error/10 rounded-lg p-2">
                    <p className="text-[9px] font-bold text-error mb-0.5">CON</p>
                    <p className="text-[11px] text-on-surface leading-snug line-clamp-2">{topic.con_view}</p>
                  </div>
                </div>
              )}

              {topic.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {topic.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-surface-container-high text-on-surface-variant text-[10px] rounded-full font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-0.5">
                <div className="flex items-center gap-3 text-[11px] text-outline min-w-0">
                  <span className="flex items-center gap-0.5 flex-shrink-0">
                    <span className="material-symbols-outlined text-[14px]">local_fire_department</span>
                    {topic.view_count} 浏览
                  </span>
                  <span className="flex items-center gap-0.5 flex-shrink-0">
                    <span className="material-symbols-outlined text-[14px]">group</span>
                    可加入
                  </span>
                </div>
                <button
                  onClick={() =>
                    navigate(`/circles/new?topic=${topic.id}&title=${encodeURIComponent(topic.title)}`)
                  }
                  className="flex items-center gap-1 bg-primary text-white px-3 py-1.5 rounded-full text-[12px] font-bold active:scale-95 transition-transform shadow-sm flex-shrink-0"
                >
                  加入讨论
                  <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
