import { useState } from "react";
import { Send, Zap } from "lucide-react";

type ActionPanelProps = {
  mode: "default" | "question";
  players?: { id: string; name: string; avatarChar: string }[];
  selectedPlayerId?: string;
  onSelectPlayer?: (id: string) => void;
  onSend: (text: string) => void;
  disabled?: boolean;
};

export default function ActionPanel({ mode, players, selectedPlayerId, onSelectPlayer, onSend, disabled }: ActionPanelProps) {
  const [text, setText] = useState("");
  // default 模式 = 未选定质疑目标。此时锁定输入，避免 onSend(handleQuestion)
  // 因 selectedPlayerId 缺失而静默 return，造成"发言发不出去"的困惑。
  const locked = mode === "default";

  const submit = () => {
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText("");
  };

  return (
    <div className="fixed bottom-0 left-0 w-full z-50 game-glass-card rounded-t-3xl pt-4 pb-[calc(env(safe-area-inset-bottom)+16px)] px-4 border-b-0 border-x-0">
      <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4"></div>

      {mode === "question" && players && (
        <>
          <h3 className="text-white font-bold mb-4 text-center">你想问谁？</h3>
          <div className="flex justify-between mb-4 px-2">
            {players.map((p) => {
              const isSelected = p.id === selectedPlayerId;
              return (
                <button
                  key={p.id}
                  onClick={() => onSelectPlayer && onSelectPlayer(p.id)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all ${isSelected ? 'bg-[#7c5cff] text-white shadow-[0_0_15px_rgba(124,92,255,0.6)] border-2 border-[#c0c1ff]' : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/20'}`}
                >
                  {p.avatarChar}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Quick Chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 pb-1">
        {["Why were you there?", "I suspect you.", "That doesn't add up."].map((chip) => (
          <button
            key={chip}
            onClick={() => setText(chip)}
            disabled={locked}
            className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-sm text-white/90 whitespace-nowrap active:bg-white/20 disabled:opacity-40 disabled:active:bg-white/10"
          >
            {chip}
          </button>
        ))}
        <button disabled={locked} className="px-4 py-2 rounded-full bg-[#7c5cff]/20 backdrop-blur-md border border-[#7c5cff]/50 text-sm text-[#c0c1ff] whitespace-nowrap flex items-center gap-1 shrink-0 disabled:opacity-40">
          <Zap size={14} /> 帮我表达
        </button>
      </div>

      {/* Input Area */}
      <div className="relative">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
          className="w-full min-h-[50px] rounded-2xl bg-white/10 border border-white/20 text-white px-4 pr-14 outline-none focus:border-[#7c5cff] placeholder:text-white/40 text-sm disabled:opacity-50"
          placeholder={locked ? "点击上方玩家头像，选择质疑对象" : "质疑 TA…(English or 中文)"}
          type="text"
          disabled={disabled || locked}
        />
        <button
          onClick={submit}
          disabled={disabled || locked || !text.trim()}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#7c5cff] flex items-center justify-center hover:scale-95 transition-transform disabled:opacity-40"
        >
          <Send size={16} className="text-white" />
        </button>
      </div>
    </div>
  );
}
