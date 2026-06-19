/** Microphone requires a secure context (HTTPS or localhost). */

export function isSecureMicContext(): boolean {
  if (typeof window === "undefined") return false;
  return window.isSecureContext;
}

export function assertMicrophoneAvailable(): void {
  if (!isSecureMicContext()) {
    throw new Error(
      "语音需要安全连接（HTTPS）。手机请用 https://电脑IP:7075 打开，首次需在浏览器信任证书；电脑可用 http://localhost:7075。"
    );
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("当前浏览器无法使用麦克风，请换 Chrome/Safari 并允许麦克风权限。");
  }
}

export function toWebSocketBase(origin: string): string {
  if (origin.startsWith("https://")) return origin.replace(/^https:/, "wss:");
  if (origin.startsWith("http://")) return origin.replace(/^http:/, "ws:");
  return origin;
}
