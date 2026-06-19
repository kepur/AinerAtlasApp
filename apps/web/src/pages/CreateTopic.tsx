import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  analyzeTopicDraft,
  createTopic,
  fetchThoughts,
  fetchTopicDraftFromThought,
  type Thought,
  type TopicDraft,
} from "../api";

type Tab = "quick" | "thought";

function toggleTag(tags: string[], tag: string): string[] {
  return tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag].slice(0, 6);
}

export default function CreateTopic() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const thoughtParam = searchParams.get("thought");

  const [tab, setTab] = useState<Tab>(thoughtParam ? "thought" : "quick");
  const [title, setTitle] = useState("");
  const [background, setBackground] = useState("");
  const [proView, setProView] = useState("");
  const [conView, setConView] = useState("");
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [thoughtId, setThoughtId] = useState<string | null>(thoughtParam);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [loadingThoughts, setLoadingThoughts] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const analyzeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyDraft = useCallback((draft: TopicDraft) => {
    setTitle(draft.title || "");
    setBackground(draft.background || "");
    setProView(draft.pro_view || "");
    setConView(draft.con_view || "");
    setSuggestedTags(draft.suggested_tags || []);
    setSelectedTags((draft.suggested_tags || []).slice(0, 3));
    if (draft.thought_id) setThoughtId(draft.thought_id);
    if (draft.background || draft.pro_view || draft.con_view) setShowDetails(true);
  }, []);

  useEffect(() => {
    setLoadingThoughts(true);
    fetchThoughts()
      .then((list) => setThoughts(list.filter((t) => t.status === "frozen" || t.frozen_at)))
      .catch(() => setThoughts([]))
      .finally(() => setLoadingThoughts(false));
  }, []);

  useEffect(() => {
    if (!thoughtParam) return;
    setTab("thought");
    setThoughtId(thoughtParam);
    setAnalyzing(true);
    fetchTopicDraftFromThought(thoughtParam)
      .then(applyDraft)
      .catch(() => setError("无法从该思想生成话题草稿"))
      .finally(() => setAnalyzing(false));
  }, [thoughtParam, applyDraft]);

  useEffect(() => {
    if (tab !== "quick" || !title.trim()) return;
    if (analyzeTimer.current) clearTimeout(analyzeTimer.current);
    analyzeTimer.current = setTimeout(() => {
      setAnalyzing(true);
      analyzeTopicDraft({ title, background, pro_view: proView, con_view: conView })
        .then((draft) => {
          setSuggestedTags(draft.suggested_tags || []);
          if (!selectedTags.length && draft.suggested_tags?.length) {
            setSelectedTags(draft.suggested_tags.slice(0, 3));
          }
        })
        .catch(() => {})
        .finally(() => setAnalyzing(false));
    }, 600);
    return () => {
      if (analyzeTimer.current) clearTimeout(analyzeTimer.current);
    };
  }, [title, background, proView, conView, tab]);

  async function loadFromThought(id: string) {
    setThoughtId(id);
    setAnalyzing(true);
    setError(null);
    try {
      const draft = await fetchTopicDraftFromThought(id);
      applyDraft(draft);
    } catch {
      setError("AI 提取失败，请换一条思想或手动填写");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSubmit() {
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await createTopic({
        title: title.trim(),
        background: background.trim(),
        pro_view: proView.trim(),
        con_view: conView.trim(),
        tags: selectedTags,
        thought_id: thoughtId,
      });
      navigate("/home#today-topics");
    } catch {
      setError("发布失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="premium min-h-full bg-surface text-on-surface">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-primary/8 blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-white/20 px-margin-mobile h-touch-target-min flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)} className="material-symbols-outlined text-primary">arrow_back</button>
        <div>
          <h1 className="font-bold text-[16px] leading-tight">发布话题</h1>
          <p className="text-[11px] text-on-surface-variant">标题即可发，标签 AI 推荐点选</p>
        </div>
      </header>

      <div className="px-margin-mobile pt-3">
        <div className="flex p-1 bg-surface-container rounded-xl">
          {([
            ["quick", "快捷发布"],
            ["thought", "从冻结想法"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={
                "flex-1 py-2 rounded-lg text-[13px] font-bold transition-all " +
                (tab === key ? "bg-surface-container-lowest shadow-sm text-primary" : "text-outline")
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <main className="px-margin-mobile pt-4 pb-32 space-y-4">
        {tab === "thought" && (
          <section className="space-y-2">
            <p className="text-[12px] text-on-surface-variant">选一条对话总结 / Freeze 思想，AI 自动填标题与背景</p>
            {loadingThoughts ? (
              <div className="flex justify-center py-6">
                <div className="w-7 h-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : thoughts.length === 0 ? (
              <p className="text-[13px] text-on-surface-variant py-4 text-center">暂无冻结想法，先去对话页 Freeze</p>
            ) : (
              <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                {thoughts.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => void loadFromThought(t.id)}
                    className={
                      "flex-shrink-0 max-w-[200px] text-left rounded-xl px-3 py-2 border transition-all " +
                      (thoughtId === t.id
                        ? "border-primary bg-primary/10"
                        : "border-outline-variant/30 bg-surface-container-low")
                    }
                  >
                    <p className="text-[13px] font-semibold line-clamp-1">{t.title}</p>
                    <p className="text-[11px] text-on-surface-variant line-clamp-2 mt-0.5">{t.summary}</p>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        <div className="space-y-1.5">
          <label className="text-[13px] font-bold text-on-surface-variant">话题标题 *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：远程办公会取代办公室吗？"
            className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          className="text-[13px] text-primary font-bold flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[18px]">{showDetails ? "expand_less" : "expand_more"}</span>
          {showDetails ? "收起背景与正反方" : "补充背景 / 正反方（可选）"}
        </button>

        {showDetails && (
          <div className="space-y-3">
            <textarea
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              placeholder="话题背景（可选）"
              rows={2}
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl px-4 py-3 text-[14px] resize-none outline-none focus:ring-2 focus:ring-primary/30"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                value={proView}
                onChange={(e) => setProView(e.target.value)}
                placeholder="正方（可选）"
                className="w-full bg-tertiary-container/5 border border-tertiary-container/20 rounded-xl px-3 py-2.5 text-[13px] outline-none"
              />
              <input
                value={conView}
                onChange={(e) => setConView(e.target.value)}
                placeholder="反方（可选）"
                className="w-full bg-error/5 border border-error/20 rounded-xl px-3 py-2.5 text-[13px] outline-none"
              />
            </div>
          </div>
        )}

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[13px] font-bold text-on-surface-variant">标签</label>
            {analyzing && <span className="text-[11px] text-primary">AI 分析中…</span>}
          </div>
          {suggestedTags.length === 0 ? (
            <p className="text-[12px] text-on-surface-variant">输入标题后 AI 会推荐标签，点选即可</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {suggestedTags.map((tag) => {
                const on = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTags((prev) => toggleTag(prev, tag))}
                    className={
                      "px-3 py-1.5 rounded-full text-[12px] font-bold border transition-all " +
                      (on
                        ? "bg-primary text-white border-primary"
                        : "bg-surface-container-low text-on-surface-variant border-outline-variant/30")
                    }
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {error && <p className="text-[13px] text-error">{error}</p>}
      </main>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-[min(100%,430px)] px-margin-mobile py-5 bg-gradient-to-t from-surface via-surface/95 to-transparent z-50">
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!title.trim() || submitting}
          className="w-full h-12 bg-primary text-white rounded-full font-bold text-[15px] shadow-[0_8px_30px_rgba(99,14,212,0.3)] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? "发布中…" : "发布到话题广场"}
        </button>
      </div>
    </div>
  );
}
