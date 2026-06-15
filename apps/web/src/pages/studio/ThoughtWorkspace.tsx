import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest, type Thought } from "../../api";

export default function ThoughtWorkspace() {
  const navigate = useNavigate();
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [selected, setSelected] = useState<Thought | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    apiRequest<Thought[]>("/api/thoughts")
      .then((data) => {
        setThoughts(data);
        if (data.length > 0) selectThought(data[0]);
      })
      .catch(() => {});
  }, []);

  function selectThought(t: Thought) {
    setSelected(t);
    const versions = (t.freeze_payload?.expression_versions || {}) as Record<string, string>;
    setEditorContent(versions.advanced || t.summary || "");
    setAiSuggestion("选择段落后，AI 将提供翻译和语法分析建议。");
  }

  async function analyzeSelection() {
    if (!editorContent) return;
    setAiSuggestion("分析中...");
    try {
      const conv = await apiRequest<{ id: string }>("/api/conversations", {
        method: "POST",
        body: JSON.stringify({ title: "Studio 分析", mode: "socratic" }),
      });
      const reply = await apiRequest<{ assistant_message: { analysis: Record<string, string> } }>(
        `/api/conversations/${conv.id}/messages`,
        { method: "POST", body: JSON.stringify({ content: editorContent.slice(0, 500), content_language: "zh" }) }
      );
      const a = reply.assistant_message.analysis;
      setAiSuggestion(`${a.main_reply_native || ""}\n\n目标语言: ${a.main_reply_target || ""}`);
    } catch {
      setAiSuggestion("AI 分析暂不可用（Mock 模式）");
    }
  }

  type GroupedThoughts = { topic: string; items: Thought[] };

  const groups = useMemo<GroupedThoughts[]>(() => {
    const map = new Map<string, Thought[]>();
    for (const t of thoughts) {
      const topic = t.topic || t.title.split(/\s*[-–—:：]\s*/)[0] || "未分类";
      const existing = map.get(topic);
      if (existing) {
        existing.push(t);
      } else {
        map.set(topic, [t]);
      }
    }
    return Array.from(map.entries()).map(([topic, items]) => ({ topic, items }));
  }, [thoughts]);

  function toggleGroup(topic: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(topic)) {
        next.delete(topic);
      } else {
        next.add(topic);
      }
      return next;
    });
  }

  function createThought() {
    const newThought: Thought = {
      id: `new-${Date.now()}`,
      title: "新思想",
      topic: "",
      summary: "",
      status: "draft",
      version: 1,
      conversation_id: null,
      frozen_at: null,
      created_at: new Date().toISOString(),
    };
    setThoughts((prev) => [newThought, ...prev]);
    selectThought(newThought);
  }

  return (
    <div className="premium studio-layout">
      <aside className="studio-sidebar">
        <button className="back-link" onClick={() => navigate("/studio")}>← 返回</button>

        <div className="sidebar-header-row">
          <h3>思想列表</h3>
          <button className="new-thought-btn" onClick={createThought} title="新建思想">
            <Plus size={16} />
          </button>
        </div>

        <div className="thought-tree">
          {groups.map((group) => {
            const collapsed = collapsedGroups.has(group.topic);
            return (
              <div key={group.topic} className="thought-group">
                <button
                  className="group-header"
                  onClick={() => toggleGroup(group.topic)}
                >
                  {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                  <span className="group-label">{group.topic}</span>
                  <span className="group-count">({group.items.length})</span>
                </button>
                {!collapsed && (
                  <div className="group-children">
                    {group.items.map((t) => (
                      <button
                        key={t.id}
                        className={selected?.id === t.id ? "thought-item active" : "thought-item"}
                        onClick={() => selectThought(t)}
                      >
                        {t.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>
      <main className="studio-editor">
        <h2>{selected?.title || "选择思想"}</h2>
        <textarea
          className="studio-textarea"
          value={editorContent}
          onChange={(e) => setEditorContent(e.target.value)}
          rows={20}
        />
      </main>
      <aside className="studio-panel">
        <h3>AI 对话面板</h3>
        <p className="ai-suggestion">{aiSuggestion}</p>
        <button className="primary-btn" onClick={analyzeSelection}>段落分析</button>
      </aside>

      <style>{`
        .sidebar-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 2px;
          margin-bottom: 8px;
        }
        .sidebar-header-row h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: #e5e7eb;
        }
        .new-thought-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          border: 1px solid rgba(168,144,255,0.3);
          background: rgba(168,144,255,0.1);
          color: #a78bfa;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }
        .new-thought-btn:hover {
          background: rgba(168,144,255,0.2);
          border-color: #a78bfa;
        }
        .thought-tree {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .thought-group {
          display: flex;
          flex-direction: column;
        }
        .group-header {
          display: flex;
          align-items: center;
          gap: 6px;
          width: 100%;
          padding: 6px 8px;
          border: none;
          border-radius: 6px;
          background: rgba(168,144,255,0.06);
          color: #a78bfa;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
        }
        .group-header:hover {
          background: rgba(168,144,255,0.12);
        }
        .group-label {
          flex: 1;
          text-align: left;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .group-count {
          font-size: 11px;
          color: #8b5cf6;
          font-weight: 500;
        }
        .group-children {
          display: flex;
          flex-direction: column;
          padding-left: 14px;
        }
        .thought-item {
          display: block;
          width: 100%;
          padding: 6px 10px;
          border: none;
          border-radius: 6px;
          background: transparent;
          color: #9ca3af;
          font-size: 13px;
          text-align: left;
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .thought-item:hover {
          background: rgba(255,255,255,0.04);
          color: #d1d5db;
        }
        .thought-item.active {
          background: rgba(168,144,255,0.12);
          color: #c4b5fd;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
