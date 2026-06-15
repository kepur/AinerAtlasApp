import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../api";

type Thought = {
  id: string;
  title: string;
  version: number;
  freeze_payload: { expression_versions?: Record<string, string> };
};

function simpleDiff(a: string, b: string): { type: "same" | "add" | "remove"; text: string }[] {
  const aLines = a.split("\n");
  const bLines = b.split("\n");
  const result: { type: "same" | "add" | "remove"; text: string }[] = [];
  const maxLen = Math.max(aLines.length, bLines.length);
  for (let i = 0; i < maxLen; i++) {
    const al = aLines[i];
    const bl = bLines[i];
    if (al === bl && al !== undefined) {
      result.push({ type: "same", text: al });
    } else {
      if (al !== undefined) result.push({ type: "remove", text: al });
      if (bl !== undefined) result.push({ type: "add", text: bl });
    }
  }
  return result;
}

export default function VersionDiff() {
  const navigate = useNavigate();
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [selected, setSelected] = useState<Thought | null>(null);
  const [versionA, setVersionA] = useState("basic");
  const [versionB, setVersionB] = useState("advanced");

  useEffect(() => {
    apiRequest<Thought[]>("/api/thoughts").then(setThoughts).catch(() => {});
  }, []);

  const versions = selected
    ? Object.keys(selected.freeze_payload?.expression_versions || {})
    : [];

  const textA = selected?.freeze_payload?.expression_versions?.[versionA] || "";
  const textB = selected?.freeze_payload?.expression_versions?.[versionB] || "";
  const diff = simpleDiff(textA, textB);

  return (
    <div className="premium studio-layout">
      <aside className="studio-sidebar">
        <button className="back-link" onClick={() => navigate("/studio")}>← 返回</button>
        <h3>选择思想</h3>
        {thoughts.map((t) => (
          <button
            key={t.id}
            className={selected?.id === t.id ? "thought-item active" : "thought-item"}
            onClick={() => setSelected(t)}
          >
            {t.title} v{t.version}
          </button>
        ))}
      </aside>
      <main className="studio-main">
        <h2>版本对比</h2>
        <div className="diff-selectors">
          <select value={versionA} onChange={(e) => setVersionA(e.target.value)}>
            {versions.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <span>vs</span>
          <select value={versionB} onChange={(e) => setVersionB(e.target.value)}>
            {versions.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="diff-view">
          {diff.map((line, i) => (
            <div key={i} className={`diff-line ${line.type}`}>
              {line.type === "add" && "+ "}
              {line.type === "remove" && "- "}
              {line.text}
            </div>
          ))}
        </div>
      </main>
      <aside className="studio-panel">
        <h3>图例</h3>
        <p className="diff-legend add">绿色 = 新增</p>
        <p className="diff-legend remove">红色 = 删除</p>
      </aside>
    </div>
  );
}
