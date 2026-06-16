import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Bookmark, ChevronRight, Volume2, RefreshCcw, Send, Mic, AlertTriangle, Search, Clock, Loader } from "lucide-react";
import { useGameStore } from "../../stores/gameStore";

export default function InterrogationRoom() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const suspectId = searchParams.get("suspect");

  const { currentSession, sendTurn, feedItems, turnLoading } = useGameStore();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [feedItems, turnLoading]);

  if (!currentSession || !currentSession.state) {
    return (
      <div className="w-full min-h-screen bg-[#f8f9fc] flex items-center justify-center">
        <Loader className="animate-spin text-indigo-500" />
      </div>
    );
  }

  const state = currentSession.state as any;
  const suspects = state.suspects || [];
  const clues = state.clues || [];
  const suspect = suspects.find((s: any) => s.id === suspectId) || suspects[0];

  if (!suspect) {
    return <div>Suspect not found.</div>;
  }

  // Filter feed items related to this suspect. 
  // We'll keep 'user_action' if it was just entered (though it might be global, it's fine for simple chat)
  // And we keep 'user_question' / 'suspect_answer' matching this suspect.
  const relevantFeed = feedItems.filter((item: any) => {
    if (item.type === "suspect_answer") return item.suspect_id === suspect.id;
    if (item.type === "user_question") return item.target === suspect.name;
    if (item.type === "user_action") return true; // optimistic UI
    if (item.type === "narrator") return true;
    return false;
  });

  const handleSend = async () => {
    if (!input.trim() || turnLoading) return;
    const text = input.trim();
    setInput("");
    await sendTurn(currentSession.id, "message", text, { suspect_id: suspect.id });
  };

  return (
    <div className="w-full h-full bg-[#f8f9fc] flex flex-col relative overflow-hidden min-h-screen">
      {/* Header */}
      <header className="sticky top-0 left-0 w-full z-50 flex items-center justify-between px-4 h-14 bg-white/90 backdrop-blur-md pt-[env(safe-area-inset-top,20px)] border-b border-gray-100 shrink-0">
        <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center text-[#111827] rounded-full hover:bg-gray-50 transition-colors border border-gray-200 shrink-0">
          <ArrowLeft size={18} />
        </button>

        <div className="flex flex-1 items-center gap-2 pl-3">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center text-lg">
            🕵️
          </div>
          <div className="flex flex-col">
            <div className="font-extrabold text-[#111827] text-sm leading-tight">AI侦探</div>
            <div className="text-[10px] text-[#6b7280]">嫌疑人审问</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-[11px] bg-[#f5f3ff] text-[#6d28d9] px-2.5 py-1 rounded-full font-medium">
            <span>线索 <span className="font-bold">{clues.filter((c:any) => c.discovered).length}/{clues.length}</span></span>
          </div>
        </div>
      </header>

      <main ref={scrollRef} className="flex-1 w-full overflow-y-auto pb-[200px] px-4 pt-4 flex flex-col gap-4 no-scrollbar">

        {/* Suspect Profile */}
        <div className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-100 flex gap-4">
          <div className="w-20 h-24 rounded-2xl overflow-hidden shrink-0 relative bg-gray-100 flex items-center justify-center">
            <span className="text-4xl text-gray-400 font-bold">{suspect.name[0]}</span>
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-[#111827] text-base">{suspect.name}</h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="bg-[#f5f3ff] text-[#8b5cf6] text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] inline-block"></span> 
                    信任度 {suspect.trust || 50}%
                  </span>
                </div>
                <p className="text-[10px] text-[#6b7280] mt-1.5 line-clamp-2">{suspect.role}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-auto flex-wrap">
              <button className="flex items-center gap-1 bg-[#f5f3ff] text-[#6d28d9] px-2 py-1.5 rounded-lg text-[9px] font-bold border border-[#ede9fe] hover:bg-[#ede9fe] transition-colors">
                👤 {suspect.interrogated ? "已审问" : "待审问"}
              </button>
            </div>
          </div>
        </div>

        {/* Chat Feed */}
        <div className="flex flex-col gap-3 mt-4">
          {relevantFeed.map((item: any, idx: number) => {
            if (item.type === "user_action" || item.type === "user_question") {
              return (
                <div key={idx} className="flex justify-end gap-2 items-end">
                  <div className="max-w-[80%] flex flex-col gap-0.5">
                    <div className="bg-[#8b5cf6] text-white p-3 rounded-2xl rounded-tr-sm shadow-sm">
                      <p className="text-[12px] leading-relaxed">{item.text}</p>
                    </div>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-[#8b5cf6] flex items-center justify-center text-white text-[10px] font-bold shrink-0 mb-4">我</div>
                </div>
              );
            }
            if (item.type === "suspect_answer") {
              return (
                <div key={idx} className="flex gap-2 items-start">
                  <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border-2 border-white shadow-sm bg-gray-100 flex items-center justify-center">
                    <span className="text-gray-500 font-bold text-xs">{item.suspect_name[0]}</span>
                  </div>
                  <div className="max-w-[80%] flex flex-col gap-0.5">
                    <span className="text-[9px] text-[#6b7280] pl-1 font-medium">{item.suspect_name} ({item.emotion})</span>
                    <div className="bg-white p-3 rounded-2xl rounded-tl-sm shadow-sm border border-gray-100 relative">
                      <p className="text-[12px] text-[#111827] leading-relaxed pr-2">{item.text}</p>
                      {item.text_native && <p className="text-[10px] text-[#6b7280] mt-1 pr-2">{item.text_native}</p>}
                    </div>
                  </div>
                </div>
              );
            }
            if (item.type === "narrator") {
               return (
                <div key={idx} className="flex justify-center my-2">
                  <span className="bg-gray-100 text-gray-500 text-[10px] px-3 py-1 rounded-full">{item.text}</span>
                </div>
               );
            }
            return null;
          })}

          {turnLoading && (
            <div className="flex items-center gap-2 text-indigo-400 text-[12px] justify-center mt-2">
              <Loader size={14} className="animate-spin" /> AI嫌疑人思考中...
            </div>
          )}
        </div>
      </main>

      {/* Bottom Input */}
      <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t border-gray-100 px-4 pt-3 pb-[max(env(safe-area-inset-bottom,16px),16px)] flex flex-col gap-2.5 z-50">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-[#f3f4f6] rounded-full h-11 flex items-center px-4">
            <input 
              type="text" 
              placeholder="审问嫌疑人..." 
              className="w-full text-[13px] bg-transparent focus:outline-none text-[#111827] placeholder:text-gray-400" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={turnLoading}
            />
          </div>
          <button 
            disabled={!input.trim() || turnLoading}
            onClick={handleSend}
            className="w-11 h-11 rounded-full bg-[#8b5cf6] flex items-center justify-center text-white shrink-0 shadow-md disabled:opacity-50 transition-all active:scale-95"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
