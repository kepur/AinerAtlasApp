import { Loader, MessageSquare, Sparkles, Volume2 } from "lucide-react";
import { useEffect, useRef } from "react";
import type { VoiceDialogueTurn } from "../../lib/voiceTurnHelpers";

type GrammarTip = { pattern: string; explanation: string };

export type VoiceBubble = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  status: "streaming" | "final" | "error";
  tips?: GrammarTip[];
  rewrite?: string;
};

type Props = {
  messages: VoiceBubble[];
  turns: VoiceDialogueTurn[];
  activeTurnId: string | null;
  inCall: boolean;
  connecting?: boolean;
  onTurnClick: (turnId: string) => void;
  speak: (text: string, lang?: string) => void;
  feedRef: React.RefObject<HTMLDivElement | null>;
  onFeedScroll: () => void;
  onFeedTap?: () => void;
  tapToEnd?: boolean;
};

export default function VoiceConversationFeed({
  messages,
  turns,
  activeTurnId,
  inCall,
  connecting = false,
  onTurnClick,
  speak,
  feedRef,
  onFeedScroll,
  onFeedTap,
  tapToEnd,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const msgById = new Map(messages.map((m) => [m.id, m]));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, turns]);

  const dialogueTurns = turns.filter((t) => msgById.has(t.userBubbleId));

  const feedClass = [
    "voice-conversation-feed conversation-feed flex-1 min-h-0 overflow-y-auto hide-scrollbar px-margin-mobile py-3",
    inCall && tapToEnd ? "cursor-pointer" : "",
    inCall ? "voice-conversation-feed--live" : "",
    connecting ? "voice-conversation-feed--connecting" : "",
  ].filter(Boolean).join(" ");

  return (
    <div
      ref={feedRef}
      onClick={onFeedTap}
      onScroll={onFeedScroll}
      className={feedClass}
    >
      {messages.length === 0 && !inCall && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <p className="font-bold text-[16px] text-primary">点击下方开始通话</p>
          <p className="text-[12px] text-outline mt-2 max-w-[240px]">接通后麦克风常开，全双工对话，只有手动挂断才会结束</p>
        </div>
      )}

      {dialogueTurns.map((turn, idx) => {
        const userMsg = msgById.get(turn.userBubbleId);
        const assistantMsg = turn.assistantBubbleId ? msgById.get(turn.assistantBubbleId) : undefined;
        if (!userMsg) return null;
        const isActive = turn.turn_id === activeTurnId;

        return (
          <div
            key={turn.turn_id}
            className={`turn-block voice-turn-block ${isActive ? "active" : ""}`}
            onClick={() => onTurnClick(turn.turn_id)}
          >
            <div className="conv-row user">
              <div className="conv-bubble user voice-conv-bubble-user">{userMsg.text}</div>
            </div>
            {assistantMsg ? (
              <div className="conv-row assistant">
                <div className="conv-avatar"><MessageSquare size={12} /></div>
                <div>
                  <div className={`conv-bubble assistant voice-conv-bubble-ai${assistantMsg.status === "streaming" ? " typing" : ""}`}>
                    {assistantMsg.text ? (
                      <>
                        <span>{assistantMsg.text}</span>
                        {assistantMsg.status === "final" && (
                          <button
                            type="button"
                            className="conv-speak"
                            onClick={(e) => { e.stopPropagation(); speak(assistantMsg.text, "en-US"); }}
                          >
                            <Volume2 size={14} />
                          </button>
                        )}
                        {assistantMsg.status === "streaming" && (
                          <span className="inline-block w-1.5 h-4 ml-0.5 bg-primary/50 animate-pulse align-middle" />
                        )}
                      </>
                    ) : (
                      <div className="thinking-dots"><i /><i /><i /></div>
                    )}
                  </div>
                  <span className="conv-time">
                    <span className="turn-index-inline">T{idx + 1}</span>
                    {turn.status === "analyzing" && (
                      <span className="learning-badge analyzing"><Loader size={10} className="spin" /> 分析中</span>
                    )}
                    {turn.status === "ready" && turn.focusCount > 0 && (
                      <span className="learning-badge">
                        <Sparkles size={10} /> {turn.focusCount} 学习点
                      </span>
                    )}
                  </span>
                  {assistantMsg.rewrite && assistantMsg.rewrite !== assistantMsg.text && assistantMsg.status === "final" && (
                    <p className="voice-rewrite-hint">💡 {assistantMsg.rewrite}</p>
                  )}
                </div>
              </div>
            ) : (turn.status === "pending" || turn.status === "replying") ? (
              <div className="conv-row assistant">
                <div className="conv-avatar"><MessageSquare size={12} /></div>
                <div className="conv-bubble assistant typing"><div className="thinking-dots"><i /><i /><i /></div></div>
              </div>
            ) : null}
          </div>
        );
      })}

      {messages
        .filter((m) => m.role === "system" || !turns.some((t) => t.userBubbleId === m.id || t.assistantBubbleId === m.id))
        .map((msg) => {
          const isConnecting = /连接/.test(msg.text);
          const isSuccess = /接通|已连接/.test(msg.text);
          const isError = msg.status === "error" || /断开|失败|超时/.test(msg.text);
          const bannerClass = isError
            ? "voice-system-banner voice-system-banner--error"
            : isConnecting
              ? "voice-system-banner voice-system-banner--connecting"
              : isSuccess
                ? "voice-system-banner voice-system-banner--success"
                : "voice-system-banner";
          return (
            <div key={msg.id} className={bannerClass}>
              <p>{msg.text}</p>
            </div>
          );
        })}

      <div ref={bottomRef} />
    </div>
  );
}
