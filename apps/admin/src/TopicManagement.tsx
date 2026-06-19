import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  PAGE_SIZE,
  Paginated,
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
  fmtDate,
  fmtUser,
} from "./adminListUtils";
import { PaginationBar } from "./PaginationBar";

type TopicRow = {
  id: string;
  title: string;
  creator_email: string;
  creator_username: string;
  tags: string[];
  status: string;
  view_count: number;
  parent_topic_id: string | null;
  created_at: string;
};

type Props = {
  token: string;
  onStatus: (msg: string) => void;
};

export function TopicManagement({ token, onStatus }: Props) {
  const [items, setItems] = useState<TopicRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [titleQ, setTitleQ] = useState("");
  const [usernameQ, setUsernameQ] = useState("");
  const [searchTitle, setSearchTitle] = useState("");
  const [searchUsername, setSearchUsername] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", tags: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });
      if (searchTitle.trim()) params.set("q", searchTitle.trim());
      if (searchUsername.trim()) params.set("username", searchUsername.trim());
      const data = await apiGet<Paginated<TopicRow>>(`/api/admin/topics?${params}`, token);
      setItems(data.items);
      setTotal(data.total);
      setSelected(new Set());
    } catch (err) {
      onStatus(`话题加载失败：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [token, offset, searchTitle, searchUsername, onStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(items.map((i) => i.id)) : new Set());
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function deleteOne(id: string, title: string) {
    if (!window.confirm(`永久删除话题「${title}」？关联圈子将一并清除。`)) return;
    try {
      await apiDelete(`/api/admin/topics/${id}`, token);
      onStatus("话题已删除。");
      await load();
    } catch (err) {
      onStatus(`删除失败：${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function batchDelete() {
    if (selected.size === 0) return;
    if (!window.confirm(`确定批量删除 ${selected.size} 个话题？`)) return;
    try {
      const res = await apiPost<{ deleted: number }>("/api/admin/topics/batch-delete", token, {
        ids: [...selected],
      });
      onStatus(`已删除 ${res.deleted} 个话题。`);
      await load();
    } catch (err) {
      onStatus(`批量删除失败：${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function saveEdit(id: string) {
    try {
      await apiPut(`/api/admin/topics/${id}`, token, {
        title: editForm.title,
        tags: editForm.tags.split(",").map((s) => s.trim()).filter(Boolean),
      });
      setEditingId(null);
      onStatus("话题已更新。");
      await load();
    } catch (err) {
      onStatus(`保存失败：${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const allChecked = items.length > 0 && items.every((i) => selected.has(i.id));

  return (
    <section className="panel page-panel">
      <div className="panel-header">
        <div>
          <span>Topics</span>
          <h2>话题管理</h2>
        </div>
        <button onClick={() => void load()} disabled={loading}>
          <RefreshCw size={15} /> 刷新
        </button>
      </div>

      <div className="form-grid" style={{ marginBottom: 16 }}>
        <label>
          话题标题
          <input value={titleQ} placeholder="按标题搜索" onChange={(e) => setTitleQ(e.target.value)} />
        </label>
        <label>
          用户名 / 邮箱
          <input value={usernameQ} placeholder="按创建者搜索" onChange={(e) => setUsernameQ(e.target.value)} />
        </label>
        <label style={{ alignSelf: "end" }}>
          <button
            type="button"
            className="admin-query-btn"
            onClick={() => {
              setOffset(0);
              setSearchTitle(titleQ);
              setSearchUsername(usernameQ);
            }}
          >
            查询
          </button>
        </label>
      </div>

      <div className="button-row" style={{ marginBottom: 12, gap: 8 }}>
        <button className="secondary-button" disabled={selected.size === 0} onClick={() => void batchDelete()}>
          批量删除 ({selected.size})
        </button>
      </div>

      {loading ? (
        <p className="module-copy">加载中…</p>
      ) : items.length === 0 ? (
        <p className="module-copy">暂无话题。</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input type="checkbox" checked={allChecked} onChange={(e) => toggleAll(e.target.checked)} />
                </th>
                <th>标题</th>
                <th>创建者</th>
                <th>标签</th>
                <th>状态</th>
                <th>浏览</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id} className={editingId === t.id ? "selected-row" : ""}>
                  <td>
                    <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggleOne(t.id)} />
                  </td>
                  <td>{editingId === t.id ? <input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} /> : t.title}</td>
                  <td>{t.creator_username || t.creator_email || "-"}</td>
                  <td>{editingId === t.id ? <input value={editForm.tags} onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })} placeholder="逗号分隔" /> : (t.tags || []).join(", ") || "-"}</td>
                  <td>{t.status}</td>
                  <td>{t.view_count}</td>
                  <td>{fmtDate(t.created_at)}</td>
                  <td>
                    <div className="mini-actions">
                      {editingId === t.id ? (
                        <>
                          <button onClick={() => void saveEdit(t.id)}>保存</button>
                          <button className="secondary-button" onClick={() => setEditingId(null)}>取消</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditingId(t.id); setEditForm({ title: t.title, tags: (t.tags || []).join(", ") }); }}>编辑</button>
                          <button style={{ color: "var(--danger, #ef4444)" }} onClick={() => void deleteOne(t.id, t.title)}>删除</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PaginationBar total={total} offset={offset} pageSize={PAGE_SIZE} onPage={setOffset} />
    </section>
  );
}
