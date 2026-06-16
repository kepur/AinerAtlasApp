import { useEffect, useRef, ReactNode } from "react";
import { Volume2, Sparkles, CheckCheck, List, Puzzle, Loader2 } from "lucide-react";
import { FeedItem } from "../../../stores/gameStore";

interface Props {
  mode?: string;
  feedItems?: FeedItem[];
  turnLoading?: boolean;
  cluesFound?: number;
  totalClues?: number;
  hudSlot?: ReactNode;
}

export default function UnifiedMainFeed({ mode, feedItems = [], turnLoading, cluesFound = 0, totalClues = 6, hudSlot }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [feedItems.length, turnLoading]);

  return (
    <div className="flex-1 w-full px-4 pt-4 pb-48 overflow-y-auto no-scrollbar flex flex-col gap-4 relative">
      {/* Background Watermark / Gradient */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-1/4 -right-20 w-96 h-96 bg-[#8b5cf6]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-[#6366f1]/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-white/70" />
      </div>

      <div className="relative z-10 flex flex-col gap-4 w-full">
        {hudSlot}

        {feedItems.map((item, idx) => (
          <FeedCard key={idx} item={item} mode={mode} cluesFound={cluesFound} totalClues={totalClues} />
        ))}

        {turnLoading && (
          <div className="flex items-center gap-2 px-2 py-3">
            <Loader2 size={14} className="animate-spin text-[#8b5cf6]" />
            <span className="text-[#6b7280] text-xs">AI 思考中...</span>
          </div>
        )}

        <div ref={endRef} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function FeedCard({ item, mode, cluesFound = 0, totalClues = 6 }: { item: FeedItem; mode?: string; cluesFound?: number; totalClues?: number }) {
  switch (item.type) {
    /* ============  Turtle‑soup: story card  ============ */
    case "story":
      return (
        <div className="w-full bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 relative overflow-hidden">
          <div className="flex gap-3 relative z-10">
            <div className="w-10 h-10 rounded-full bg-[#f5f3ff] text-[#8b5cf6] flex items-center justify-center shrink-0 font-extrabold text-xl shadow-inner border border-[#ede9fe]">
              ??
            </div>
            <div className="flex-1">
              <p className="text-[#111827] font-extrabold text-base leading-snug">{item.text}</p>
              {item.text_en && <p className="text-[#6b7280] text-xs mt-1 italic">{item.text_en}</p>}
            </div>
          </div>
          {/* Clue progress */}
          <div className="flex items-center justify-between bg-[#f8f9fc] rounded-xl p-2 relative z-10">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#6b7280]">已发现线索 {cluesFound}/{totalClues}</span>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(totalClues, 8) }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-full ${i < cluesFound ? "bg-[#8b5cf6] text-white flex items-center justify-center text-[10px]" : "bg-gray-200"}`}
                  >
                    {i < cluesFound ? "✓" : ""}
                  </div>
                ))}
              </div>
            </div>
            <button className="flex items-center gap-1 px-3 py-1 bg-[#f5f3ff] text-[#8b5cf6] text-[10px] font-bold rounded-lg border border-[#ede9fe]">
              <List size={12} /> 查看线索
            </button>
          </div>
        </div>
      );

    /* ============  Narrator  ============ */
    case "narrator":
      return (
        <div className="w-full flex justify-center my-2 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-100 shadow-sm text-sm text-[#4b5563] italic max-w-[90%]">
            <div className="w-6 h-6 rounded-full bg-[#f5f3ff] flex items-center justify-center text-[#8b5cf6] shrink-0">
              <Sparkles size={12} />
            </div>
            <div>
              <span>{item.text}</span>
              {item.text_en && <span className="block text-[10px] text-[#9ca3af] mt-0.5">{item.text_en}</span>}
            </div>
          </div>
        </div>
      );

    /* ============  User messages  ============ */
    case "user_question":
    case "user_solve":
    case "user_deduction":
      return (
        <div className="w-full flex justify-end gap-3 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex flex-col items-end max-w-[75%]">
            <div className="bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] text-white rounded-[20px] rounded-tr-[4px] p-3.5 shadow-md">
              <p className="text-sm font-bold leading-relaxed">{item.text}</p>
            </div>
            <div className="flex items-center gap-1 mt-1 mr-1 text-[#9ca3af]">
              <CheckCheck size={12} className="text-[#8b5cf6]" />
            </div>
          </div>
        </div>
      );

    /* ============  Judge answer (YES / NO / IRRELEVANT)  ============ */
    case "judge_answer": {
      const answer = item.answer as string;
      const color = answer === "YES" ? "text-[#10b981]" : answer === "NO" ? "text-[#ef4444]" : "text-[#6b7280]";
      return (
        <div className="w-full flex gap-3 animate-in fade-in slide-in-from-bottom-2">
          <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 shadow-sm border border-gray-100 bg-white flex items-center justify-center text-[24px]">🤖</div>
          <div className="flex flex-col max-w-[75%]">
            <div className="bg-white rounded-[20px] rounded-tl-[4px] p-3 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-extrabold ${color}`}>{answer}</span>
                <button className="w-5 h-5 rounded-full bg-[#f5f3ff] flex items-center justify-center text-[#8b5cf6] hover:bg-[#ede9fe] transition-colors">
                  <Volume2 size={10} />
                </button>
              </div>
              {item.comment ? <p className="text-xs text-[#6b7280] mt-1">{String(item.comment)}</p> : null}
              {item.comment_en ? <p className="text-[10px] text-[#9ca3af] mt-0.5">{String(item.comment_en)}</p> : null}
            </div>
          </div>
        </div>
      );
    }

    /* ============  Clue found (turtle‑soup)  ============ */
    case "clue_found":
      return (
        <div className="w-full flex gap-3 animate-in fade-in slide-in-from-bottom-2">
          <div className="w-10 h-10 rounded-full bg-[#f5f3ff] flex items-center justify-center shrink-0 shadow-sm border border-[#ede9fe] text-[#8b5cf6]">
            <Puzzle size={20} className="fill-current" />
          </div>
          <div className="flex flex-col max-w-[75%]">
            <div className="bg-white rounded-[20px] rounded-tl-[4px] p-3 shadow-sm border border-[#ede9fe]">
              <p className="text-sm font-bold text-[#8b5cf6] mb-0.5">线索：{item.text}</p>
              {item.text_en && <p className="text-[10px] text-[#6b7280]">{item.text_en}</p>}
              <p className="text-[9px] text-[#9ca3af] mt-1">已发现 {item.total_found as number}/{item.total_clues as number}</p>
            </div>
          </div>
        </div>
      );

    /* ============  Character dialogue (roleplay)  ============ */
    case "character":
      return (
        <div className="w-full flex gap-3 animate-in fade-in slide-in-from-bottom-2">
          <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 shadow-sm border border-gray-100 bg-[#f5f3ff] flex items-center justify-center text-[#8b5cf6] font-bold text-sm">
            {((item.speaker as string) || "?").charAt(0)}
          </div>
          <div className="flex flex-col max-w-[75%]">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold text-[#8b5cf6] ml-1">{item.speaker as string}</span>
              <button className="w-5 h-5 rounded-full bg-[#f5f3ff] flex items-center justify-center text-[#8b5cf6] hover:bg-[#ede9fe] transition-colors">
                <Volume2 size={10} />
              </button>
              {item.emotion ? <span className="text-[9px] text-[#9ca3af]">({String(item.emotion)})</span> : null}
            </div>
            <div className="bg-white rounded-[20px] rounded-tl-[4px] p-3.5 shadow-sm border border-gray-100">
              <p className="text-sm text-[#111827] leading-relaxed">{item.text}</p>
              {item.text_en && <p className="text-xs text-[#6b7280] mt-1">{item.text_en}</p>}
            </div>
          </div>
        </div>
      );

    /* ============  Chapter markers  ============ */
    case "chapter_start":
      return (
        <div className="flex flex-col items-center py-4 gap-1 animate-in fade-in slide-in-from-bottom-2">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-[#8b5cf6]/30 to-transparent" />
          <span className="text-[#8b5cf6] text-xs font-bold tracking-widest">{item.chapter as string}</span>
          {item.chapter_en ? <span className="text-[#9ca3af] text-[10px]">{String(item.chapter_en)}</span> : null}
          {item.goal ? <span className="text-[#6b7280] text-[10px]">目标：{String(item.goal)}</span> : null}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-[#8b5cf6]/30 to-transparent" />
        </div>
      );

    case "chapter_end":
    case "story_end":
      return (
        <div className="flex flex-col items-center py-4 gap-2 animate-in fade-in slide-in-from-bottom-2">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-[#10b981]/30 to-transparent" />
          <span className="text-[#10b981] text-xs font-bold">{item.text}</span>
          {item.text_en && <span className="text-[#9ca3af] text-[10px]">{item.text_en as string}</span>}
        </div>
      );

    /* ============  Detective: case briefing  ============ */
    case "case_briefing":
      return (
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-[#fef08a]/30 animate-in fade-in slide-in-from-bottom-2">
          <div className="text-[#eab308] text-xs font-bold mb-2 flex items-center gap-1.5">🔍 案件简报</div>
          <p className="text-[#111827] text-sm leading-relaxed">{item.text}</p>
          {item.text_en && <p className="text-[#6b7280] text-xs mt-1">{item.text_en}</p>}
        </div>
      );

    /* ============  Detective: suspects intro  ============ */
    case "suspects_intro":
      return (
        <div className="flex flex-col gap-2 px-1 animate-in fade-in slide-in-from-bottom-2">
          <div className="text-[#eab308] text-xs font-bold">嫌疑人</div>
          {Array.isArray(item.suspects) &&
            (item.suspects as Array<{ name: string; role: string }>).map((s, i) => (
              <div key={i} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-gray-100 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-[#fef9c3] flex items-center justify-center text-sm font-bold text-[#854d0e]">{s.name.charAt(0)}</div>
                <span className="text-[#111827] text-sm font-bold">{s.name}</span>
                <span className="text-[#6b7280] text-xs">{s.role}</span>
              </div>
            ))}
        </div>
      );

    /* ============  Detective: suspect answer  ============ */
    case "suspect_answer":
      return (
        <div className="flex gap-2.5 items-start animate-in fade-in slide-in-from-bottom-2">
          <div className="w-10 h-10 rounded-full bg-[#fef9c3] flex items-center justify-center shrink-0 text-sm font-bold text-[#854d0e]">
            {((item.suspect_name as string) || "?").charAt(0)}
          </div>
          <div className="flex-1 max-w-[75%]">
            <span className="text-[#854d0e] text-[11px] font-bold">{item.suspect_name as string}</span>
            <div className="bg-white rounded-[20px] rounded-tl-[4px] px-3 py-2.5 mt-1 shadow-sm border border-gray-100">
              <p className="text-sm text-[#111827]">{item.text}</p>
              {item.text_native && <p className="text-xs text-[#6b7280] mt-1">{item.text_native}</p>}
            </div>
          </div>
        </div>
      );

    /* ============  Detective: clue discovered  ============ */
    case "clue_discovered":
      return (
        <div className="bg-[#fef9c3] border border-[#fde047] rounded-2xl px-4 py-3 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#eab308]" />
            <span className="text-[#854d0e] text-[10px] font-bold">新线索发现</span>
            <span className="text-[#a16207] text-[9px] ml-auto">{item.total_discovered as number}/{item.total_clues as number}</span>
          </div>
          <p className="text-[#111827] text-sm font-bold">{item.title as string}</p>
          <p className="text-[#6b7280] text-xs">{item.desc as string}</p>
        </div>
      );

    /* ============  Verdict  ============ */
    case "verdict": {
      const verdict = item.verdict as string;
      const ok = verdict === "CORRECT" || verdict === "PARTIAL" || item.correct;
      return (
        <div className="flex flex-col items-center py-3 gap-2 animate-in fade-in slide-in-from-bottom-2">
          <div className={`px-5 py-2.5 rounded-xl ${ok ? "bg-[#ecfdf5] border border-[#10b981]" : "bg-[#fef2f2] border border-[#ef4444]"}`}>
            <span className={`font-bold text-lg ${ok ? "text-[#10b981]" : "text-[#ef4444]"}`}>
              {verdict === "CORRECT" ? "推理正确！🎉" : verdict === "PARTIAL" ? "部分正确！" : "推理有误"}
            </span>
          </div>
          {(item.explanation || item.feedback) ? <p className="text-[#6b7280] text-xs text-center max-w-[85%]">{String(item.explanation || item.feedback)}</p> : null}
          {item.explanation_en ? <p className="text-[#9ca3af] text-[10px] text-center max-w-[85%]">{String(item.explanation_en)}</p> : null}
        </div>
      );
    }

    /* ============  Truth reveal  ============ */
    case "truth_reveal":
      return (
        <div className="bg-[#ecfdf5] border border-[#10b981]/30 rounded-3xl p-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="text-[#10b981] text-xs font-bold mb-2">✨ 真相揭晓</div>
          <p className="text-[#111827] text-sm leading-relaxed">{item.text}</p>
          {item.text_en && <p className="text-[#6b7280] text-xs mt-1">{item.text_en}</p>}
        </div>
      );

    case "choices":
      return null;

    default:
      return item.text ? (
        <div className="px-2 py-1">
          <p className="text-[#6b7280] text-xs">{item.text}</p>
          {item.text_en && <p className="text-[#9ca3af] text-[10px]">{item.text_en}</p>}
        </div>
      ) : null;
  }
}
