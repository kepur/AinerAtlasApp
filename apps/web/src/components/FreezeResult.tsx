import { Bookmark, Loader, Share2, Volume2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Asset } from "../api";
import { orderedVariantKeys, variantLabel } from "../api";

type Props = {
  asset: Asset | null;
  loading: boolean;
  error: string | null;
  loadingHint?: string;
  onClose: () => void;
};

export default function FreezeResult({ asset, loading, error, loadingHint, onClose }: Props) {
  const navigate = useNavigate();
  const variants = asset?.variants ?? {};
  const keys = useMemo(() => orderedVariantKeys(variants), [variants]);
  const [activeTab, setActiveTab] = useState(keys[0] ?? "");
  const [saved, setSaved] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const currentKey = keys.includes(activeTab) ? activeTab : keys[0] ?? "";

  async function handlePublishTopic() {
    if (!asset?.thought_id || publishing) return;
    setPublishing(true);
    onClose();
    navigate(`/topics/new?thought=${encodeURIComponent(asset.thought_id)}`);
  }

  if (!loading && !asset && !error) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel freeze-panel glass-card" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div>
            <p className="eyebrow">Thought Freeze</p>
            <h2>{asset?.title ?? "生成表达资产"}</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </header>

        {loading && (
          <div className="freeze-loading">
            <Loader size={28} className="spin" />
            <p>{loadingHint || "AI 正在整理你的思想表达..."}</p>
            <span>后台分析中，你可以继续浏览对话</span>
          </div>
        )}

        {error && !loading && (
          <div className="auth-error">{error}</div>
        )}

        {asset && !loading && (
          <>
            <div className="variant-tabs">
              {keys.map((key) => (
                <button
                  key={key}
                  className={`variant-tab ${currentKey === key ? "active" : ""}`}
                  onClick={() => setActiveTab(key)}
                >
                  {variantLabel(key)}
                </button>
              ))}
            </div>

            <div className="variant-content freeze-content">
              {currentKey
                ? variants[currentKey]
                : keys.length === 0
                  ? "AI 未能生成表达版本，请稍后重试或检查 LLM 配置"
                  : "暂无内容"}
            </div>

            <div className="freeze-actions as-inline-actions">
              <button className="as-chip as-chip--ghost" type="button" title="朗读（即将上线）">
                <Volume2 size={16} /> 朗读
              </button>
              <button
                className={`as-chip as-chip--accent ${saved ? "as-chip--saved" : ""}`}
                type="button"
                onClick={() => setSaved(true)}
              >
                <Bookmark size={16} /> {saved ? "已收藏" : "收藏到思想库"}
              </button>
            </div>

            {asset.keywords.length > 0 && (
              <div className="asset-tags">
                <span className="tag-label">关键词</span>
                {asset.keywords.map((kw) => (
                  <span key={kw} className="tag">{kw}</span>
                ))}
              </div>
            )}

            {asset.patterns.length > 0 && (
              <div className="asset-tags">
                <span className="tag-label">必会句型</span>
                {asset.patterns.map((p) => (
                  <span key={p} className="tag pattern-tag">{p}</span>
                ))}
              </div>
            )}

            <div className="freeze-footer">
              <span>{keys.length} 个表达版本已生成</span>
              <div className="flex flex-col gap-2 w-full mt-2">
                {asset.thought_id && (
                  <button
                    type="button"
                    className="as-btn as-btn--glass as-btn--block"
                    disabled={publishing}
                    onClick={() => void handlePublishTopic()}
                  >
                    <Share2 size={16} />
                    发表为话题（AI 填标题与标签）
                  </button>
                )}
                <button type="button" className="as-btn as-btn--primary as-btn--block" onClick={onClose}>完成</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
