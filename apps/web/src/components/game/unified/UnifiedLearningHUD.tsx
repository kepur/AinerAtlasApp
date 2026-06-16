import { MessageSquare, ShieldAlert, BookOpen, Flame, Leaf, Lightbulb, Volume2, Star } from "lucide-react";

interface HudAgent { agent?: string; name?: string; result: string }
interface HudPattern { pattern: string; example?: string }
interface WhyPoint { point: string; explanation: string }

interface Props {
  mode?: string;
  hud?: Record<string, unknown> | null;
  sessionTitle?: string;
  questionsAsked?: number;
  cluesFound?: number;
  totalClues?: number;
  chapter?: string;
}

export default function UnifiedLearningHUD({ mode, hud, sessionTitle, questionsAsked = 0, cluesFound = 0, totalClues = 6, chapter }: Props) {
  if (!hud || Object.keys(hud).length === 0) return null;

  const isTurtleSoup = mode === "turtle_soup";
  const mainExpr = (hud.main_expression || hud.main_reply_target || hud.expression || "") as string;
  const meaningNative = (hud.meaning_native || hud.main_reply_native || hud.meaning || "") as string;
  const whyPoints = (hud.why_this_expression || []) as WhyPoint[];
  const agents = (hud.agents || []) as HudAgent[];
  const patterns = (hud.patterns_v2 || hud.patterns || []) as (HudPattern | string)[];
  const variants = (hud.variants || {}) as Record<string, string>;

  const grammarTitle = whyPoints[0]?.point || "";
  const grammarExplanation = whyPoints[0]?.explanation || "";
  const variantChips = Object.entries(variants).slice(0, 4);

  return (
    <div className="w-full bg-[#f8f9fc] border-b border-gray-100 p-4 shadow-sm rounded-2xl">
      <div className="flex gap-3">
        {isTurtleSoup ? (
          <>
            {/* Left Column: Natural Expression */}
            <div className="flex-[4] bg-white rounded-2xl p-3 border border-[#ede9fe] shadow-sm flex flex-col justify-between relative overflow-hidden">
              <div>
                <div className="flex items-center gap-1.5 text-[#8b5cf6] font-bold text-xs mb-2">
                  <Leaf size={14} /> 自然表达
                </div>
                <div className="flex justify-between items-start">
                  <h3 className="font-extrabold text-[#111827] text-lg leading-tight">{mainExpr || "等待提问..."}</h3>
                  {mainExpr && (
                    <button className="w-6 h-6 rounded-full bg-[#f5f3ff] text-[#8b5cf6] flex items-center justify-center shrink-0">
                      <Volume2 size={12} />
                    </button>
                  )}
                </div>
                {meaningNative && <p className="text-xs text-[#6b7280] mt-1">{meaningNative}</p>}
              </div>
              {mainExpr && (
                <div className="mt-3">
                  <span className="inline-flex items-center gap-1 bg-[#f5f3ff] text-[#8b5cf6] px-2 py-0.5 rounded text-[10px] font-bold">
                    <Star size={10} /> 高频问法
                  </span>
                </div>
              )}
            </div>

            {/* Right Column: Grammar & Chips */}
            <div className="flex-[6] bg-gradient-to-br from-[#fff1f2] to-[#fce7f3] rounded-2xl p-3 border border-[#fbcfe8] shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-1.5 text-[#d97706] font-bold text-xs">
                    <Lightbulb size={14} /> 为什么这么写
                  </div>
                  <button className="text-[#d97706]"><Volume2 size={12} /></button>
                </div>
                {grammarTitle && <h4 className="font-bold text-[#111827] text-sm mb-1">{grammarTitle}</h4>}
                {grammarExplanation && <p className="text-[10px] text-[#4b5563] leading-snug">{grammarExplanation}</p>}
                {whyPoints.slice(1).map((wp, i) => (
                  <p key={i} className="text-[10px] text-[#4b5563] leading-snug mt-1">• {wp.point}：{wp.explanation}</p>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {variantChips.length > 0
                  ? variantChips.map(([key, val]) => (
                      <span key={key} className="bg-[#ffedd5] text-[#b45309] px-2 py-1 rounded-full text-[9px] font-bold border border-[#fed7aa]">{val}</span>
                    ))
                  : patterns.slice(0, 3).map((p, i) => (
                      <span key={i} className="bg-[#ffedd5] text-[#b45309] px-2 py-1 rounded-full text-[9px] font-bold border border-[#fed7aa]">
                        {typeof p === "string" ? p : p.pattern}
                      </span>
                    ))}
              </div>
            </div>
          </>
        ) : (
          <div className="w-full flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {/* 1. 自然表达 */}
            {mainExpr && (
              <div className="min-w-[200px] flex-1 bg-white rounded-2xl p-3 border border-[#ede9fe] shadow-sm flex flex-col justify-between relative shrink-0">
                <div>
                  <div className="flex items-center gap-1.5 text-[#8b5cf6] font-bold text-xs mb-2">
                    <Leaf size={14} /> 自然表达
                  </div>
                  <h3 className="font-extrabold text-[#111827] text-sm leading-tight">{mainExpr}</h3>
                  {meaningNative && <p className="text-[11px] text-[#6b7280] mt-1">{meaningNative}</p>}
                </div>
                <div className="flex justify-end mt-2">
                  <button className="w-6 h-6 rounded-full bg-[#f5f3ff] text-[#8b5cf6] flex items-center justify-center shrink-0">
                    <Volume2 size={12} />
                  </button>
                </div>
              </div>
            )}

            {/* 2. 为什么这么写 */}
            {whyPoints.length > 0 && (
              <div className="min-w-[200px] flex-1 bg-white rounded-2xl p-3 border border-[#ede9fe] shadow-sm flex flex-col shrink-0">
                <div className="flex items-center gap-1.5 text-[#d97706] font-bold text-xs mb-2">
                  <Lightbulb size={14} /> 为什么这么写
                </div>
                <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[80px] no-scrollbar">
                  {whyPoints.map((wp, i) => (
                    <div key={i} className="flex flex-col">
                      <span className="font-bold text-[11px] text-[#111827]">{wp.point}</span>
                      <span className="text-[10px] text-[#6b7280] leading-snug">{wp.explanation}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. 本句重点 (Variants & Patterns) */}
            {(variantChips.length > 0 || patterns.length > 0) && (
              <div className="min-w-[180px] flex-1 bg-white rounded-2xl p-3 border border-[#ede9fe] shadow-sm flex flex-col shrink-0">
                <div className="flex items-center gap-1.5 text-[#e11d48] font-bold text-xs mb-2">
                  <Star size={14} /> 本句重点 {variantChips.length || patterns.length}个
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {variantChips.length > 0
                    ? variantChips.map(([key, val]) => (
                        <span key={key} className="bg-[#fff1f2] text-[#e11d48] px-2 py-1 rounded border border-[#ffe4e6] text-[10px] font-bold">{val}</span>
                      ))
                    : patterns.slice(0, 4).map((p, i) => (
                        <span key={i} className="bg-[#fff1f2] text-[#e11d48] px-2 py-1 rounded border border-[#ffe4e6] text-[10px] font-bold">
                          {typeof p === "string" ? p : p.pattern}
                        </span>
                      ))}
                </div>
              </div>
            )}

            {/* 4. Agent简析 (Multi-Agent) */}
            {agents.length > 0 && (
              <div className="min-w-[200px] flex-1 bg-white rounded-2xl p-3 border border-[#ede9fe] shadow-sm flex flex-col shrink-0">
                <div className="flex items-center gap-1.5 text-[#6366f1] font-bold text-xs mb-2">
                  <MessageSquare size={14} /> Agent 简析
                </div>
                <div className="flex flex-col gap-2 overflow-y-auto max-h-[80px] no-scrollbar">
                  {agents.map((a, i) => {
                    const agentName = a.agent || a.name || `Agent ${i + 1}`;
                    return (
                      <div key={i} className="flex gap-2 items-start">
                        <div className="w-5 h-5 rounded-full bg-[#f5f3ff] text-[#8b5cf6] flex items-center justify-center shrink-0"><BookOpen size={10} /></div>
                        <div>
                          <div className="text-[10px] font-bold text-[#8b5cf6]">{agentName}</div>
                          <p className="text-[10px] text-[#4b5563] leading-snug">{a.result}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="mt-3 bg-gradient-to-r from-[#f5f3ff] to-transparent rounded-xl p-2.5 flex justify-between items-center border border-[#ede9fe]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-[#8b5cf6]/10 flex items-center justify-center text-[#8b5cf6] text-lg font-bold">
            {isTurtleSoup ? "🐢" : mode === "detective" ? "🔍" : "🏰"}
          </div>
          <div>
            <div className="text-xs font-bold text-[#111827]">
              当前模式：<span className="text-[#8b5cf6]">
                {isTurtleSoup ? `海龟汤 · ${sessionTitle || "推理中"}` : mode === "detective" ? `AI侦探 · ${sessionTitle || "调查中"}` : `角色扮演 · ${sessionTitle || "进行中"}`}
              </span>
            </div>
            <div className="text-[10px] text-[#6b7280]">
              {isTurtleSoup ? "通过提问找线索，还原事实真相" : mode === "detective" ? "观察细节，找出真凶" : "输入中文 → AI 推进剧情 + 生成英文表达"}
            </div>
          </div>
        </div>
        <div className="text-[10px] font-bold text-[#8b5cf6] bg-[#f5f3ff] px-2 py-1 rounded-md border border-[#ede9fe]">
          {isTurtleSoup ? `线索 ${cluesFound}/${totalClues}` : chapter || `第 ${questionsAsked || 1} 回合`}
        </div>
      </div>
    </div>
  );
}
