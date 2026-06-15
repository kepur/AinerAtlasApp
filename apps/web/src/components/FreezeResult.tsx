import { Bookmark, Loader, Volume2, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { Asset } from "../api";
import { orderedVariantKeys, variantLabel } from "../api";

type Props = {
  asset: Asset | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
};

export default function FreezeResult({ asset, loading, error, onClose }: Props) {
  const variants = asset?.variants ?? {};
  const keys = useMemo(() => orderedVariantKeys(variants), [variants]);
  const [activeTab, setActiveTab] = useState(keys[0] ?? "");
  const [saved, setSaved] = useState(false);

  const currentKey = keys.includes(activeTab) ? activeTab : keys[0] ?? "";

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
            <p>AI 正在整理你的思想表达...</p>
            <span>生成多版本表达资产包</span>
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
              {currentKey ? variants[currentKey] : "暂无内容"}
            </div>

            <div className="freeze-actions">
              <button className="ghost-btn" type="button" title="朗读（即将上线）">
                <Volume2 size={16} /> 朗读
              </button>
              <button
                className={`ghost-btn ${saved ? "saved" : ""}`}
                type="button"
                onClick={() => setSaved(true)}
              >
                <Bookmark size={16} /> {saved ? "已收藏" : "收藏"}
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
              <button className="primary-btn" onClick={onClose}>完成</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
