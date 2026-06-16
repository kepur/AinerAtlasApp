import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Volume2, RefreshCcw, ChevronRight, Star, BookOpen } from "lucide-react";

export default function GameSummaryScreen() {
  const navigate = useNavigate();
  const { id, mode } = useParams();
  const isDetective = mode === "detective" || window.location.pathname.includes("detective");

  return (
    <div className="w-full h-full bg-[#f8f9fc] flex flex-col overflow-y-auto pb-36 no-scrollbar">
      {/* Header */}
      <header className="sticky top-0 left-0 w-full z-50 flex items-center justify-between px-4 h-14 bg-white/90 backdrop-blur-md pt-[env(safe-area-inset-top,20px)] border-b border-gray-100">
        <button onClick={() => navigate('/game')} className="w-8 h-8 flex items-center justify-center text-[#111827] rounded-full hover:bg-gray-50 transition-colors border border-gray-200">
          <ArrowLeft size={18} />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="font-extrabold text-[#111827] text-base">Game Summary</h1>
          <p className="text-[10px] text-[#6b7280]">案件总结</p>
        </div>
        <div className="flex items-center gap-1 bg-[#f0fdf4] text-[#15803d] px-2.5 py-1 rounded-full border border-[#bbf7d0] text-[11px] font-bold">
          <CheckCircle2 size={12} className="text-[#15803d]" /> 破案成功
        </div>
      </header>

      <main className="px-4 pt-4 flex flex-col gap-4">

        {/* Hero Banner */}
        <div className="w-full bg-gradient-to-br from-[#4c1d95] via-[#6d28d9] to-[#7c3aed] rounded-[24px] p-5 relative overflow-hidden shadow-lg">
          {/* Background image */}
          <img
            src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=400&h=200"
            alt="Case"
            className="absolute inset-0 w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#4c1d95]/90 to-transparent" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-1 bg-white/20 text-white px-2 py-0.5 rounded text-[9px] font-bold mb-2">
              案件
            </div>
            <h2 className="font-bold text-white text-base mb-3">咖啡馆的谎言</h2>
            <div className="flex items-center gap-2 mb-4">
              <div className="text-3xl">🏆</div>
              <div>
                <div className="font-black text-[#fde68a] text-xl leading-tight">你找出了真相</div>
              </div>
            </div>
            <p className="text-white/80 text-[11px] leading-relaxed mb-4">
              通过缜密的推理与犀利的提问，你成功揭穿了真凶的谎言，还原了案件的全部真相。
            </p>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { icon: "🎯", label: "推理正确率", value: "88%" },
                { icon: "🔍", label: "线索", value: "8/8" },
                { icon: "💬", label: "审问", value: "12轮" },
                { icon: "⏱", label: "时长", value: "14 分钟" },
              ].map((s, i) => (
                <div key={i} className={`flex flex-col items-center justify-center py-2.5 rounded-xl ${i === 3 ? "bg-white text-[#111827]" : "bg-white/15 text-white"}`}>
                  <div className="text-lg mb-0.5">{s.icon}</div>
                  <div className={`font-black text-base leading-tight ${i === 3 ? "text-[#111827]" : "text-white"}`}>{s.value}</div>
                  <div className={`text-[8px] font-medium mt-0.5 ${i === 3 ? "text-[#6b7280]" : "text-white/70"}`}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 案件真相 */}
        <div className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded bg-[#f5f3ff] text-[#8b5cf6] flex items-center justify-center">
              <Star size={13} fill="#8b5cf6" />
            </div>
            <h3 className="font-bold text-[#111827] text-sm">案件真相</h3>
            <div className="ml-auto text-2xl">📂</div>
          </div>
          <p className="text-[11px] text-[#4b5563] leading-relaxed">
            咖啡馆老板并未被外人勒索。真正的勒索短信是店员 Leo 为掩盖自己偷取现金的行为而伪造的，并嫁祸给老板以转移注意力。
          </p>
        </div>

        {/* 高光表现 */}
        <div className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded bg-[#fef9c3] text-[#ca8a04] flex items-center justify-center">
              <Star size={13} fill="#ca8a04" />
            </div>
            <h3 className="font-bold text-[#111827] text-sm">你的高光表现</h3>
            <div className="ml-auto text-2xl">⭐</div>
          </div>
          <div className="flex flex-col gap-2">
            {[
              "敏锐识别 Anna 和 Leo 证词中的矛盾点",
              "将「湿雨伞」与监控时间线成功关联",
              "提出关键追问，逼近真相并戳破谎言",
            ].map((p, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-[#8b5cf6] shrink-0 mt-0.5" />
                <span className="text-[11px] text-[#4b5563]">{p}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 高光台相 */}
        <div className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded bg-[#f0fdf4] text-[#15803d] flex items-center justify-center">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <h3 className="font-bold text-[#111827] text-sm">高光台相</h3>
          </div>
          <div className="flex flex-col gap-2.5">
            {[
              { en: "When was the last time you saw the owner?", zh: "你最后一次见到老板是什么时候？" },
              { en: "Then why is your statement different from Leo's?", zh: "那为什么和 Leo 的说法不同？" },
              { en: "That doesn't add up.", zh: "这说不通。" },
            ].map((line, i) => (
              <div key={i} className="flex items-center gap-3 bg-[#f8f9fc] rounded-xl px-3 py-2.5 border border-gray-100">
                <div className="w-5 h-5 rounded-full bg-[#f5f3ff] text-[#8b5cf6] flex items-center justify-center text-[10px] font-bold shrink-0">💬</div>
                <div className="flex-1">
                  <p className="text-[11px] font-medium text-[#111827]">{line.en}</p>
                  <p className="text-[10px] text-[#9ca3af]">{line.zh}</p>
                </div>
                <button className="w-6 h-6 rounded-full bg-white text-[#8b5cf6] flex items-center justify-center shadow-sm border border-[#ede9fe] shrink-0">
                  <Volume2 size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 学到的句型 + 加入消消乐 */}
        <div className="flex gap-3">
          <div className="flex-1 bg-white rounded-[20px] p-3.5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-1.5 mb-3">
              <BookOpen size={13} className="text-[#8b5cf6]" />
              <h4 className="font-bold text-[#111827] text-xs">学到的句型</h4>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { pat: "When was the last time you...?", use: "询问时间" },
                { pat: "Can you explain why...?", use: "请求解释" },
                { pat: "That doesn't add up.", use: "指出矛盾" },
                { pat: "I suspect that...", use: "表达怀疑" },
              ].map((p, i) => (
                <div key={i} className="w-full bg-[#f5f3ff] rounded-lg px-2 py-1.5 border border-[#ede9fe]">
                  <p className="text-[10px] font-bold text-[#6d28d9] truncate">{p.pat}</p>
                  <p className="text-[8px] text-[#9ca3af]">{p.use}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 bg-white rounded-[20px] p-3.5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-1.5 mb-3">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="#8b5cf6"><path d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7 1.49 0 2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z"/></svg>
              <h4 className="font-bold text-[#111827] text-xs">加入消消乐 / Crush</h4>
            </div>
            <div className="flex flex-col gap-2">
              {[
                { pat: "When was the last time you...?", use: "询问时间" },
                { pat: "That doesn't add up.", use: "指出矛盾" },
              ].map((p, i) => (
                <div key={i} className="bg-[#f8f9fc] rounded-xl p-2 border border-gray-100">
                  <p className="text-[10px] font-bold text-[#111827] mb-0.5 truncate">{p.pat}</p>
                  <p className="text-[8px] text-[#9ca3af] mb-1.5">{p.use}</p>
                  <button className="w-full bg-[#8b5cf6] text-white text-[9px] font-bold py-1 rounded-lg hover:bg-[#7c3aed] active:scale-95 transition-all">
                    加入今日练习
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 本局学习收获 + 词汇亮点 */}
        <div className="flex gap-3">
          <div className="flex-1 bg-white rounded-[20px] p-3.5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-1.5 mb-3">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              <h4 className="font-bold text-[#111827] text-xs">本局学习收获</h4>
            </div>
            <div className="flex flex-col gap-2.5">
              <div>
                <div className="flex justify-between items-baseline mb-0.5">
                  <span className="text-[9px] text-[#6b7280]">新学单词</span>
                  <span className="text-[9px] font-bold text-[#8b5cf6]">查看单词本 &gt;</span>
                </div>
                <div className="text-2xl font-black text-[#111827]">18 <span className="text-xs font-normal text-[#6b7280]">个</span></div>
              </div>
              <div>
                <span className="text-[9px] text-[#6b7280]">表达熟练度</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-black text-[#10b981]">+24%</span>
                  <span className="text-[9px] text-[#10b981]">↑ 很棒！</span>
                </div>
              </div>
              <div>
                <span className="text-[9px] text-[#6b7280]">自信心提升</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-black text-[#f59e0b]">+30%</span>
                  <span className="text-[9px] text-[#f59e0b]">↑ 继续加油！</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 bg-white rounded-[20px] p-3.5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-[#8b5cf6]">Aa</span>
                <h4 className="font-bold text-[#111827] text-xs">词汇亮点</h4>
              </div>
              <span className="text-[9px] text-[#8b5cf6] font-bold flex items-center">查看全部 <ChevronRight size={10} /></span>
            </div>
            <div className="flex flex-col gap-2.5">
              {[
                { word: "extortion", pron: "/ɪkˈstɔːrʃən/", zh: "勒索" },
                { word: "alibi", pron: "/ˈælɪbaɪ/", zh: "不在场证明" },
                { word: "evidence", pron: "/ˈevɪdəns/", zh: "证据" },
              ].map((v, i) => (
                <div key={i} className="flex items-center justify-between border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                  <div>
                    <p className="text-[11px] font-bold text-[#111827]">{v.word}</p>
                    <p className="text-[8px] text-[#9ca3af]">{v.pron}  {v.zh}</p>
                  </div>
                  <Star size={12} className="text-[#fbbf24] fill-[#fbbf24]" />
                </div>
              ))}
            </div>
          </div>
        </div>

      </main>

      {/* Bottom Buttons */}
      <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t border-gray-100 px-4 pt-3 pb-[env(safe-area-inset-bottom,16px)] z-50">
        <div className="text-[10px] font-bold text-[#6b7280] mb-2">保存与继续</div>
        <div className="grid grid-cols-3 gap-2">
          <button className="flex items-center justify-center gap-1.5 bg-[#8b5cf6] text-white h-11 rounded-xl text-[11px] font-bold shadow-md hover:bg-[#7c3aed] active:scale-95 transition-all col-span-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            保存到 Assets
          </button>
          <button
            onClick={() => navigate(`/game/play/detective/coffee`)}
            className="flex items-center justify-center gap-1.5 bg-white text-[#6b7280] h-11 rounded-xl text-[11px] font-bold border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all"
          >
            <RefreshCcw size={13} /> 再玩一局
          </button>
          <button
            onClick={() => navigate('/game')}
            className="flex items-center justify-center gap-1.5 bg-white text-[#6b7280] h-11 rounded-xl text-[11px] font-bold border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all"
          >
            下一案件 <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
