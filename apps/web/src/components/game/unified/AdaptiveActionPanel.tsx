import { Mic, Send, Loader2 } from "lucide-react";

interface Choice { label: string; action: string }

interface Props {
  mode?: string;
  input?: string;
  onInputChange?: (val: string) => void;
  onSend?: () => void;
  onChoice?: (action: string) => void;
  onSolve?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  turnLoading?: boolean;
  choices?: Choice[];
  disabled?: boolean;
  placeholder?: string;
}

export default function AdaptiveActionPanel({
  mode = "roleplay",
  input = "",
  onInputChange,
  onSend,
  onChoice,
  onSolve,
  onKeyDown,
  turnLoading,
  choices = [],
  disabled,
  placeholder,
}: Props) {
  const ph =
    placeholder ||
    (mode === "turtle_soup"
      ? "输入你的问题，中文或英文都可以..."
      : mode === "detective"
        ? "输入你的推理..."
        : "输入中文或英文，和 AI 边玩边学...");

  return (
    <div className="w-full shrink-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 px-4 pt-3 pb-[max(env(safe-area-inset-bottom,16px),16px)] z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">

      {/* ============  Roleplay  ============ */}
      {mode === "roleplay" && (
        <div className="flex flex-col gap-3">
          {choices.length > 0 && (
            <div className="flex gap-2 justify-between items-center w-full">
              {choices.map((c, i) => {
                const styles = [
                  "bg-white border-gray-200 text-[#4b5563] hover:border-[#3b82f6] hover:text-[#3b82f6]",
                  "bg-[#f0fdf4] border-[#bbf7d0] text-[#166534] hover:bg-[#dcfce7]",
                  "bg-white border-gray-200 text-[#4b5563] hover:border-[#ef4444] hover:text-[#ef4444]",
                ];
                const icons = ["❄️", "🍃", "🔥"];
                return (
                  <button
                    key={i}
                    onClick={() => onChoice?.(c.label)}
                    disabled={turnLoading || disabled}
                    className={`flex-1 py-2 px-1 border rounded-xl text-[11px] font-bold shadow-sm flex items-center justify-center gap-1 transition-colors disabled:opacity-40 ${styles[i % styles.length]}`}
                  >
                    <span>{icons[i % icons.length]}</span> {c.label}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-[#6b7280] border border-gray-200 shrink-0 shadow-sm active:scale-95 transition-transform">
              <Mic size={18} />
            </button>
            <div className="flex-1 h-10 bg-gray-50 border border-gray-200 rounded-full flex items-center px-4 shadow-inner focus-within:border-[#8b5cf6] focus-within:ring-1 focus-within:ring-[#8b5cf6] transition-all">
              <input
                type="text"
                value={input}
                onChange={(e) => onInputChange?.(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={ph}
                disabled={disabled}
                className="flex-1 bg-transparent border-none outline-none text-xs text-[#111827] placeholder:text-[#9ca3af]"
              />
            </div>
            <button
              onClick={onSend}
              disabled={turnLoading || disabled || !input.trim()}
              className="w-10 h-10 rounded-full bg-[#a78bfa] text-white flex items-center justify-center shrink-0 shadow-md active:scale-95 transition-transform disabled:opacity-40"
            >
              {turnLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} className="ml-0.5" />}
            </button>
          </div>
        </div>
      )}

      {/* ============  Turtle Soup  ============ */}
      {mode === "turtle_soup" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between bg-[#f5f3ff] rounded-full px-4 py-2.5 border border-[#ede9fe]">
            <div className="flex items-center gap-2">
              <div className="text-[#8b5cf6]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
              </div>
              <div className="text-[11px] text-[#4b5563] font-medium">
                <span className="font-bold text-[#8b5cf6] mr-2">当前模式：提问推理</span>
                <span className="text-gray-300 mr-2">|</span>
                输入中文 → AI 生成英文问题
              </div>
            </div>
            <div className="w-4 h-4 rounded-full border border-[#8b5cf6] text-[#8b5cf6] flex items-center justify-center text-[10px] font-bold">i</div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {["✨ Did he...?", "✨ Was it because...?", "✨ Is it related to...?"].map((chip, i) => (
              <button
                key={i}
                onClick={() => onInputChange?.(chip.replace("✨ ", ""))}
                className="shrink-0 px-4 py-2 bg-white text-[#8b5cf6] border border-[#ede9fe] rounded-full text-[11px] font-bold shadow-sm active:scale-95 transition-transform whitespace-nowrap hover:bg-[#f5f3ff]"
              >
                {chip}
              </button>
            ))}
            <button className="shrink-0 px-4 py-2 bg-[#f5f3ff] text-[#8b5cf6] rounded-full text-[11px] font-bold active:scale-95 transition-transform whitespace-nowrap flex items-center gap-1 hover:bg-[#ede9fe]">
              <span>🔄</span> 换一批
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#4b5563] border border-gray-200 shrink-0 shadow-sm active:scale-95 transition-transform hover:text-[#8b5cf6]">
              <Mic size={20} />
            </button>
            <div className="flex-1 h-12 bg-white border border-gray-200/80 rounded-full flex items-center px-5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] focus-within:border-[#8b5cf6] focus-within:ring-2 focus-within:ring-[#ede9fe] transition-all">
              <input
                type="text"
                value={input}
                onChange={(e) => onInputChange?.(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={ph}
                disabled={disabled}
                className="flex-1 bg-transparent border-none outline-none text-sm text-[#111827] placeholder:text-[#9ca3af]"
                style={{ border: "none", outline: "none", boxShadow: "none" }}
              />
            </div>
            <button
              onClick={onSend}
              disabled={turnLoading || disabled || !input.trim()}
              className="w-12 h-12 rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(139,92,246,0.3)] active:scale-95 transition-transform disabled:opacity-40"
            >
              {turnLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={16} className="ml-0.5" />}
            </button>
          </div>

          {onSolve && (
            <button
              onClick={onSolve}
              disabled={turnLoading || disabled}
              className="w-full py-2.5 bg-[#f5f3ff] text-[#8b5cf6] rounded-2xl text-xs font-bold border border-[#ede9fe] hover:bg-[#ede9fe] active:scale-[0.98] transition-all disabled:opacity-40"
            >
              💡 我知道答案了！提交推理
            </button>
          )}
        </div>
      )}

      {/* ============  Detective  ============ */}
      {mode === "detective" && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2.5">
            <button onClick={() => onChoice?.("interrogate")} disabled={turnLoading || disabled} className="py-3.5 bg-[#fefce8] border border-[#fef08a] rounded-2xl text-sm font-bold text-[#854d0e] shadow-sm hover:bg-[#fef9c3] active:scale-95 transition-transform disabled:opacity-40">询问嫌疑人</button>
            <button onClick={() => onChoice?.("examine")} disabled={turnLoading || disabled} className="py-3.5 bg-[#eff6ff] border border-[#bfdbfe] rounded-2xl text-sm font-bold text-[#1d4ed8] shadow-sm hover:bg-[#dbeafe] active:scale-95 transition-transform disabled:opacity-40">查看线索</button>
            <button onClick={() => onChoice?.("challenge")} disabled={turnLoading || disabled} className="py-3.5 bg-[#fff7ed] border border-[#ffedd5] rounded-2xl text-sm font-bold text-[#c2410c] shadow-sm hover:bg-[#ffedd5]/80 active:scale-95 transition-transform disabled:opacity-40">指出矛盾</button>
            <button onClick={() => onChoice?.("deduce")} disabled={turnLoading || disabled} className="py-3.5 bg-gradient-to-r from-[#eab308] to-[#ca8a04] border border-transparent rounded-2xl text-sm font-bold text-white shadow-[0_4px_12px_rgba(234,179,8,0.25)] hover:opacity-95 active:scale-95 transition-transform disabled:opacity-40">提交推理</button>
          </div>
          <div className="flex items-center gap-2.5 mt-1">
            <div className="flex-1 h-12 bg-[#f9fafb] border border-gray-200/80 rounded-full flex items-center px-5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] focus-within:border-[#eab308] focus-within:ring-2 focus-within:ring-[#fef9c3] transition-all">
              <input
                type="text"
                value={input}
                onChange={(e) => onInputChange?.(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={ph}
                disabled={disabled}
                className="flex-1 bg-transparent border-none outline-none text-sm text-[#111827] placeholder:text-[#9ca3af]"
                style={{ border: "none", outline: "none", boxShadow: "none" }}
              />
            </div>
            <button
              onClick={onSend}
              disabled={turnLoading || disabled || !input.trim()}
              className="w-12 h-12 rounded-full bg-gradient-to-r from-[#eab308] to-[#ca8a04] text-white flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(234,179,8,0.25)] active:scale-95 transition-transform disabled:opacity-40"
            >
              {turnLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={16} className="ml-0.5" />}
            </button>
          </div>
        </div>
      )}

      {/* ============  Werewolf  ============ */}
      {mode === "werewolf" && (
        <div className="grid grid-cols-2 gap-2">
          <button className="py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-[#4b5563] shadow-sm hover:border-[#6366f1] hover:text-[#6366f1]">质疑玩家</button>
          <button className="py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-[#4b5563] shadow-sm hover:border-[#6366f1] hover:text-[#6366f1]">发表分析</button>
          <button className="py-3 col-span-2 bg-[#e0e7ff] border border-[#c7d2fe] rounded-xl text-sm font-bold text-[#4338ca] shadow-sm">发起投票</button>
        </div>
      )}
    </div>
  );
}
