import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  PAGE_SIZE,
  Paginated,
  UserBrief,
  apiDelete,
  apiGet,
  apiPost,
  fmtDate,
  fmtUser,
} from "./adminListUtils";
import { PaginationBar } from "./PaginationBar";

type TopicBrief = { id: string; title: string; status: string };

type AssetRow = {
  id: string;
  user_id: string;
  user: UserBrief | null;
  title: string;
  target_language: string;
  keywords: string[];
  current_version: number;
  user_topics: TopicBrief[];
  created_at: string;
  updated_at: string;
};

type Props = {
  token: string;
  onStatus: (msg: string) => void;
};

export function ExpressionAssetsPanel({ token, onStatus }: Props) {
  const [items, setItems] = useState<AssetRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [usernameQ, setUsernameQ] = useState("");
  const [topicQ, setTopicQ] = useState("");
  const [titleQ, setTitleQ] = useState("");
  const [searchUsername, setSearchUsername] = useState("");
  const [searchTopic, setSearchTopic] = useState("");
  const [searchTitle, setSearchTitle] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });
      if (searchUsername.trim()) params.set("username", searchUsername.trim());
      if (searchTopic.trim()) params.set("topic_q", searchTopic.trim());
      if (searchTitle.trim()) params.set("q", searchTitle.trim());
      const data = await apiGet<Paginated<AssetRow>>(
        `/api/admin/data/expression-assets?${params}`,
        token
      );
      setItems(data.items);
      setTotal(data.total);
      setSelected(new Set());
    } catch (err) {
      onStatus(`表达资产加载失败：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [token, offset, searchUsername, searchTopic, searchTitle, onStatus]);

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
    if (!window.confirm(`删除表达资产「${title}」？`)) return;
    try {
      await apiDelete(`/api/admin/data/expression-assets/${id}`, token);
      onStatus("表达资产已删除。");
      await load();
    } catch (err) {
      onStatus(`删除失败：${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function batchDelete() {
    if (selected.size === 0) return;
    if (!window.confirm(`确定批量删除 ${selected.size} 条表达资产？`)) return;
    try {
      const res = await apiPost<{ deleted: number }>(
        "/api/admin/data/expression-assets/batch-delete",
        token,
        { ids: [...selected] }
      );
      onStatus(`已删除 ${res.deleted} 条表达资产。`);
      await load();
    } catch (err) {
      onStatus(`批量删除失败：${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const allChecked = items.length > 0 && items.every((i) => selected.has(i.id));

  return (
    <section className="panel page-panel">
      <div className="panel-header">
        <div>
          <span>Expression Assets</span>
          <h2>用户表达资产</h2>
        </div>
        <button onClick={() => void load()} disabled={loading}>
          <RefreshCw size={15} /> 刷新
        </button>
      </div>

      <div className="form-grid" style={{ marginBottom: 16 }}>
        <label>
          用户名 / 邮箱
          <input value={usernameQ} placeholder="按用户搜索" onChange={(e) => setUsernameQ(e.target.value)} />
        </label>
        <label>
          话题名称
          <input value={topicQ} placeholder="按用户相关话题搜索" onChange={(e) => setTopicQ(e.target.value)} />
        </label>
        <label>
          资产标题
          <input value={titleQ} placeholder="按表达资产标题搜索" onChange={(e) => setTitleQ(e.target.value)} />
        </label>
        <label style={{ alignSelf: "end" }}>
          <button
            onClick={() => {
              setOffset(0);
              setSearchUsername(usernameQ);
              setSearchTopic(topicQ);
              setSearchTitle(titleQ);
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
        <p className="module-copy">暂无表达资产。</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input type="checkbox" checked={allChecked} onChange={(e) => toggleAll(e.target.checked)} />
                </th>
                <th>用户</th>
                <th>资产标题</th>
                <th>语言</th>
                <th>版本</th>
                <th>用户话题</th>
                <th>关键词</th>
                <th>更新时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id}>
                  <td>
                    <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggleOne(a.id)} />
                  </td>
                  <td>{fmtUser(a.user)}</td>
                  <td><strong>{a.title}</strong></td>
                  <td>{a.target_language}</td>
                  <td>v{a.current_version}</td>
                  <td style={{ maxWidth: 200 }}>
                    {(a.user_topics || []).length === 0 ? (
                      <span style={{ opacity: 0.6 }}>无</span>
                    ) : (
                      (a.user_topics || []).map((t) => t.title).join("、")
                    )}
                  </td>
                  <td>{(a.keywords || []).slice(0, 3).join(", ")}{(a.keywords || []).length > 3 ? "…" : ""}</td>
                  <td>{fmtDate(a.updated_at)}</td>
                  <td>
                    <button
                      className="secondary-button"
                      style={{ color: "var(--danger, #ef4444)" }}
                      onClick={() => void deleteOne(a.id, a.title)}
                    >
                      删除
                    </button>
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
