import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Volume2, Star, Target, MessageSquare, Clock, BookOpen, Puzzle, BarChart2, RotateCcw, Save, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { useGameStore } from "../../stores/gameStore";
import { saveGameToAssets, addPatternsToCrush } from "../../lib/gameLearning";

function fmtDuration(seconds: number): string {
  if (!seconds || seconds < 0) return "--";
  const m = Math.floor(seconds / 60);
  return `${m}分钟`;
}

export default function GameSummaryDetective() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { loadSummary } = useGameStore();
  const [data, setData] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    loadSummary(id)
      .then((s) => setData(s as Record<string, any>))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ background: "#f5f3ff" }}>
        <Loader2 size={32} className="animate-spin text-[#7c3aed]" />
      </div>
    );
  }

  const solved = data?.solved ?? false;
  const caseTitle = data?.title || "咖啡馆的谎言";
  const truth = data?.truth || "";
  const accuracy = data?.accuracy ?? data?.score ?? 0;
  const clues = `${data?.clues_found ?? 0}/${data?.total_clues ?? 6}`;
  const interrogations = data?.interrogations_used ?? 0;
  const duration = fmtDuration(data?.duration_seconds ?? 0);
  const topLines: { en: string; zh?: string }[] = (data?.top_lines || []).filter((l: any) => l.en);
  const patterns: string[] = data?.patterns || [];
  const vocab: string[] = data?.vocabulary || [];

  return (
    <div className="w-full min-h-screen flex flex-col font-sans" style={{ background: "#f5f3ff" }}>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-purple-100 flex items-center justify-between px-4 py-3">
        <button onClick={() => navigate("/game")} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-purple-50">
          <ChevronLeft size={22} className="text-[#374151]" />
        </button>
        <h1 className="font-bold text-[16px] text-[#111827]">游戏总结</h1>
        <div className={`flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-full ${solved ? "bg-green-50 border border-green-200 text-green-700" : "bg-orange-50 border border-orange-200 text-orange-600"}`}>
          <CheckCircle2 size={14} /> {solved ? "破案成功" : "结案"}
        </div>
      </header>

      <div className="flex flex-col gap-4 px-4 py-4 pb-32">
        {/* Hero Card */}
        <div className="bg-gradient-to-br from-[#4c1d95] to-[#6d28d9] rounded-3xl overflow-hidden shadow-xl shadow-purple-300/30">
          <div className="relative">
            <div className="h-28 bg-gradient-to-br from-purple-800 to-indigo-900 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-[#4c1d95] to-transparent" />
              <div className="relative z-10 flex flex-col items-center">
                <span className="text-4xl mb-1">{solved ? "🏆" : "🔍"}</span>
              </div>
            </div>
            <div className="px-5 py-4">
              <p className="text-purple-300 text-[11px] font-medium">{caseTitle}</p>
              <h2 className="text-white font-extrabold text-[20px] mt-0.5">{solved ? "你找出了真相" : "调查结束"}</h2>
              <div className="grid grid-cols-4 gap-2 mt-4">
                {[
                  { icon: <Target size={14} />, val: `${accuracy}%`, label: "推理得分" },
                  { icon: <BookOpen size={14} />, val: clues, label: "线索" },
                  { icon: <MessageSquare size={14} />, val: `${interrogations}轮`, label: "审问" },
                  { icon: <Clock size={14} />, val: duration, label: "时长" },
                ].map((s, i) => (
                  <div key={i} className="bg-white/10 rounded-xl p-2 flex flex-col items-center">
                    <div className="text-purple-300 mb-1">{s.icon}</div>
                    <div className="text-white font-extrabold text-[14px]">{s.val}</div>
                    <div className="text-purple-300 text-[9px] mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Truth */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-purple-100">
          <div className="flex items-center gap-2 mb-2">
            <Star size={15} className="text-[#7c3aed] fill-[#7c3aed]" />
            <span className="font-bold text-[13px] text-[#111827]">案件真相</span>
          </div>
          <p className="text-[12px] text-[#4b5563] leading-relaxed">{truth || "继续调查以揭开真相。"}</p>
          {data?.truth_en && <p className="text-[11px] text-[#9ca3af] leading-relaxed mt-2 italic">{data.truth_en}</p>}
        </div>

        {/* Top Lines */}
        {topLines.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-purple-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[15px]">💬</span>
              <span className="font-bold text-[13px] text-[#111827]">高光台词</span>
            </div>
            <div className="flex flex-col gap-3">
              {topLines.map((l, i) => (
                <div key={i} className="flex items-start gap-2 pb-2 border-b border-gray-50 last:border-0">
                  <span className="text-purple-300 text-[11px] font-bold w-4 shrink-0 mt-0.5">»</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-bold text-[#111827]">{l.en}</p>
                      <button className="w-5 h-5 rounded-full bg-purple-50 flex items-center justify-center shrink-0"><Volume2 size={10} className="text-purple-400" /></button>
                    </div>
                    {l.zh && <p className="text-[11px] text-[#9ca3af] mt-0.5">{l.zh}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Patterns */}
        {patterns.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-purple-100">
            <div className="flex items-center gap-1.5 mb-2">
              <BookOpen size={13} className="text-purple-500" />
              <span className="font-bold text-[12px] text-[#111827]">学到的句型</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {patterns.map((p, i) => (
                <div key={i} className="bg-purple-50 rounded-xl p-2">
                  <p className="text-[10px] font-bold text-[#7c3aed] leading-tight">{p}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vocab */}
        {vocab.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-purple-100">
            <div className="flex items-center gap-1.5 mb-3">
              <BarChart2 size={13} className="text-blue-500" />
              <span className="font-bold text-[12px] text-[#111827]">词汇亮点</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {vocab.map((v, i) => (
                <span key={i} className="bg-[#f5f3ff] text-[#6d28d9] px-2.5 py-1 rounded-lg border border-[#ede9fe] text-[11px] font-medium">{v}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-purple-100 px-4 py-3 pb-6">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={async () => {
              if (saved || saving) return;
              setSaving(true);
              await addPatternsToCrush(patterns);
              const ok = await saveGameToAssets(caseTitle, [truth, ...topLines.map((l) => l.en), ...patterns]);
              setSaved(ok);
              setSaving(false);
            }}
            disabled={saving}
            className="flex flex-col items-center gap-1 bg-blue-50 border border-blue-100 rounded-xl py-2.5 px-1 disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="text-blue-500 animate-spin" /> : <Save size={16} className="text-blue-500" />}
            <span className="text-[10px] font-bold text-blue-700 text-center leading-tight">{saved ? "已保存✓" : saving ? "保存中" : "保存到Assets"}</span>
          </button>
          <button onClick={() => navigate("/game/detective-board/cafe_lie")} className="flex flex-col items-center gap-1 bg-[#7c3aed] rounded-xl py-2.5 px-1 shadow-md shadow-purple-200">
            <RotateCcw size={16} className="text-white" />
            <span className="text-[10px] font-bold text-white text-center leading-tight">再玩一局</span>
          </button>
          <button onClick={() => navigate("/game")} className="flex flex-col items-center gap-1 bg-green-500 rounded-xl py-2.5 px-1 shadow-md shadow-green-200">
            <ArrowRight size={16} className="text-white" />
            <span className="text-[10px] font-bold text-white text-center leading-tight">返回大厅</span>
          </button>
        </div>
      </div>
    </div>
  );
}
