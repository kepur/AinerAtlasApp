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
} from "./adminListUtils";
import { PaginationBar } from "./PaginationBar";

type CircleRow = {
  id: string;
  title: string;
  room_type: string;
  status: string;
  creator_email: string;
  creator_username: string;
  allowed_languages: string[];
  member_count: number;
  message_count: number;
  created_at: string;
  ended_at: string | null;
};

type CircleMember = {
  id: string;
  email: string;
  username: string;
  role: string;
  joined_at: string;
};

type CircleMessageRow = {
  id: string;
  username: string;
  role: string;
  content: string;
  translated_content: string;
  created_at: string;
};

type Props = {
  token: string;
  onStatus: (msg: string) => void;
};

export function CircleManagement({ token, onStatus }: Props) {
  const [items, setItems] = useState<CircleRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [titleQ, setTitleQ] = useState("");
  const [usernameQ, setUsernameQ] = useState("");
  const [searchTitle, setSearchTitle] = useState("");
  const [searchUsername, setSearchUsername] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [messages, setMessages] = useState<CircleMessageRow[]>([]);
  const [detailTab, setDetailTab] = useState<"members" | "messages">("members");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });
      if (searchTitle.trim()) params.set("q", searchTitle.trim());
      if (searchUsername.trim()) params.set("username", searchUsername.trim());
      const data = await apiGet<Paginated<CircleRow>>(`/api/admin/circles?${params}`, token);
      setItems(data.items);
      setTotal(data.total);
      setSelected(new Set());
    } catch (err) {
      onStatus(`圈子加载失败：${err instanceof Error ? err.message : String(err)}`);
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
    if (!window.confirm(`永久删除圈子「${title}」？成员与聊天记录将一并清除。`)) return;
    try {
      await apiDelete(`/api/admin/circles/${id}`, token);
      onStatus("圈子已删除。");
      if (detailId === id) {
        setDetailId(null);
        setMembers([]);
        setMessages([]);
      }
      await load();
    } catch (err) {
      onStatus(`删除失败：${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function batchDelete() {
    if (selected.size === 0) return;
    if (!window.confirm(`确定批量删除 ${selected.size} 个圈子？`)) return;
    try {
      const res = await apiPost<{ deleted: number }>("/api/admin/circles/batch-delete", token, {
        ids: [...selected],
      });
      onStatus(`已删除 ${res.deleted} 个圈子。`);
      await load();
    } catch (err) {
      onStatus(`批量删除失败：${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function loadMembers(circleId: string) {
    const data = await apiGet<CircleMember[]>(`/api/admin/circles/${circleId}/members`, token);
    setMembers(data);
    setDetailTab("members");
    setDetailId(circleId);
  }

  async function loadMessages(circleId: string) {
    const data = await apiGet<{ messages: CircleMessageRow[] }>(`/api/admin/circles/${circleId}/messages`, token);
    setMessages(data.messages || []);
    setDetailTab("messages");
    setDetailId(circleId);
  }

  const allChecked = items.length > 0 && items.every((i) => selected.has(i.id));

  return (
    <section className="panel page-panel">
      <div className="panel-header">
        <div>
          <span>Circles</span>
          <h2>圈子管理</h2>
        </div>
        <button onClick={() => void load()} disabled={loading}>
          <RefreshCw size={15} /> 刷新
        </button>
      </div>

      <div className="form-grid" style={{ marginBottom: 16 }}>
        <label>
          圈子标题
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
        <p className="module-copy">暂无圈子。</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input type="checkbox" checked={allChecked} onChange={(e) => toggleAll(e.target.checked)} />
                </th>
                <th>标题</th>
                <th>类型</th>
                <th>创建者</th>
                <th>语言</th>
                <th>状态</th>
                <th>成员</th>
                <th>消息</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className={detailId === c.id ? "selected-row" : ""}>
                  <td>
                    <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleOne(c.id)} />
                  </td>
                  <td><strong>{c.title}</strong></td>
                  <td>{c.room_type}</td>
                  <td>{c.creator_username || c.creator_email || "-"}</td>
                  <td>{(c.allowed_languages || []).join(", ") || "-"}</td>
                  <td>{c.status}</td>
                  <td>{c.member_count}</td>
                  <td>{c.message_count}</td>
                  <td>{fmtDate(c.created_at)}</td>
                  <td>
                    <div className="mini-actions">
                      <button onClick={() => void loadMembers(c.id).catch((e) => onStatus(String(e)))}>成员</button>
                      <button onClick={() => void loadMessages(c.id).catch((e) => onStatus(String(e)))}>聊天</button>
                      <button
                        onClick={async () => {
                          const next = c.status === "active" ? "archived" : "active";
                          await apiPut(`/api/admin/circles/${c.id}`, token, { status: next });
                          onStatus(`圈子已${next === "active" ? "激活" : "归档"}。`);
                          await load();
                        }}
                      >
                        {c.status === "active" ? "归档" : "激活"}
                      </button>
                      <button style={{ color: "var(--danger, #ef4444)" }} onClick={() => void deleteOne(c.id, c.title)}>删除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PaginationBar total={total} offset={offset} pageSize={PAGE_SIZE} onPage={setOffset} />

      {detailId && detailTab === "members" && members.length > 0 && (
        <article className="panel" style={{ marginTop: 16, padding: 24 }}>
          <div className="panel-header" style={{ borderBottom: "none", paddingBottom: 0 }}>
            <h2>圈子成员</h2>
            <button className="secondary-button" onClick={() => { setDetailId(null); setMembers([]); }}>关闭</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Email</th><th>Username</th><th>Role</th><th>Joined</th></tr></thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td>{m.email}</td>
                    <td>{m.username || "-"}</td>
                    <td>{m.role}</td>
                    <td>{fmtDate(m.joined_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}

      {detailId && detailTab === "messages" && messages.length > 0 && (
        <article className="panel" style={{ marginTop: 16, padding: 24 }}>
          <div className="panel-header" style={{ borderBottom: "none", paddingBottom: 0 }}>
            <h2>聊天记录 ({messages.length})</h2>
            <button className="secondary-button" onClick={() => { setDetailId(null); setMessages([]); }}>关闭</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>时间</th><th>发言人</th><th>角色</th><th>内容</th></tr></thead>
              <tbody>
                {messages.map((m) => (
                  <tr key={m.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{fmtDate(m.created_at)}</td>
                    <td>{m.username}</td>
                    <td>{m.role}</td>
                    <td>
                      <div>{m.content}</div>
                      {m.translated_content ? <div style={{ color: "var(--muted)", fontSize: 12 }}>{m.translated_content}</div> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}
    </section>
  );
}
