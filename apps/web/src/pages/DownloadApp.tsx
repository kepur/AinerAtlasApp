import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function DownloadApp() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [isWeChat, setIsWeChat] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    setIsWeChat(/micromessenger/i.test(ua));
  }, []);

  const downloadUrl = "/ainerspeak.apk";

  const handleDownload = (e: React.MouseEvent) => {
    // Normal anchor tag navigation will download, but in case mobile browser needs explicit trigger:
    try {
      window.location.href = downloadUrl;
    } catch {
      /* ignore */
    }
  };

  const handleCopyLink = async () => {
    try {
      const fullUrl = `${window.location.origin}${downloadUrl}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* fallback */
    }
  };

  return (
    <div className="premium min-h-screen bg-surface text-on-surface flex flex-col justify-between pb-10">
      {/* WeChat Open-in-Browser Banner */}
      {isWeChat && (
        <div className="sticky top-0 z-50 bg-amber-500 text-white px-4 py-3 shadow-md flex items-center justify-between text-xs font-medium animate-pulse">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">open_in_browser</span>
            <span>微信内无法直接下载，请点右上角 <strong>[...]</strong> 选择 <strong>在浏览器中打开</strong></span>
          </div>
          <span className="material-symbols-outlined text-[20px]">arrow_upward</span>
        </div>
      )}

      {/* Top Navigation */}
      <header className="px-4 py-3 flex items-center justify-between border-b border-outline-variant/10 bg-surface/80 backdrop-blur-md sticky top-0 z-40">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
        <span className="font-bold text-sm text-on-surface">客户端下载</span>
        <div className="w-9" />
      </header>

      {/* Main Content */}
      <main className="px-5 pt-6 space-y-6 max-w-[430px] mx-auto w-full flex-1">
        {/* App Hero Card */}
        <section className="text-center pt-2">
          <div className="relative inline-block mb-4">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-primary to-[#8338ec] p-1 shadow-xl shadow-primary/20 mx-auto flex items-center justify-center">
              <div className="w-full h-full rounded-[22px] bg-white flex flex-col items-center justify-center shadow-inner">
                <span className="material-symbols-outlined text-[44px] text-primary">record_voice_over</span>
              </div>
            </div>
            <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500 text-white shadow">
              Android
            </span>
          </div>

          <h1 className="text-2xl font-black tracking-tight text-on-surface">AinerSpeak</h1>
          <p className="text-xs text-primary font-bold mt-1">随身 AI 英语口语私教 · 原生客户端</p>
          <p className="text-[13px] text-on-surface-variant mt-2 leading-relaxed px-4">
            高保真低延迟语音流、丰富多场景外教陪练、基于对话动态构建专属 Soulmate 口语画像。
          </p>

          <div className="inline-flex items-center gap-2 mt-4 px-3 py-1 rounded-full bg-surface-container text-on-surface-variant text-[11px] font-medium border border-outline-variant/20">
            <span>版本 v1.0.0</span>
            <span>·</span>
            <span>安装包 ~4.9 MB</span>
            <span>·</span>
            <span>适用于 Android 8.0+</span>
          </div>
        </section>

        {/* Primary Download CTA */}
        <section className="space-y-3 pt-2">
          <a
            href={downloadUrl}
            download="ainerspeak.apk"
            onClick={handleDownload}
            className="w-full h-14 bg-gradient-to-r from-primary to-[#7822e6] text-white rounded-2xl font-bold text-[16px] shadow-lg shadow-primary/30 flex items-center justify-center gap-2.5 active:scale-[0.98] transition-transform cursor-pointer"
          >
            <span className="material-symbols-outlined text-[24px]">android</span>
            <span>立即下载 Android 安装包</span>
          </a>

          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex-1 py-2.5 rounded-xl border border-outline-variant/30 bg-surface-container-low text-on-surface text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined text-[16px]">
                {copied ? "check" : "content_copy"}
              </span>
              <span>{copied ? "下载链接已复制" : "复制下载链接"}</span>
            </button>
            <Link
              to="/home"
              className="flex-1 py-2.5 rounded-xl border border-outline-variant/30 bg-surface-container-low text-on-surface text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined text-[16px]">language</span>
              <span>进入网页版体验</span>
            </Link>
          </div>
        </section>

        {/* Features Showcase */}
        <section className="space-y-3 pt-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/80 px-1">
            原生客户端特色优势
          </h2>

          <div className="grid grid-cols-1 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[20px]">mic</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-on-surface">高清原生音频录音</h3>
                <p className="text-[12px] text-on-surface-variant mt-0.5 leading-relaxed">
                  原生硬件麦克风权限直连，降噪增强与低功耗音频采集，发音评测更精准。
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#8338ec]/10 text-[#8338ec] flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[20px]">psychology</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-on-surface">Soulmate 专属画像演进</h3>
                <p className="text-[12px] text-on-surface-variant mt-0.5 leading-relaxed">
                  多维度记录词汇量、流利度、兴趣爱好与对话记忆，提供千人千面的个性化陪伴。
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[20px]">bolt</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-on-surface">极速启动与纯净体验</h3>
                <p className="text-[12px] text-on-surface-variant mt-0.5 leading-relaxed">
                  独立应用图标一键直达，告别浏览器标签限制，随时随地开启沉浸口语练习。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Installation FAQ */}
        <section className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 space-y-2.5">
          <div className="flex items-center gap-2 text-primary font-bold text-xs">
            <span className="material-symbols-outlined text-[16px]">info</span>
            <span>安装说明与安全提示</span>
          </div>
          <div className="text-[12px] text-on-surface-variant space-y-2 leading-relaxed">
            <p>
              1. <strong>下载后如何安装：</strong>下载完成后，下拉通知栏点击下载任务，或在系统「文件管理」的「下载」目录中找到 <code className="px-1.5 py-0.5 rounded bg-surface-container font-mono text-[11px]">ainerspeak.apk</code> 点击安装。
            </p>
            <p>
              2. <strong>安全提示处理：</strong>因 APK 为官方直编直装包未上架华为/小米/OPPO/vivo 等应用商店，系统可能会弹出「未知来源」或「风险检测」提示，请选择<strong>「继续安装」</strong>或<strong>「允许来自此来源的应用」</strong>。本应用已通过安全审计，请放心使用。
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="px-5 pt-4 text-center">
        <p className="text-[11px] text-on-surface-variant/60">
          © 2026 AinerWise / AinerSpeak · All Rights Reserved
        </p>
      </footer>
    </div>
  );
}
