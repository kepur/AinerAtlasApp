import { useState } from "react";
import { ChevronDown, ChevronUp, Send, Zap } from "lucide-react";

type ActionPanelProps = {
  mode: "default" | "question";
  players?: { id: string; name: string; avatarChar: string }[];
  selectedPlayerId?: string;
  onSelectPlayer?: (id: string) => void;
  onSend: (text: string) => void;
  onHelpExpress?: (text: string) => void;
  helpBusy?: boolean;
  disabled?: boolean;
  questionsRemaining?: number;
  onExpandChange?: (expanded: boolean) => void;
};

const QUICK_CHIPS = [
  { zh: "你昨晚在哪里？", en: "Where were you last night?" },
  { zh: "你为什么这么说？", en: "Why did you say that?" },
  { zh: "你的说法和他矛盾", en: "That contradicts what they said." },
  { zh: "你能解释一下吗？", en: "Can you explain that?" },
];

export default function ActionPanel({
  mode,
  players,
  selectedPlayerId,
  onSelectPlayer,
  onSend,
  onHelpExpress,
  helpBusy,
  disabled,
  questionsRemaining = 1,
  onExpandChange,
}: ActionPanelProps) {
  const [text, setText] = useState("");
  const [expanded, setExpanded] = useState(false);

  const locked = mode === "default";
  const quotaExhausted = questionsRemaining <= 0;

  const setPanelExpanded = (next: boolean) => {
    setExpanded(next);
    onExpandChange?.(next);
  };

  const submit = () => {
    if (!text.trim() || disabled || quotaExhausted) return;
    onSend(text.trim());
    setText("");
    setPanelExpanded(false);
  };

  const openPanel = () => {
    if (locked || quotaExhausted) return;
    setPanelExpanded(true);
  };

  return (
    <div className="w-full shrink-0 game-glass-card rounded-t-2xl pt-2 pb-[max(env(safe-area-inset-bottom,12px),12px)] px-3 border-b-0 border-x-0">
      <button
        type="button"
        onClick={() => setPanelExpanded(!expanded)}
        className="w-full flex items-center justify-center py-1"
        aria-label={expanded ? "收起输入面板" : "展开输入面板"}
      >
        <div className="w-10 h-1 bg-white/25 rounded-full" />
        {expanded ? (
          <ChevronDown size={14} className="text-white/40 ml-2" />
        ) : (
          <ChevronUp size={14} className="text-white/40 ml-2" />
        )}
      </button>

      {!expanded && (
        <button
          type="button"
          onClick={openPanel}
          disabled={disabled || locked || quotaExhausted}
          className="w-full mt-1 mb-1 min-h-[44px] rounded-xl bg-white/10 border border-white/15 text-left px-4 text-sm text-white/50 disabled:opacity-45"
        >
          {quotaExhausted
            ? "本轮已提问 · 点击下方「发起投票」"
            : locked
              ? "点击展开 · 选择玩家后提问"
              : "点击展开 · 质疑 TA…(English or 中文)"}
        </button>
      )}

      {expanded && (
        <div className="mt-1 flex flex-col gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {mode === "question" && players && players.length > 0 && (
            <>
              <h3 className="text-white/90 font-bold text-xs text-center">你想问谁？</h3>
              <div className="flex justify-center gap-3 flex-wrap">
                {players.map((p) => {
                  const isSelected = p.id === selectedPlayerId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onSelectPlayer?.(p.id)}
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                        isSelected
                          ? "bg-[#7c5cff] text-white shadow-[0_0_12px_rgba(124,92,255,0.5)] border border-[#c0c1ff]"
                          : "bg-white/10 text-white/70 border border-white/20 hover:bg-white/20"
                      }`}
                    >
                      {p.avatarChar}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip.en}
                type="button"
                onClick={() => setText(chip.zh)}
                disabled={locked || quotaExhausted}
                className="px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs text-white/90 whitespace-nowrap active:bg-white/20 disabled:opacity-40"
              >
                {chip.zh}
              </button>
            ))}
            <button
              type="button"
              disabled={locked || helpBusy || disabled || quotaExhausted}
              onClick={() => onHelpExpress?.(text.trim() || QUICK_CHIPS[0].zh)}
              className="px-3 py-1.5 rounded-full bg-[#7c5cff]/20 border border-[#7c5cff]/50 text-xs text-[#c0c1ff] whitespace-nowrap flex items-center gap-1 shrink-0 disabled:opacity-40"
            >
              <Zap size={12} className={helpBusy ? "animate-pulse" : ""} />
              {helpBusy ? "生成中…" : "帮我表达"}
            </button>
          </div>

          <div className="relative">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
              autoFocus
              className="w-full min-h-[44px] rounded-xl bg-white/10 border border-white/20 text-white px-4 pr-12 outline-none focus:border-[#7c5cff] placeholder:text-white/40 text-sm disabled:opacity-50"
              placeholder={
                quotaExhausted
                  ? "本轮已提问"
                  : locked
                    ? "先选择上方玩家"
                    : "质疑 TA…(English or 中文)"
              }
              type="text"
              disabled={disabled || locked || quotaExhausted}
            />
            <button
              type="button"
              onClick={submit}
              disabled={disabled || locked || quotaExhausted || !text.trim()}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#7c5cff] flex items-center justify-center hover:scale-95 transition-transform disabled:opacity-40"
            >
              <Send size={14} className="text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
