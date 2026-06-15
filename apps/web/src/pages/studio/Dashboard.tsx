import { Brain, Download, GitCompare, Network } from "lucide-react";
import { useNavigate } from "react-router-dom";

const modules = [
  { path: "/studio/workspace", label: "思想编辑器", desc: "长文编辑 + AI 侧边栏", icon: Brain },
  { path: "/studio/diff", label: "版本对比", desc: "高亮 Diff 视图", icon: GitCompare },
  { path: "/studio/mind-graph", label: "思想图谱", desc: "主题关系网络", icon: Network },
  { path: "/studio/export", label: "导出中心", desc: "Markdown / PDF / DOCX", icon: Download },
];

export default function StudioDashboard() {
  const navigate = useNavigate();

  return (
    <div className="premium studio-layout">
      <aside className="studio-sidebar">
        <h2>PC Studio</h2>
        <p className="studio-subtitle">思想工作台</p>
        <nav className="studio-nav">
          {modules.map((m) => (
            <button key={m.path} className="studio-nav-item" onClick={() => navigate(m.path)}>
              <m.icon size={18} />
              <div>
                <strong>{m.label}</strong>
                <span>{m.desc}</span>
              </div>
            </button>
          ))}
        </nav>
      </aside>
      <main className="studio-main">
        <header className="studio-header">
          <h1>欢迎进入 PC Studio</h1>
          <p>左中右三栏工作台，深度编辑思想与表达资产。</p>
        </header>
        <div className="studio-grid">
          {modules.map((m) => (
            <article key={m.path} className="studio-card" onClick={() => navigate(m.path)}>
              <m.icon size={32} />
              <h3>{m.label}</h3>
              <p>{m.desc}</p>
            </article>
          ))}
        </div>
      </main>
      <aside className="studio-panel">
        <h3>快捷操作</h3>
        <button className="secondary-btn" onClick={() => navigate("/chat")}>继续对话</button>
        <button className="secondary-btn" onClick={() => navigate("/assets")}>查看资产</button>
      </aside>
    </div>
  );
}
