import { useEffect, useState } from "react";
import { Flame, Loader, Volume2, X } from "lucide-react";
import type { TokenExplain } from "../../api";
import { addCrushCandidate, explainToken } from "../../api";

type Props = {
  token: string;
  context: string;
  onClose: () => void;
  speak: (text: string, lang?: string) => void;
};

export function TokenExplainSheet({ token, context, onClose, speak }: Props) {
  const [data, setData] = useState<TokenExplain | null>(null);
  const [loading, setLoading] = useState(true);
  const [crushDone, setCrushDone] = useState(false);

  useEffect(() => {
    setLoading(true);
    explainToken(token, context)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [token, context]);

  return (
    <div className="knowledge-modal-overlay" onClick={onClose}>
      <div className="knowledge-modal token-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <span className="token-title">{token}</span>
          </h3>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        {loading ? (
          <div className="token-loading">
            <Loader size={16} className="spin" /> 正在查询...
          </div>
        ) : data ? (
          <div className="token-body">
            <div className="token-toprow">
              <button className="token-speak" onClick={() => speak(token, "en-US")}>
                <Volume2 size={14} /> 朗读
              </button>
              {data.part_of_speech && <span className="token-pos">{data.part_of_speech}</span>}
            </div>
            <p className="token-line">
              <strong>释义：</strong>
              {data.meaning}
            </p>
            <p className="token-line">
              <strong>用法：</strong>
              {data.usage}
            </p>
            {data.example && (
              <div className="token-example">
                <span style={{ fontSize: 13 }}>📝 {data.example}</span>
                <button className="tts-btn" onClick={() => speak(data.example, "en-US")}>
                  <Volume2 size={12} />
                </button>
              </div>
            )}
            <button
              className={`hud-crush-btn ${crushDone ? "added" : ""}`}
              onClick={async () => {
                if (crushDone || !data) return;
                try {
                  await addCrushCandidate(token, data.example, "en", "vocabulary");
                  setCrushDone(true);
                } catch {
                  /* ignore */
                }
              }}
            >
              <Flame size={12} /> {crushDone ? "已加入消消乐" : "加入消消乐"}
            </button>
          </div>
        ) : (
          <p style={{ color: "var(--text-muted)" }}>查询失败，请稍后重试</p>
        )}
      </div>
    </div>
  );
}
