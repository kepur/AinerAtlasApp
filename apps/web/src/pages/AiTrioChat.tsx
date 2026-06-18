import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiRequest, API_BASE_URL, getToken } from "../api";

type CircleMsg = {
  id: string;
  role: string;
  content: string;
  translated_content: string;
  user_id: string | null;
};

type CircleRoom = {
  id: string;
  title: string;
  status: string;
  messages: CircleMsg[];
  members: { user_id: string; role: string }[];
};

const QUICK_CHIPS = ["In my view...", "Building on that...", "Contrarily...", "Precisely."];

export default function AiTrioChat() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get("room");

  const [room, setRoom] = useState<CircleRoom | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!roomId) return;
    loadRoom();

    let ws: WebSocket | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (pollTimer) return;
      pollTimer = setInterval(loadRoom, 4000);
    };

    const token = getToken();
    if (token) {
      const wsBase = (API_BASE_URL || window.location.origin).replace(/^http/i, "ws");
      const wsUrl = `${wsBase}/api/circles/ws/${encodeURIComponent(roomId)}?token=${encodeURIComponent(token)}`;
      try {
        ws = new WebSocket(wsUrl);
        ws.onopen = () => {
          if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
          }
        };
        ws.onmessage = (ev) => {
          try {
            const data = JSON.parse(ev.data) as { type?: string; message?: CircleMsg };
            if (data.type === "message" && data.message) {
              const msg = data.message;
              setRoom((prev) => {
                if (!prev) return prev;
                if (prev.messages.some((m) => m.id === msg.id)) return prev;
                return { ...prev, messages: [...prev.messages, msg] };
              });
            }
          } catch {
            /* ignore malformed frames */
          }
        };
        ws.onerror = () => startPolling();
        ws.onclose = () => startPolling();
      } catch {
        startPolling();
      }
    } else {
      startPolling();
    }

    return () => {
      ws?.close();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [room?.messages.length]);

  function loadRoom() {
    if (!roomId) return;
    apiRequest<CircleRoom>(`/api/circles/${roomId}`)
      .then((r) => { setRoom(r); setLoadFailed(false); })
      .catch(() => setLoadFailed((prev) => prev || room === null));
  }

  // The room could not be opened (missing id or backend failure) — surface a
  // real error state with recovery actions instead of a frozen empty chat.
  if (!roomId || (loadFailed && !room)) {
    return (
      <div className="premium fixed inset-0 bg-surface-bright text-on-surface flex flex-col items-center justify-center gap-4 px-8 text-center">
        <span className="material-symbols-outlined text-[48px] text-on-surface-variant">forum</span>
        <p className="text-on-surface-variant text-[15px]">
          {!roomId ? "没有指定对话房间，先去匹配一位语伴吧。" : "无法进入这个对话房间，可能已结束或不存在。"}
        </p>
        <div className="flex gap-3">
          {roomId && (
            <button
              onClick={() => { setLoadFailed(false); loadRoom(); }}
              className="px-5 py-2.5 rounded-full border border-primary/30 text-primary font-bold text-[14px] active:scale-95 transition-transform"
            >
              重试
            </button>
          )}
          <button
            onClick={() => navigate("/match")}
            className="px-5 py-2.5 rounded-full bg-primary text-white font-bold text-[14px] active:scale-95 transition-transform"
          >
            去匹配语伴
          </button>
        </div>
      </div>
    );
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || !roomId || sending) return;
    setSending(true);
    try {
      await apiRequest(`/api/circles/${roomId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: text, content_language: "en" }),
      });
      setInput("");
    } catch { /* ignore */ }
    setSending(false);
  }

  function handleChip(chip: string) {
    setInput((prev) => (prev ? prev + " " + chip : chip));
    textareaRef.current?.focus();
  }

  const messages = room?.messages ?? [];

  return (
    <div className="premium fixed inset-0 bg-surface-bright text-on-surface flex flex-col overflow-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-64 h-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/3 -right-24 w-48 h-48 rounded-full bg-tertiary-fixed/20 blur-2xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-surface/40 to-surface" />
      </div>

      {/* Top App Bar */}
      <header className="flex-shrink-0 flex items-center justify-between px-margin-mobile h-16 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/30 z-50">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-on-surface-variant active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        <div className="flex flex-col items-center">
          <h1 className="font-bold text-[17px] text-primary tracking-tight leading-tight">
            {room?.title || "AI 三人对话"}
          </h1>
          <span className="text-[10px] uppercase tracking-widest text-outline font-bold">Expression Training</span>
        </div>
        <div className="w-10" />
      </header>

      {/* Main Chat Canvas */}
      <main className="flex-1 overflow-y-auto hide-scrollbar px-margin-mobile space-y-4 py-4 pb-8">
        {/* Participants header */}
        <div className="flex justify-center gap-10 pt-2 pb-2">
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-lg">
              A
            </div>
            <span className="text-[11px] text-on-surface-variant font-medium">Partner A</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[22px]">smart_toy</span>
            </div>
            <span className="text-[11px] text-on-surface-variant font-medium">AI Host</span>
          </div>
        </div>

        {/* Context Banner */}
        {room && (
          <div className="glass-panel px-4 py-3 rounded-xl border border-dashed border-outline-variant/50 text-center">
            <p className="text-[12px] text-on-surface-variant italic">{room.title}</p>
          </div>
        )}

        {!roomId && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant">forum</span>
            <p className="text-[15px] text-on-surface-variant text-center px-8">请先在「同频雷达」中找到匹配伙伴，再发起三人对话</p>
            <button
              onClick={() => navigate("/match")}
              className="bg-primary text-white px-6 py-2.5 rounded-full font-bold text-[14px] active:scale-95 transition-all"
            >
              去找伙伴
            </button>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg) => {
          const isAI = msg.role === "assistant";
          const isUser = msg.user_id != null && msg.role === "user";
          if (isAI) {
            return (
              <div key={msg.id} className="flex items-start gap-3 max-w-[85%]">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-white text-[16px]">smart_toy</span>
                </div>
                <div className="ai-message-gradient p-4 rounded-2xl rounded-tl-none shadow-sm border border-white/50">
                  <p className="text-[15px] text-on-surface leading-relaxed">{msg.content}</p>
                  {msg.translated_content && (
                    <p className="text-[12px] text-on-surface-variant mt-1 italic">{msg.translated_content}</p>
                  )}
                </div>
              </div>
            );
          }
          if (isUser) {
            return (
              <div key={msg.id} className="flex flex-col items-end gap-1">
                <div className="user-message-gradient p-4 rounded-2xl rounded-br-none shadow-lg max-w-[85%]">
                  <p className="text-[15px] text-white leading-relaxed">{msg.content}</p>
                </div>
                {msg.translated_content && (
                  <p className="text-[12px] text-on-surface-variant mr-1 italic max-w-[85%] text-right">{msg.translated_content}</p>
                )}
              </div>
            );
          }
          // partner message
          return (
            <div key={msg.id} className="flex items-start gap-3 max-w-[85%]">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm flex-shrink-0">
                A
              </div>
              <div className="bg-surface-container-low p-4 rounded-2xl rounded-tl-none shadow-sm border border-outline-variant/20">
                <p className="text-[15px] text-on-surface leading-relaxed">{msg.content}</p>
                {msg.translated_content && (
                  <p className="text-[12px] text-on-surface-variant mt-1 italic">{msg.translated_content}</p>
                )}
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </main>

      {/* Bottom Input Zone */}
      <div className="flex-shrink-0 z-40 bg-surface/90 backdrop-blur-2xl border-t border-outline-variant/30 px-margin-mobile pt-3 pb-6">
        <div className="flex items-center gap-3 bg-surface-container-low border border-outline-variant/30 rounded-2xl px-4 py-3 transition-all focus-within:ring-2 focus-within:ring-primary/30">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Contribute to the dialogue..."
            className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-[15px] text-on-surface placeholder:text-on-surface-variant/50 resize-none min-h-[24px] max-h-32"
          />
          <button
            onClick={() => void handleSend()}
            disabled={!input.trim() || sending}
            className="flex-shrink-0 w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-md active:scale-95 transition-transform disabled:opacity-40"
          >
            {sending ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined text-[20px]">send</span>
            )}
          </button>
        </div>

        {/* Quick expression chips */}
        <div className="flex gap-2 mt-3 overflow-x-auto hide-scrollbar -mx-2 px-2 pb-1">
          {QUICK_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => handleChip(chip)}
              className="whitespace-nowrap px-4 py-1.5 rounded-full bg-surface-container-high border border-outline-variant/20 text-[12px] text-on-surface-variant active:bg-primary-container/10 transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
