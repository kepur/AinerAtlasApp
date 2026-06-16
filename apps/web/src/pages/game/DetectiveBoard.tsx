import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Bookmark, FileText, Target, Search, UserCircle, MessageCircle, Lightbulb, Loader } from "lucide-react";
import { useGameStore } from "../../stores/gameStore";

export default function DetectiveBoard() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { createSession, currentSession } = useGameStore();

  useEffect(() => {
    if (id === "new" || !currentSession || currentSession.game_type !== "detective") {
      createSession("detective", undefined, { case_id: "cafe_lie" });
    }
  }, [id, createSession, currentSession]);

  if (!currentSession || !currentSession.state) {
    return (
      <div className="w-full min-h-screen bg-[#f8f9fc] flex items-center justify-center">
        <Loader className="animate-spin text-indigo-500" />
      </div>
    );
  }

  const state = currentSession.state as any;
  const caseData = state.case || {};
  const suspects = state.suspects || [];
  const clues = state.clues || [];

  return (
    <div className="premium w-full min-h-screen bg-[#f8f9fc] flex flex-col font-sans relative text-[#111827] pb-24">
      <header className="sticky top-0 left-0 w-full z-50 px-4 pt-[env(safe-area-inset-top,20px)] h-14 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center text-gray-700 bg-white rounded-full shadow-sm border border-gray-100">
          <ChevronLeft size={20} />
        </button>
        <div className="flex flex-col items-center flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-lg">🕵️</span>
            <h1 className="font-bold text-[16px] text-[#111827]">AI侦探</h1>
          </div>
          <p className="text-[10px] text-gray-500">案件线索板</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-full text-[10px] text-gray-600 font-medium">
            <span>线索 <strong className="text-[#8b5cf6]">{clues.filter((c:any) => c.discovered).length}</strong>/{clues.length}</span>
          </div>
          <button className="flex flex-col items-center justify-center text-gray-600">
            <Bookmark size={18} />
            <span className="text-[8px] mt-0.5">笔记</span>
          </button>
        </div>
      </header>

      <main className="flex-1 w-full px-4 pt-4 flex flex-col gap-4">
        {/* Case Info Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex gap-4">
          <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 relative shadow-sm">
            <img src="https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&q=80&w=200&h=200" alt="Case" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/10"></div>
          </div>
          <div className="flex flex-col flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <h2 className="font-bold text-[16px] text-[#111827]">{caseData.title || "未知案件"}</h2>
              <span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-1.5 py-0.5 rounded">调查中</span>
            </div>
            <p className="text-[11px] text-gray-500 leading-snug mb-3 line-clamp-3">
              {caseData.scene || "暂无案件描述"}
            </p>
            <div className="flex flex-wrap gap-2 mt-auto">
              <span className="flex items-center gap-1 bg-emerald-50 text-emerald-600 text-[10px] px-2 py-0.5 rounded-full font-medium">
                目标语言 <strong className="font-bold">English</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Key Clues */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-[14px] flex items-center gap-1.5 text-[#111827]">
              <FileText size={16} className="text-indigo-500" />
              关键线索
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {clues.map((clue: any, idx: number) => (
              <div key={clue.id} className="bg-white rounded-xl p-2.5 shadow-sm border border-gray-100 flex gap-2.5 items-start">
                <div className="flex flex-col flex-1">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="w-4 h-4 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center">{idx + 1}</span>
                    <span className="font-bold text-[12px] text-[#111827]">{clue.title}</span>
                  </div>
                  <p className="text-[9px] text-gray-500 leading-tight mb-1.5 line-clamp-2">{clue.discovered ? clue.desc : "???"}</p>
                  {clue.discovered ? (
                    <div className="flex items-center gap-1 text-emerald-500 text-[9px] font-medium bg-emerald-50 w-max px-1.5 py-0.5 rounded">
                      <Target size={10} /> 已发现
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-orange-500 text-[9px] font-medium bg-orange-50 w-max px-1.5 py-0.5 rounded">
                      <Search size={10} /> 待验证
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Suspects */}
        <section>
          <div className="flex items-center justify-between mb-3 mt-2">
            <h3 className="font-bold text-[14px] flex items-center gap-1.5 text-[#111827]">
              <UserCircle size={16} className="text-purple-500" />
              嫌疑人
            </h3>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
            {suspects.map((s: any) => (
              <button key={s.id} onClick={() => navigate(`/game/interrogation/${currentSession.id}?suspect=${s.id}`)} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 min-w-[130px] flex flex-col items-center gap-2 hover:border-indigo-200 transition-colors">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-indigo-100 flex items-center justify-center bg-gray-50">
                  <span className="text-indigo-400 font-bold text-xl">{s.name[0]}</span>
                </div>
                <div className="text-center">
                  <div className="font-bold text-[12px] text-[#111827]">{s.name}</div>
                  <div className="flex items-center justify-center gap-1 text-[10px] text-gray-500 mt-0.5 line-clamp-1">
                    {s.role}
                  </div>
                </div>
                <div className="flex w-full justify-between items-center mt-1">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${s.interrogated ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-gray-100 text-gray-600'}`}>
                    {s.interrogated ? '已审问' : '待审问'}
                  </span>
                  <MessageCircle size={14} className="text-indigo-400" />
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-[max(env(safe-area-inset-bottom,0px),20px)] left-0 w-full px-4 flex gap-2 z-40">
        <button className="flex-[1.2] bg-[#6d28d9] text-white font-bold py-3.5 rounded-full shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-1.5 active:scale-95 transition-transform">
          <Lightbulb size={18} />
          <span className="text-[14px]">提交推理 (结案)</span>
        </button>
      </div>
    </div>
  );
}
