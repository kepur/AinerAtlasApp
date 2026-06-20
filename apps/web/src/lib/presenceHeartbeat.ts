import { apiRequest } from "../api";

let timer: ReturnType<typeof setInterval> | null = null;

export function startPresenceHeartbeat(enabled: boolean) {
  stopPresenceHeartbeat();
  if (!enabled) return;

  const beat = () => {
    void apiRequest<{ ok?: boolean }>("/api/connect/presence/heartbeat", { method: "POST" }).catch(() => {});
  };
  beat();
  timer = setInterval(beat, 60_000);
}

export function stopPresenceHeartbeat() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
