import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../api";

type GraphNode = { id: string; label: string; type: string };
type GraphEdge = { from: string; to: string };
type MindGraph = { nodes: GraphNode[]; edges: GraphEdge[] };

export default function MindGraph() {
  const navigate = useNavigate();
  const [thoughts, setThoughts] = useState<{ id: string; title: string }[]>([]);
  const [graph, setGraph] = useState<MindGraph>({ nodes: [], edges: [] });

  useEffect(() => {
    apiRequest<{ id: string; title: string }[]>("/api/thoughts")
      .then(async (data) => {
        setThoughts(data);
        if (data.length > 0) {
          const g = await apiRequest<MindGraph>(`/api/thoughts/${data[0].id}/mind-graph`);
          setGraph(g);
        }
      })
      .catch(() => {});
  }, []);

  async function loadGraph(thoughtId: string) {
    const g = await apiRequest<MindGraph>(`/api/thoughts/${thoughtId}/mind-graph`);
    setGraph(g);
  }

  const typeColors: Record<string, string> = {
    topic: "#7c3aed",
    value: "#10b981",
    fact: "#1d4ed8",
    argument: "#f59e0b",
  };

  return (
    <div className="premium studio-layout">
      <aside className="studio-sidebar">
        <button className="back-link" onClick={() => navigate("/studio")}>← 返回</button>
        <h3>思想图谱</h3>
        {thoughts.map((t) => (
          <button key={t.id} className="thought-item" onClick={() => loadGraph(t.id)}>
            {t.title}
          </button>
        ))}
      </aside>
      <main className="studio-main mind-graph-canvas">
        <h2>思想结构网络</h2>
        <svg viewBox="0 0 600 400" className="mind-graph-svg">
          {graph.edges.map((edge, i) => {
            const fromNode = graph.nodes.find((n) => n.id === edge.from);
            const toNode = graph.nodes.find((n) => n.id === edge.to);
            if (!fromNode || !toNode) return null;
            const fi = graph.nodes.indexOf(fromNode);
            const ti = graph.nodes.indexOf(toNode);
            const fx = 100 + (fi % 4) * 130;
            const fy = 80 + Math.floor(fi / 4) * 100;
            const tx = 100 + (ti % 4) * 130;
            const ty = 80 + Math.floor(ti / 4) * 100;
            return <line key={i} x1={fx} y1={fy} x2={tx} y2={ty} stroke="rgba(255,255,255,0.2)" />;
          })}
          {graph.nodes.map((node, i) => {
            const x = 100 + (i % 4) * 130;
            const y = 80 + Math.floor(i / 4) * 100;
            const color = typeColors[node.type] || "#7c3aed";
            return (
              <g key={node.id}>
                <circle cx={x} cy={y} r={28} fill={color} opacity={0.8} />
                <text x={x} y={y + 45} textAnchor="middle" fill="#94a3b8" fontSize="10">
                  {node.label.slice(0, 12)}
                </text>
              </g>
            );
          })}
        </svg>
      </main>
      <aside className="studio-panel">
        <h3>节点 ({graph.nodes.length})</h3>
        {graph.nodes.map((n) => (
          <div key={n.id} className="graph-node-item">
            <span className="node-dot" style={{ background: typeColors[n.type] }} />
            {n.label}
          </div>
        ))}
      </aside>
    </div>
  );
}
