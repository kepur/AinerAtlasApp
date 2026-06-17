import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft, Share2, Search, FileText, Clock, Lightbulb, Send,
  AlertTriangle, Lock, Unlock, Loader2, Users, Gavel, X, Volume2,
} from "lucide-react";
import { useGameStore } from "../../stores/gameStore";

type TabKey = "背景" | "线索" | "嫌疑人" | "时间线";

const TABS: { key: TabKey; label: string }[] = [
  { key: "背景", label: "案件背景" },
  { key: "线索", label: "关键搜证" },
  { key: "嫌疑人", label: "嫌疑人" },
  { key: "时间线", label: "时间线" },
];

const CLUE_ICONS = ["☂️", "🥤", "📝", "🔑", "📹", "🩸", "🔦", "📦"];

export default function DetectiveBoard() {
  const navigate = useNavigate();
  const { id: caseId } = useParams<{ id: string }>();
  const {
    currentSession, currentHud, feedItems, turnLoading,
    createSession, loadSession, sendTurn,
  } = useGameStore();

  const [activeTab, setActiveTab] = useState<TabKey>("背景");
  const [creating, setCreating] = useState(false);
  const [showDeduce, setShowDeduce] = useState(false);
  const [accused, setAccused] = useState<string>("");
  const [reasoning, setReasoning] = useState("");

  useEffect(() => {
    const initial = caseId || "cafe_lie";
    const isUuid = /^[0-9a-fA-F-]{36}$/.test(initial);
    if (isUuid) {
      if (!currentSession || currentSession.id !== initial) loadSession(initial);
      return;
    }
    // Always create a fresh case session keyed by the case slug.
    (async () => {
      if (creating) return;
      setCreating(true);
      try {
        const sess = await createSession("detective", initial, { case_id: initial });
        if (!sess.turns || sess.turns.length === 0) {
          try { await sendTurn(sess.id, "start"); } catch { /* ignore */ }
        }
        navigate(`/game/detective-board/${sess.id}`, { replace: true });
      } finally {
        setCreating(false);
      }
    })();
  }, [caseId]);

  const view = (currentSession?.view || {}) as Record<string, any>;
  const scene = view.scene || "";
  const sceneEn = view.scene_en || "";
  const suspects: any[] = view.suspects || [];
  const allClues: any[] = view.all_clues || [];
  const discoveredCount = (view.discovered_clues || []).length;
  const totalClues = view.total_clues || allClues.length || 6;
  const interrogationsUsed = view.interrogations_used || 0;
  const maxInterrogations = view.max_interrogations || 5;
  const progress = totalClues ? Math.round((discoveredCount / totalClues) * 100) : 0;

  const hud = (currentHud || {}) as Record<string, any>;
  const hintEn = hud.main_expression || "When was the last time you saw the owner?";
  const hintZh = hud.meaning_native || "你最后一次见到老板是什么时候？";

  const handleExamine = async (clueId: string, discovered: boolean) => {
    if (!currentSession || discovered || turnLoading) return;
    await sendTurn(currentSession.id, "investigate", "", { clue_id: clueId });
  };

  const handleInterrogate = (suspectId: string) => {
    if (!currentSession) return;
    navigate(`/game/detective/interrogation/${currentSession.id}?suspect=${suspectId}`);
  };

  const handleDeduce = async () => {
    if (!currentSession || !accused || !reasoning.trim()) return;
    await sendTurn(currentSession.id, "deduce", reasoning.trim(), { accused_id: accused });
    setShowDeduce(false);
    navigate(`/game/detective/summary/${currentSession.id}`);
  };

  if (creating || !currentSession) {
    return (
      <div className="w-full h-screen bg-[#f5f3ff] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-[#7c3aed]" />
          <span className="text-[#6b7280] text-sm">正在布置案发现场...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#f5f3ff] flex flex-col overflow-hidden max-w-[480px] mx-auto relative">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-purple-100 flex items-center justify-between px-4 py-3">
        <button onClick={() => navigate("/game")} className="w-8 h-8 flex items-center justify-center text-[#374151] rounded-full hover:bg-purple-50">
          <ChevronLeft size={22} />
        </button>
        <div className="text-center">
          <div className="font-bold text-[16px] text-[#111827] flex items-center justify-center gap-1">🕵️ AI 侦探</div>
          <div className="text-[11px] text-[#9ca3af]">{currentSession.title}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-purple-100 text-purple-700 text-[11px] font-bold px-2.5 py-1 rounded-full">调查 {progress}%</div>
          <button className="w-8 h-8 flex items-center justify-center text-purple-500"><Share2 size={18} /></button>
        </div>
      </header>

      {/* Progress chips */}
      <div className="shrink-0 px-4 py-2 flex items-center gap-2 bg-white/60 border-b border-purple-50">
        <span className="flex items-center gap-1 bg-purple-50 text-purple-700 text-[11px] font-bold px-2.5 py-1 rounded-full border border-purple-100">
          <Search size={11} /> 线索 {discoveredCount}/{totalClues}
        </span>
        <span className="flex items-center gap-1 bg-orange-50 text-orange-600 text-[11px] font-bold px-2.5 py-1 rounded-full border border-orange-100">
          <Users size={11} /> 审问 {interrogationsUsed}/{maxInterrogations}
        </span>
      </div>

      {/* Tabs */}
      <div className="shrink-0 px-3 py-2 flex gap-2 overflow-x-auto no-scrollbar bg-white/60 border-b border-purple-50">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-[13px] font-bold transition-all ${
              activeTab === t.key ? "bg-[#7c3aed] text-white shadow-sm" : "bg-white text-[#9ca3af] border border-purple-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-40 no-scrollbar flex flex-col gap-4">
        {activeTab === "背景" && (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-purple-100">
              <div className="flex items-center gap-2 mb-2">
                <FileText size={15} className="text-[#7c3aed]" />
                <span className="font-bold text-[13px] text-[#111827]">案件概述</span>
              </div>
              <p className="text-[13px] text-[#374151] leading-relaxed">{scene}</p>
              {sceneEn && <p className="text-[11px] text-[#9ca3af] leading-relaxed mt-2 italic">{sceneEn}</p>}
            </div>
            {/* Learning hint */}
            <div className="bg-gradient-to-br from-[#f5f3ff] to-[#ede9fe] rounded-2xl p-4 border border-[#ddd6fe]">
              <div className="flex items-center gap-1.5 mb-2">
                <Lightbulb size={14} className="text-purple-500" />
                <span className="text-purple-700 font-bold text-[12px]">学习提示</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-bold text-[#111827]">{hintEn}</span>
                <button className="w-6 h-6 rounded-full bg-purple-200 flex items-center justify-center shrink-0"><Volume2 size={12} className="text-purple-600" /></button>
              </div>
              <span className="text-[12px] text-[#6b7280]">{hintZh}</span>
            </div>
          </>
        )}

        {activeTab === "线索" && (
          <div className="grid grid-cols-2 gap-3">
            {allClues.map((c, i) => (
              <button
                key={c.id}
                onClick={() => handleExamine(c.id, c.discovered)}
                className={`text-left rounded-2xl overflow-hidden border shadow-sm transition-all active:scale-95 ${
                  c.discovered ? "bg-white border-purple-100" : "bg-purple-50/40 border-dashed border-purple-200"
                }`}
              >
                <div className="relative h-20 bg-purple-100/50 overflow-hidden">
                  {c.image_url
                    ? <img src={c.image_url} alt={c.title} className={`w-full h-full object-cover ${c.discovered ? "" : "blur-[2px] opacity-60"}`} />
                    : <span className="absolute inset-0 flex items-center justify-center text-2xl">{CLUE_ICONS[i % CLUE_ICONS.length]}</span>}
                  <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/80 flex items-center justify-center">
                    {c.discovered ? <Unlock size={12} className="text-[#7c3aed]" /> : <Lock size={12} className="text-purple-400" />}
                  </div>
                </div>
                <div className="p-2.5">
                  <p className="font-bold text-[13px] text-[#111827]">{c.title}</p>
                  <p className="text-[11px] text-[#6b7280] mt-0.5 leading-snug min-h-[28px]">
                    {c.discovered ? c.desc : "点击搜证以解锁线索"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {activeTab === "嫌疑人" && (
          <div className="flex flex-col gap-3">
            {suspects.map((s) => {
              const color = (s.trust ?? 50) <= 40 ? "red" : (s.trust ?? 50) <= 60 ? "orange" : "green";
              return (
                <button
                  key={s.id}
                  onClick={() => handleInterrogate(s.id)}
                  className="text-left bg-white rounded-2xl p-3 border border-purple-100 shadow-sm flex items-center gap-3 active:scale-[0.98] transition-all"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-b from-[#c4b5fd] to-[#a78bfa] flex items-center justify-center shrink-0 overflow-hidden">
                    {s.avatar_url
                      ? <img src={s.avatar_url} alt={s.name} className="w-full h-full object-cover" />
                      : <span className="text-white font-extrabold text-xl">{(s.name || "?").charAt(0)}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[14px] text-[#111827]">{s.name}</span>
                      <span className="text-[11px] text-[#9ca3af]">{s.role}</span>
                      {s.interrogated && <span className="bg-purple-100 text-purple-600 text-[9px] font-bold px-1.5 py-0.5 rounded-full">已审问</span>}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${color === "red" ? "bg-red-400" : color === "orange" ? "bg-orange-400" : "bg-green-400"}`} style={{ width: `${100 - (s.trust ?? 50)}%` }} />
                      </div>
                      <span className="text-[10px] text-[#9ca3af]">嫌疑 {100 - (s.trust ?? 50)}</span>
                    </div>
                  </div>
                  <div className="bg-[#7c3aed] text-white text-[11px] font-bold px-3 py-1.5 rounded-full shrink-0">审讯</div>
                </button>
              );
            })}
          </div>
        )}

        {activeTab === "时间线" && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-purple-100">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={15} className="text-[#7c3aed]" />
              <span className="font-bold text-[13px] text-[#111827]">案件时间线</span>
            </div>
            <div className="flex flex-col gap-3">
              {suspects.map((s) => (
                <div key={s.id} className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-[12px] font-bold text-[#111827]">{s.name} · {s.role}</p>
                    <p className="text-[11px] text-[#6b7280]">{s.interrogated ? `已审问 ${s.statement_count || 0} 次` : "尚未审问"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto bg-white border-t border-purple-100 px-4 py-3 pb-6 z-40">
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => setActiveTab("嫌疑人")} className="flex flex-col items-center gap-1 bg-purple-50 border border-purple-100 rounded-xl py-2.5">
            <Search size={16} className="text-purple-500" />
            <span className="text-[10px] font-bold text-purple-700">审讯嫌疑人</span>
          </button>
          <button onClick={() => setActiveTab("时间线")} className="flex flex-col items-center gap-1 bg-blue-50 border border-blue-100 rounded-xl py-2.5">
            <Clock size={16} className="text-blue-500" />
            <span className="text-[10px] font-bold text-blue-700">查看时间线</span>
          </button>
          <button onClick={() => { setAccused(suspects[0]?.id || ""); setShowDeduce(true); }} className="flex flex-col items-center gap-1 bg-[#7c3aed] rounded-xl py-2.5 shadow-md shadow-purple-200">
            <Gavel size={16} className="text-white" />
            <span className="text-[10px] font-bold text-white">提交推理</span>
          </button>
        </div>
      </div>

      {/* Deduction Modal */}
      {showDeduce && (
        <div className="absolute inset-0 z-[100] bg-black/40 flex items-end" onClick={() => setShowDeduce(false)}>
          <div className="w-full bg-white rounded-t-3xl p-5 pb-8 animate-in slide-in-from-bottom" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-[17px] text-[#111827]">提交你的推理</h3>
              <button onClick={() => setShowDeduce(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100"><X size={16} /></button>
            </div>
            <p className="text-[12px] text-[#6b7280] mb-2 font-bold">谁是凶手？</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {suspects.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setAccused(s.id)}
                  className={`py-2.5 rounded-xl text-[13px] font-bold border transition-all ${
                    accused === s.id ? "bg-[#7c3aed] text-white border-[#7c3aed]" : "bg-white text-[#374151] border-purple-100"
                  }`}
                >
                  {s.name} · {s.role}
                </button>
              ))}
            </div>
            <p className="text-[12px] text-[#6b7280] mb-2 font-bold">你的推理过程</p>
            <textarea
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              placeholder="用中文或英文说出你的推理：凶手是谁，动机和证据是什么……"
              className="w-full h-24 bg-[#f5f3ff] border border-purple-100 rounded-2xl p-3 text-[13px] outline-none resize-none placeholder-[#9ca3af]"
            />
            <button
              onClick={handleDeduce}
              disabled={!accused || !reasoning.trim() || turnLoading}
              className="w-full mt-4 bg-[#7c3aed] text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-40 shadow-md active:scale-95"
            >
              {turnLoading ? <Loader2 size={18} className="animate-spin" /> : <><Send size={16} /> 提交结案</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
