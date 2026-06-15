import { ArrowLeft, Loader, MessageCircle, Volume2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchThought, orderedVariantKeys, variantLabel, type Thought } from "../api";

function speak(text: string) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = /[一-鿿]/.test(text) ? "zh-CN" : "en-US";
  window.speechSynthesis.speak(u);
}

export default function ThoughtDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [thought, setThought] = useState<Thought | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeVariant, setActiveVariant] = useState("");

  const variants = useMemo(() => {
    if (!thought) return {};
    return thought.freeze_payload?.expression_versions ?? thought.variants ?? {};
  }, [thought]);

  const variantKeys = useMemo(() => orderedVariantKeys(variants), [variants]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchThought(id)
      .then((data) => {
        setThought(data);
        const keys = orderedVariantKeys(
          data.freeze_payload?.expression_versions ?? data.variants ?? {}
        );
        setActiveVariant(keys[0] ?? "");
      })
      .catch(() => setThought(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="premium flex items-center justify-center min-h-screen bg-surface">
        <Loader size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!thought) {
    return (
      <div className="premium flex flex-col items-center justify-center min-h-screen bg-surface gap-4">
        <span className="material-symbols-outlined text-[48px] text-on-surface-variant">psychology</span>
        <p className="text-on-surface-variant">思想不存在</p>
        <button onClick={() => navigate("/thoughts")} className="bg-primary text-white px-5 py-2.5 rounded-full font-bold text-[14px]">返回思想库</button>
      </div>
    );
  }

  const keywords = thought.freeze_payload?.keywords ?? thought.keywords ?? [];
  const patterns = thought.freeze_payload?.core_patterns ?? thought.patterns ?? [];
  const goldenQuote = thought.freeze_payload?.golden_quote;
  const activeText = variants[activeVariant] ?? variants[variantKeys[0]] ?? "";

  return (
    <div className="premium min-h-full bg-surface text-on-surface">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-primary/8 blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-white/20 px-margin-mobile h-touch-target-min flex items-center gap-3">
        <button onClick={() => navigate("/thoughts")} className="material-symbols-outlined text-primary">arrow_back</button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-[15px] text-on-surface truncate">{thought.title}</h1>
          <p className="text-[11px] text-on-surface-variant">{thought.topic || "思想资产"} · v{thought.version}</p>
        </div>
        {thought.conversation_id && (
          <button onClick={() => navigate(`/chat/${thought.conversation_id}`)} className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-[12px] font-bold active:scale-95 transition-transform">
            <MessageCircle size={14} />
            继续对话
          </button>
        )}
      </header>

      <main className="px-margin-mobile pt-5 pb-24 space-y-5">
        {/* Summary */}
        {thought.summary && (
          <section className="glass-card premium-shadow rounded-2xl p-4">
            <p className="text-[12px] text-primary font-bold uppercase tracking-wider mb-2">摘要</p>
            <p className="text-[15px] text-on-surface leading-relaxed">{thought.summary}</p>
          </section>
        )}

        {/* Golden quote */}
        {goldenQuote && (
          <section className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-5">
            <p className="text-[11px] text-primary font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] fill" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              金句
            </p>
            <p className="text-[18px] font-bold text-on-surface leading-relaxed italic">"{goldenQuote}"</p>
          </section>
        )}

        {/* Version tabs */}
        {variantKeys.length > 0 && (
          <>
            <nav className="flex overflow-x-auto hide-scrollbar gap-0 border-b border-outline-variant/30">
              {variantKeys.map((key) => (
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

            <section className="glass-card premium-shadow rounded-2xl p-5">
              <div className="flex gap-4 items-start">
                <p className="flex-1 font-bold text-[20px] text-on-surface leading-relaxed">{activeText}</p>
                <button
                  onClick={() => speak(activeText)}
                  className="w-12 h-12 flex-shrink-0 bg-primary-fixed rounded-full flex items-center justify-center text-primary active:scale-90 transition-transform shadow-md"
                >
                  <Volume2 size={22} />
                </button>
              </div>
            </section>
          </>
        )}

        {/* Keywords & patterns */}
        {(keywords.length > 0 || patterns.length > 0) && (
          <section className="glass-card premium-shadow rounded-2xl p-5 border-l-4 border-l-primary/40">
            <h3 className="font-bold text-[16px] text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary fill" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
              关键词 & 句型
            </h3>
            {keywords.length > 0 && (
              <div className="mb-3">
                <p className="text-[12px] text-on-surface-variant font-bold mb-2">关键词</p>
                <div className="flex flex-wrap gap-2">
                  {keywords.map((kw) => (
                    <span key={kw} className="px-3 py-1.5 bg-surface-container-high text-on-surface-variant text-[11px] rounded-full flex items-center gap-1 font-medium">
                      <span className="material-symbols-outlined text-[14px]">bookmark</span>
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {patterns.length > 0 && (
              <div>
                <p className="text-[12px] text-on-surface-variant font-bold mb-2">必会句型</p>
                <div className="flex flex-wrap gap-2">
                  {patterns.map((p) => (
                    <span key={p} className="px-3 py-1.5 bg-primary/10 text-primary text-[11px] rounded-full font-medium">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Timeline */}
        <section className="glass-card premium-shadow rounded-2xl p-5">
          <h3 className="font-bold text-[16px] text-on-surface mb-4">版本时间线</h3>
          <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/10">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0">
              v{thought.version}
            </div>
            <div>
              <p className="text-[13px] font-bold text-on-surface">当前版本</p>
              <p className="text-[12px] text-on-surface-variant">
                {thought.frozen_at
                  ? new Date(thought.frozen_at).toLocaleString("zh-CN")
                  : new Date(thought.created_at).toLocaleString("zh-CN")}
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
