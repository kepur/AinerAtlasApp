import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api";

export default function CreateTopic() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [background, setBackground] = useState("");
  const [proView, setProView] = useState("");
  const [conView, setConView] = useState("");
  const [tags, setTags] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await apiRequest("/api/topics", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          background: background.trim(),
          pro_view: proView.trim(),
          con_view: conView.trim(),
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean)
        })
      });
      navigate("/home#today-topics");
    } catch {
      /* ignore */
    }
    setSubmitting(false);
  }

  return (
    <div className="premium min-h-full bg-surface text-on-surface">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-primary/8 blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-white/20 px-margin-mobile h-touch-target-min flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="material-symbols-outlined text-primary">arrow_back</button>
        <div>
          <h1 className="font-bold text-[16px] text-on-surface leading-tight">发起话题</h1>
          <p className="text-[11px] text-on-surface-variant">创建你感兴趣的讨论</p>
        </div>
      </header>

      <main className="px-margin-mobile pt-5 pb-32 space-y-4">
        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-[13px] font-bold text-on-surface-variant">话题标题 *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="一句话描述你的话题..."
            className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl px-4 py-3 text-[15px] text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>

        {/* Background */}
        <div className="space-y-1.5">
          <label className="text-[13px] font-bold text-on-surface-variant">话题背景</label>
          <textarea
            value={background}
            onChange={(e) => setBackground(e.target.value)}
            placeholder="提供话题背景与争议焦点..."
            rows={3}
            className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl px-4 py-3 text-[15px] text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none"
          />
        </div>

        {/* Pro/Con */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-tertiary-container">正方观点</label>
            <textarea
              value={proView}
              onChange={(e) => setProView(e.target.value)}
              placeholder="支持方论点..."
              rows={2}
              className="w-full bg-tertiary-container/5 border border-tertiary-container/20 rounded-xl px-3 py-2.5 text-[13px] text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:ring-2 focus:ring-tertiary-container/30 transition-all resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-error">反方观点</label>
            <textarea
              value={conView}
              onChange={(e) => setConView(e.target.value)}
              placeholder="反对方论点..."
              rows={2}
              className="w-full bg-error/5 border border-error/20 rounded-xl px-3 py-2.5 text-[13px] text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:ring-2 focus:ring-error/30 transition-all resize-none"
            />
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-1.5">
          <label className="text-[13px] font-bold text-on-surface-variant">标签（用逗号分隔）</label>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Technology, Ethics, Debate..."
            className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl px-4 py-3 text-[15px] text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>
      </main>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-[min(100%,430px)] px-margin-mobile py-5 bg-gradient-to-t from-surface via-surface/95 to-transparent z-50">
        <button
          onClick={handleSubmit}
          disabled={!title.trim() || submitting}
          className="w-full h-12 bg-primary text-white rounded-full font-bold text-[15px] shadow-[0_8px_30px_rgba(99,14,212,0.3)] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? "发布中..." : "发布话题"}
          {!submitting && <span className="material-symbols-outlined">send</span>}
        </button>
      </div>
    </div>
  );
}
