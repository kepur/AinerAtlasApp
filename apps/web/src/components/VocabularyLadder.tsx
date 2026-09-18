import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api";

type LadderMilestone = {
  key: string;
  target: number;
  label: string;
  range: string;
  outcome: string;
  status: "completed" | "current" | "locked";
  progress_count: number;
  segment_size: number;
  progress_percent: number;
};

type LadderData = {
  language: string;
  collected_count: number;
  active_count: number;
  mastered_count: number;
  graduation_target: number;
  overall_percent: number;
  next_target: number;
  remaining_to_next: number;
  graduated: boolean;
  phase_label: string;
  counting_rule: string;
  milestones: LadderMilestone[];
};

export default function VocabularyLadder({ language }: { language: string }) {
  const navigate = useNavigate();
  const [data, setData] = useState<LadderData | null>(null);

  useEffect(() => {
    let active = true;
    apiRequest<LadderData>(`/api/vocabulary/ladder?language=${encodeURIComponent(language)}`)
      .then((result) => { if (active) setData(result); })
      .catch(() => { if (active) setData(null); });
    return () => { active = false; };
  }, [language]);

  if (!data) return null;

  return (
    <section className="rounded-3xl p-4 bg-surface-container-lowest border border-outline-variant/25 premium-shadow">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">基本词汇攀登阶梯</span>
          <h2 className="text-[18px] font-bold mt-1">{data.phase_label}</h2>
          <p className="text-[12px] text-on-surface-variant mt-1">
            已掌握 {data.mastered_count} / {data.graduation_target}
          </p>
        </div>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${data.graduated ? "bg-tertiary-container text-white" : "bg-primary/10 text-primary"}`}>
          <span className="material-symbols-outlined">{data.graduated ? "workspace_premium" : "stacked_line_chart"}</span>
        </div>
      </div>

      <div className="mt-4 h-2.5 rounded-full bg-surface-container overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-primary to-tertiary-container transition-all duration-700" style={{ width: `${data.overall_percent}%` }} />
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3 text-center">
        <div className="rounded-xl bg-surface-container-low p-2"><p className="text-[16px] font-bold">{data.collected_count}</p><p className="text-[9px] text-on-surface-variant">已收集</p></div>
        <div className="rounded-xl bg-surface-container-low p-2"><p className="text-[16px] font-bold">{data.active_count}</p><p className="text-[9px] text-on-surface-variant">可主动使用</p></div>
        <div className="rounded-xl bg-primary/10 p-2"><p className="text-[16px] font-bold text-primary">{data.mastered_count}</p><p className="text-[9px] text-primary">计入阶梯</p></div>
      </div>

      <div className="mt-4 space-y-2">
        {data.milestones.map((milestone) => (
          <div key={milestone.key} className={`rounded-2xl border p-3 ${milestone.status === "current" ? "border-primary bg-primary/5" : "border-outline-variant/25"}`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${milestone.status === "completed" ? "bg-tertiary-container text-white" : milestone.status === "current" ? "bg-primary text-white" : "bg-surface-container text-on-surface-variant"}`}>
                <span className="material-symbols-outlined text-[17px]">{milestone.status === "completed" ? "check" : milestone.status === "current" ? "trending_up" : "lock"}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-2"><p className="text-[12px] font-bold">{milestone.label}</p><span className="text-[10px] text-on-surface-variant">{milestone.range}</span></div>
                <p className="text-[10px] text-on-surface-variant mt-1 leading-relaxed">{milestone.outcome}</p>
                {milestone.status === "current" && (
                  <div className="mt-2 h-1.5 rounded-full bg-surface-container overflow-hidden"><div className="h-full bg-primary" style={{ width: `${milestone.progress_percent}%` }} /></div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-[10px] text-on-surface-variant leading-relaxed">
          {data.graduated ? "已毕业，接下来按生活、工作和兴趣补词。" : `距离下一站还差 ${data.remaining_to_next} 个掌握词。`}
        </p>
        <button type="button" onClick={() => navigate("/vocabulary")} className="shrink-0 h-9 px-3 rounded-xl bg-primary text-white text-[11px] font-bold">去练 10 词</button>
      </div>
      <p className="text-[9px] text-on-surface-variant mt-2">{data.counting_rule}</p>
    </section>
  );
}
