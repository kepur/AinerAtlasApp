import { ArrowLeft, Loader, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest, orderedVariantKeys, variantLabel, type Asset } from "../api";

const VERSION_CARDS = [
  { key: "vlog", icon: "movie", label: "Vlog 版", sub: "富有生活气息", color: "text-primary", bg: "bg-primary/10" },
  { key: "interview", icon: "badge", label: "面试版", sub: "专业且客观", color: "text-secondary-container", bg: "bg-secondary-container/10" },
  { key: "diary", icon: "history_edu", label: "日记版", sub: "内心真实独白", color: "text-tertiary-container", bg: "bg-tertiary-container/10" }
];

function speak(text: string) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = /[一-鿿]/.test(text) ? "zh-CN" : "en-US";
  window.speechSynthesis.speak(u);
}

export default function AssetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeVariant, setActiveVariant] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiRequest<Asset>(`/api/assets/${id}`)
      .then((data) => {
        setAsset(data);
        const keys = orderedVariantKeys(data.variants);
        setActiveVariant(keys[0] ?? "");
      })
      .catch(() => setAsset(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="premium flex items-center justify-center min-h-screen bg-surface">
        <Loader size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="premium flex flex-col items-center justify-center min-h-screen bg-surface gap-4">
        <span className="material-symbols-outlined text-[48px] text-on-surface-variant">library_books</span>
        <p className="text-on-surface-variant">资产不存在</p>
        <button onClick={() => navigate("/assets")} className="bg-primary text-white px-5 py-2.5 rounded-full font-bold text-[14px]">返回列表</button>
      </div>
    );
  }

  const keys = orderedVariantKeys(asset.variants);
  const activeText = asset.variants[activeVariant] ?? asset.variants[keys[0]] ?? "";

  return (
    <div className="premium min-h-full bg-surface text-on-surface">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-primary/8 blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-white/20 px-margin-mobile h-touch-target-min flex justify-between items-center">
        <button onClick={() => navigate("/assets")} className="material-symbols-outlined text-primary">arrow_back</button>
        <h1 className="font-bold text-[16px] text-on-surface">思想资产</h1>
        <button className="material-symbols-outlined text-on-surface-variant">more_horiz</button>
      </header>

      <main className="px-margin-mobile pt-5 pb-24 space-y-5">
        {/* Title card */}
        <section className="glass-card premium-shadow rounded-2xl p-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 pointer-events-none" />
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-2">
              <div className="flex gap-2">
                <span className="px-2 py-0.5 bg-primary-fixed text-primary text-[11px] rounded-lg font-bold">
                  v{keys.length}
                </span>
                <span className="px-2 py-0.5 bg-tertiary-fixed/30 text-tertiary-container text-[11px] rounded-lg flex items-center gap-1 font-medium">
                  <span className="material-symbols-outlined text-[12px] fill" style={{ fontVariationSettings: "'FILL' 1" }}>ac_unit</span>
                  已 Freeze
                </span>
              </div>
              <span className="text-[12px] text-on-surface-variant">{asset.target_language.toUpperCase()}</span>
            </div>

            <h2 className="font-bold text-[22px] text-on-surface leading-tight mb-3">{asset.title}</h2>

            {/* Action buttons */}
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => navigate(`/chat`)}
                className="h-14 bg-gradient-to-br from-primary-container to-primary text-white rounded-2xl flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined text-[20px]">refresh</span>
                <span className="text-[10px] font-bold">继续迭代</span>
              </button>
              <button className="h-14 glass-card rounded-2xl flex flex-col items-center justify-center gap-0.5 text-on-surface-variant active:scale-95 transition-transform">
                <span className="material-symbols-outlined text-[20px]">public</span>
                <span className="text-[10px] font-bold">转公开</span>
              </button>
              <button className="h-14 glass-card rounded-2xl flex flex-col items-center justify-center gap-0.5 text-on-surface-variant active:scale-95 transition-transform">
                <span className="material-symbols-outlined text-[20px]">mic</span>
                <span className="text-[10px] font-bold">语音练习</span>
              </button>
            </div>
          </div>
        </section>

        {/* Version tabs */}
        {keys.length > 0 && (
          <nav className="flex overflow-x-auto hide-scrollbar gap-0 border-b border-outline-variant/30">
            {keys.map((key) => (
              <button
                key={key}
                onClick={() => setActiveVariant(key)}
                className={
                  "pb-3 px-4 text-[13px] font-bold whitespace-nowrap transition-colors relative " +
                  (activeVariant === key ? "text-primary" : "text-on-surface-variant")
                }
              >
                {variantLabel(key)}
                {activeVariant === key && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </nav>
        )}

        {/* Main content */}
        <section className="glass-card premium-shadow rounded-2xl p-5">
          <div className="flex gap-4 items-start">
            <div className="flex-1">
              <p className="font-bold text-[20px] text-on-surface leading-relaxed mb-4">{activeText}</p>
              {asset.source_text && (
                <p className="text-[14px] text-on-surface-variant italic border-l-2 border-primary/20 pl-3 py-1">
                  {asset.source_text}
                </p>
              )}
            </div>
            <button
              onClick={() => speak(activeText)}
              className="w-12 h-12 flex-shrink-0 bg-primary-fixed rounded-full flex items-center justify-center text-primary active:scale-90 transition-transform shadow-md"
            >
              <Volume2 size={22} />
            </button>
          </div>

          {/* Contextual actions */}
          <div className="flex flex-wrap gap-2 mt-5">
            <button className="px-4 h-9 rounded-full bg-secondary-container/10 text-secondary-container text-[12px] flex items-center gap-1.5 font-bold active:scale-95 transition-transform">
              <span className="material-symbols-outlined text-[18px]">extension</span>
              加入消消乐
            </button>
            <button className="px-4 h-9 rounded-full bg-secondary-container/10 text-secondary-container text-[12px] flex items-center gap-1.5 font-bold active:scale-95 transition-transform">
              <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              生成相似句
            </button>
            <button
              onClick={() => speak(activeText)}
              className="px-4 h-9 rounded-full bg-primary/10 text-primary text-[12px] flex items-center gap-1.5 font-bold active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined text-[18px]">play_circle</span>
              朗读整段
            </button>
          </div>
        </section>

        {/* Keywords & patterns */}
        {(asset.keywords.length > 0 || asset.patterns.length > 0) && (
          <section className="glass-card premium-shadow rounded-2xl p-5 border-l-4 border-l-primary/40">
            <h3 className="font-bold text-[16px] text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary fill" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
              关键词 & 句型
            </h3>
            {asset.keywords.length > 0 && (
              <div className="mb-3">
                <p className="text-[12px] text-on-surface-variant font-bold mb-2">关键词</p>
                <div className="flex flex-wrap gap-2">
                  {asset.keywords.map((kw) => (
                    <span key={kw} className="px-3 py-1.5 bg-surface-container-high text-on-surface-variant text-[11px] rounded-full flex items-center gap-1 font-medium">
                      <span className="material-symbols-outlined text-[14px]">bookmark</span>
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {asset.patterns.length > 0 && (
              <div>
                <p className="text-[12px] text-on-surface-variant font-bold mb-2">必会句型</p>
                <div className="flex flex-wrap gap-2">
                  {asset.patterns.map((p) => (
                    <span key={p} className="px-3 py-1.5 bg-primary/10 text-primary text-[11px] rounded-full flex items-center gap-1 font-medium">
                      <span className="material-symbols-outlined text-[14px]">auto_fix_high</span>
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Generation options */}
        <section className="space-y-3">
          <h3 className="font-bold text-[16px] text-on-surface">可生成版本</h3>
          <div className="flex overflow-x-auto hide-scrollbar gap-3 pb-2">
            {VERSION_CARDS.map((vc) => (
              <button key={vc.key} className="min-w-[130px] aspect-[4/5] glass-card premium-shadow rounded-2xl p-4 flex flex-col justify-between active:scale-95 transition-transform text-left">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${vc.bg}`}>
                  <span className={`material-symbols-outlined text-[24px] ${vc.color}`}>{vc.icon}</span>
                </div>
                <div>
                  <p className="font-bold text-[15px] leading-tight mb-1 text-on-surface">{vc.label}</p>
                  <p className="text-[11px] text-on-surface-variant">{vc.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>

      {/* AI orb FAB */}
      <div className="fixed bottom-[100px] left-1/2 -translate-x-1/2 z-50">
        <button className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-container to-primary text-white flex items-center justify-center shadow-2xl active:scale-90 transition-all pulse-orb">
          <span className="material-symbols-outlined text-[28px] fill" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
        </button>
      </div>
    </div>
  );
}
