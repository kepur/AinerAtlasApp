import { useCallback, useEffect, useMemo, useState } from "react";

type DataStats = {
  conversations: number;
  messages: number;
  thoughts: number;
  game_sessions: number;
  game_templates: number;
  expression_assets: number;
  reports: number;
  usage_logs: number;
  moderation_events: number;
};

type UserBrief = { id: string; email: string; username: string } | null;

type ListItem = {
  id: string;
  user_id?: string;
  user?: UserBrief;
  title?: string;
  mode?: string;
  status?: string;
  message_count?: number;
  last_message_preview?: string;
  moderation_status?: string;
  moderation_reason?: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
  game_type?: string;
  phase?: string;
  turn_count?: number;
  score?: number;
  target_language?: string;
  slug?: string;
  enabled?: boolean;
  play_count?: number;
  reporter_id?: string;
  reporter?: UserBrief;
  target_type?: string;
  target_id?: string;
  reason?: string;
  conversation_id?: string;
  created_at: string;
  updated_at?: string;
};

type ListResponse = {
  items: ListItem[];
  total: number;
  limit: number;
  offset: number;
};

type TabKey =
  | "conversations"
  | "thoughts"
  | "game-sessions"
  | "expression-assets"
  | "game-templates"
  | "reports";

// userScoped = the resource has an owning user, so user-filter + "按用户清空"
// are meaningful. searchable = the list endpoint honors the q text filter.
const TABS: { key: TabKey; label: string; purgeAll: boolean; userScoped: boolean; searchable: boolean }[] = [
  { key: "conversations", label: "历史对话", purgeAll: true, userScoped: true, searchable: true },
  { key: "thoughts", label: "想法记录", purgeAll: true, userScoped: true, searchable: true },
  { key: "game-sessions", label: "游戏会话", purgeAll: true, userScoped: true, searchable: false },
  { key: "expression-assets", label: "表达资产", purgeAll: false, userScoped: true, searchable: true },
  { key: "game-templates", label: "游戏模板", purgeAll: false, userScoped: false, searchable: false },
  { key: "reports", label: "举报记录", purgeAll: false, userScoped: true, searchable: false },
];

type ConversationDetail = ListItem & {
  messages?: Array<{
    id: string;
    role: string;
    content: string;
    content_language?: string;
    translated_content?: string;
    created_at: string;
  }>;
  activity?: Array<{
    id: string;
    action: string;
    created_at: string;
    details?: Record<string, unknown>;
  }>;
};

const MODERATION_LABELS: Record<string, string> = {
  clean: "正常",
  flagged: "敏感",
  blocked: "已封禁",
};
const CONFIRM_ALL = "DELETE_ALL";
const PAGE_SIZE = 50;

async function apiGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

async function apiPost<T>(path: string, token: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

async function apiDelete<T>(path: string, token: string): Promise<T> {
  const res = await fetch(path, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

function fmtUser(u: UserBrief | undefined, fallbackId?: string): string {
  if (u?.email) return u.email;
  if (u?.username) return u.username;
  if (fallbackId) return fallbackId.slice(0, 8) + "…";
  return "-";
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("zh-CN", { hour12: false });
}

type Props = {
  token: string;
  onStatus: (msg: string) => void;
};

export function DataManagement({ token, onStatus }: Props) {
  const [stats, setStats] = useState<DataStats | null>(null);
  const [tab, setTab] = useState<TabKey>("conversations");
  const [items, setItems] = useState<ListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [userFilter, setUserFilter] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [sensitiveOnly, setSensitiveOnly] = useState(false);
  const [moderationFilter, setModerationFilter] = useState("");
  const [useLlmScan, setUseLlmScan] = useState(false);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [purgeConfirm, setPurgeConfirm] = useState("");

  const loadStats = useCallback(async () => {
    const data = await apiGet<DataStats>("/api/admin/data/stats", token);
    setStats(data);
  }, [token]);

  const buildQuery = useCallback(
    (tabKey: TabKey, off: number) => {
      const meta = TABS.find((t) => t.key === tabKey);
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(off) });
      if (userFilter.trim() && meta?.userScoped) params.set("user_id", userFilter.trim());
      if (searchQ.trim() && meta?.searchable) params.set("q", searchQ.trim());
      if (tabKey === "conversations") {
        if (includeDeleted) params.set("include_deleted", "true");
        if (sensitiveOnly) params.set("sensitive_only", "true");
        if (moderationFilter.trim()) params.set("moderation_status", moderationFilter.trim());
      }
      return `/api/admin/data/${tabKey}?${params}`;
    },
    [userFilter, searchQ, includeDeleted, sensitiveOnly, moderationFilter],
  );

  const loadList = useCallback(
    async (tabKey: TabKey = tab, off: number = offset) => {
      setLoading(true);
      try {
        const data = await apiGet<ListResponse>(buildQuery(tabKey, off), token);
        setItems(data.items);
        setTotal(data.total);
        setOffset(data.offset);
        setSelected(new Set());
        onStatus(`${TABS.find((t) => t.key === tabKey)?.label ?? tabKey}：${data.total} 条`);
      } catch (err) {
        onStatus(`加载失败：${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setLoading(false);
      }
    },
    [token, tab, offset, buildQuery, onStatus],
  );

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    void loadList(tab, 0);
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const tabMeta = useMemo(() => TABS.find((t) => t.key === tab)!, [tab]);
  const allChecked = items.length > 0 && items.every((i) => selected.has(i.id));
  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function toggleAll() {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function softDeleteOne(id: string) {
    if (!window.confirm("软删除后用户端不可见，但数据库仍保留记录。确定？")) return;
    try {
      await apiPost(`/api/admin/data/conversations/${id}/soft-delete`, token, {});
      onStatus("已软删除 1 条");
      await Promise.all([loadList(), loadStats()]);
    } catch (err) {
      onStatus(`软删除失败：${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function hardDeleteOne(id: string) {
    if (!window.confirm("永久删除将从数据库清除该对话及关联消息，不可恢复。确定？")) return;
    try {
      await apiDelete(`/api/admin/data/${tab}/${id}`, token);
      onStatus("已永久删除 1 条");
      await Promise.all([loadList(), loadStats()]);
    } catch (err) {
      onStatus(`永久删除失败：${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function deleteOne(id: string) {
    if (tab === "conversations") {
      await hardDeleteOne(id);
      return;
    }
    if (!window.confirm("确定删除这条记录？")) return;
    try {
      await apiDelete(`/api/admin/data/${tab}/${id}`, token);
      onStatus("已删除 1 条");
      await Promise.all([loadList(), loadStats()]);
    } catch (err) {
      onStatus(`删除失败：${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function batchSoftDelete() {
    if (tab !== "conversations" || selected.size === 0) return;
    if (!window.confirm(`软删除 ${selected.size} 条对话？用户端将不可见，数据库仍保留。`)) return;
    try {
      const res = await apiPost<{ deleted: number }>(
        "/api/admin/data/conversations/batch-soft-delete",
        token,
        { ids: [...selected] },
      );
      onStatus(`已软删除 ${res.deleted} 条`);
      await Promise.all([loadList(), loadStats()]);
    } catch (err) {
      onStatus(`批量软删除失败：${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function batchHardDelete() {
    if (selected.size === 0) return;
    const label = tab === "conversations" ? "永久删除" : "删除";
    if (!window.confirm(`确定${label} ${selected.size} 条记录？${tab === "conversations" ? "数据库记录将彻底清除。" : ""}`)) return;
    try {
      const res = await apiPost<{ deleted: number }>(
        `/api/admin/data/${tab}/batch-delete`,
        token,
        { ids: [...selected] },
      );
      onStatus(`已${label} ${res.deleted} 条`);
      await Promise.all([loadList(), loadStats()]);
    } catch (err) {
      onStatus(`批量${label}失败：${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function batchDelete() {
    await batchHardDelete();
  }

  async function batchScanConversations() {
    if (tab !== "conversations") return;
    const ids = selected.size > 0 ? [...selected] : undefined;
    if (!ids && !window.confirm("未勾选记录，将扫描最近 100 条对话，继续？")) return;
    try {
      const res = await apiPost<{ scanned: number; flagged_conversations: number; flagged_messages: number }>(
        "/api/admin/data/conversations/batch-scan",
        token,
        { ids: ids ?? [], use_llm: useLlmScan, limit: 100 },
      );
      onStatus(`扫描 ${res.scanned} 条，命中 ${res.flagged_conversations} 条对话 / ${res.flagged_messages} 条消息`);
      await Promise.all([loadList(), loadStats()]);
    } catch (err) {
      onStatus(`批量扫描失败：${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function batchBlockConversations() {
    if (tab !== "conversations" || selected.size === 0) return;
    const reason = window.prompt("封禁原因（可选）", "违规对话，已由管理员封禁") ?? "";
    if (reason === null) return;
    try {
      const res = await apiPost<{ blocked: number }>(
        "/api/admin/data/conversations/batch-block",
        token,
        { ids: [...selected], reason: reason || "Blocked by admin" },
      );
      onStatus(`已封禁 ${res.blocked} 条对话`);
      await loadList();
    } catch (err) {
      onStatus(`批量封禁失败：${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function openConversationDetail(id: string) {
    try {
      const data = await apiGet<ConversationDetail>(`/api/admin/data/conversations/${id}`, token);
      setDetail(data);
    } catch (err) {
      onStatus(`加载详情失败：${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function purgeByUser() {
    const uid = userFilter.trim();
    if (!uid) {
      onStatus("请先填写用户 ID");
      return;
    }
    // Typed confirmation (retype the user id) — consistent with the全库清空
    // DELETE_ALL gate, since per-user purge is also irreversible.
    const typed = window.prompt(`不可恢复操作：将清空用户「${tabMeta.label}」全部数据。\n请重新输入该用户 ID 以确认：`, "");
    if (typed?.trim() !== uid) {
      if (typed !== null) onStatus("用户 ID 不匹配，已取消");
      return;
    }
    try {
      const res = await apiDelete<{ deleted: number }>(`/api/admin/data/${tab}/user/${uid}`, token);
      onStatus(`已清空该用户 ${res.deleted} 条`);
      await Promise.all([loadList(tab, 0), loadStats()]);
    } catch (err) {
      onStatus(`按用户清空失败：${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function purgeAll() {
    if (purgeConfirm !== CONFIRM_ALL) {
      onStatus(`请输入 ${CONFIRM_ALL} 以确认全库清空`);
      return;
    }
    if (!window.confirm(`⚠️ 将删除系统全部「${tabMeta.label}」，不可恢复。继续？`)) return;
    try {
      const res = await apiPost<{ deleted: number }>(
        `/api/admin/data/${tab}/purge-all`,
        token,
        { confirm: CONFIRM_ALL },
      );
      setPurgeConfirm("");
      onStatus(`全库清空完成：${res.deleted} 条`);
      await Promise.all([loadList(tab, 0), loadStats()]);
    } catch (err) {
      onStatus(`全库清空失败：${err instanceof Error ? err.message : String(err)}`);
    }
  }

  function renderRow(item: ListItem) {
    switch (tab) {
      case "conversations":
        return (
          <>
            <td><strong>{item.title || "(无标题)"}</strong></td>
            <td>{fmtUser(item.user, item.user_id)}</td>
            <td title={item.last_message_preview}>{item.last_message_preview?.slice(0, 48) || "—"}</td>
            <td>{item.message_count ?? 0}</td>
            <td>{MODERATION_LABELS[item.moderation_status || "clean"] ?? item.moderation_status}</td>
            <td>{item.deleted_at ? `用户已删` : "可见"}</td>
            <td>{fmtDate(item.updated_at ?? item.created_at)}</td>
          </>
        );
      case "thoughts":
        return (
          <>
            <td><strong>{item.title || "(无标题)"}</strong></td>
            <td>{fmtUser(item.user, item.user_id)}</td>
            <td>{item.status}</td>
            <td>{item.conversation_id?.slice(0, 8) ?? "-"}</td>
            <td>{fmtDate(item.updated_at ?? item.created_at)}</td>
          </>
        );
      case "game-sessions":
        return (
          <>
            <td><strong>{item.title || item.game_type}</strong></td>
            <td>{fmtUser(item.user, item.user_id)}</td>
            <td>{item.game_type}</td>
            <td>{item.phase}</td>
            <td>{item.turn_count ?? 0}</td>
            <td>{item.score ?? "-"}</td>
            <td>{fmtDate(item.updated_at ?? item.created_at)}</td>
          </>
        );
      case "expression-assets":
        return (
          <>
            <td><strong>{item.title || "(无标题)"}</strong></td>
            <td>{fmtUser(item.user, item.user_id)}</td>
            <td>{item.target_language}</td>
            <td>{fmtDate(item.created_at)}</td>
          </>
        );
      case "game-templates":
        return (
          <>
            <td><strong>{item.title}</strong></td>
            <td>{item.slug}</td>
            <td>{item.game_type}</td>
            <td>{item.enabled ? "启用" : "禁用"}</td>
            <td>{item.play_count ?? 0}</td>
            <td>{fmtDate(item.created_at)}</td>
          </>
        );
      case "reports":
        return (
          <>
            <td>{item.target_type}</td>
            <td>{item.target_id?.slice(0, 12) ?? "-"}</td>
            <td>{fmtUser(item.reporter, item.reporter_id)}</td>
            <td>{item.reason?.slice(0, 40)}{(item.reason?.length ?? 0) > 40 ? "…" : ""}</td>
            <td>{item.status}</td>
            <td>{fmtDate(item.created_at)}</td>
          </>
        );
      default:
        return null;
    }
  }

  const columns = useMemo(() => {
    switch (tab) {
      case "conversations":
        return ["标题", "用户", "最近消息", "消息数", "审核", "删除状态", "更新时间"];
      case "thoughts":
        return ["标题", "用户", "状态", "对话", "更新时间"];
      case "game-sessions":
        return ["标题", "用户", "类型", "阶段", "回合", "分数", "更新时间"];
      case "expression-assets":
        return ["标题", "用户", "语言", "创建时间"];
      case "game-templates":
        return ["标题", "Slug", "类型", "状态", "游玩", "创建"];
      case "reports":
        return ["目标类型", "目标 ID", "举报人", "原因", "状态", "时间"];
      default:
        return [];
    }
  }, [tab]);

  const statCards = stats
    ? [
        { label: "对话", value: stats.conversations, sub: `${stats.messages} 消息` },
        { label: "想法", value: stats.thoughts },
        { label: "游戏会话", value: stats.game_sessions },
        { label: "表达资产", value: stats.expression_assets },
        { label: "游戏模板", value: stats.game_templates },
        { label: "举报", value: stats.reports },
      ]
    : [];

  return (
    <section className="panel page-panel">
      <div className="panel-header">
        <div>
          <span>Data Management</span>
          <h2>用户数据管理</h2>
        </div>
        <button
          disabled={loading}
          onClick={() => void Promise.all([loadStats(), loadList()])}
        >
          刷新
        </button>
      </div>

      {statCards.length > 0 && (
        <div className="stats-grid stats-grid--compact">
          {statCards.map((s) => (
            <div key={s.label} className="stat-card stat-card--blue">
              <span>{s.label}</span>
              <strong>{s.value.toLocaleString()}</strong>
              {s.sub && <small>{s.sub}</small>}
            </div>
          ))}
        </div>
      )}

      <div className="tab-row" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={tab === t.key ? "btn-primary" : "btn-secondary"}
            onClick={() => { setTab(t.key); setOffset(0); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="form-grid" style={{ marginBottom: 16 }}>
        {tabMeta.userScoped && (
          <label>
            用户 ID 筛选
            <input
              value={userFilter}
              placeholder="UUID，留空表示全部"
              onChange={(e) => setUserFilter(e.target.value)}
            />
          </label>
        )}
        {tabMeta.searchable && (
          <label>
            关键词
            <input
              value={searchQ}
              placeholder={tab === "conversations" ? "标题或消息内容" : "标题搜索"}
              onChange={(e) => setSearchQ(e.target.value)}
            />
          </label>
        )}
        {tab === "conversations" && (
          <>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={includeDeleted} onChange={(e) => setIncludeDeleted(e.target.checked)} />
              含用户软删
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={sensitiveOnly} onChange={(e) => setSensitiveOnly(e.target.checked)} />
              仅敏感/违规
            </label>
            <label>
              审核状态
              <select value={moderationFilter} onChange={(e) => setModerationFilter(e.target.value)}>
                <option value="">全部</option>
                <option value="clean">正常</option>
                <option value="flagged">敏感</option>
                <option value="blocked">已封禁</option>
              </select>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={useLlmScan} onChange={(e) => setUseLlmScan(e.target.checked)} />
              AI 深度扫描
            </label>
          </>
        )}
        {!tabMeta.userScoped && !tabMeta.searchable && (
          <p className="module-copy" style={{ alignSelf: "center", margin: 0 }}>
            该资源为系统级内容，不支持按用户或关键词筛选。
          </p>
        )}
      </div>

      <div className="filter-bar">
        <button type="button" className="admin-query-btn" onClick={() => void loadList(tab, 0)} disabled={loading}>查询</button>
        <button className="btn-secondary" onClick={() => void batchHardDelete()} disabled={selected.size === 0}>
          {tab === "conversations" ? "批量永久删除" : "批量删除"} ({selected.size})
        </button>
        {tab === "conversations" && (
          <button className="btn-secondary" onClick={() => void batchSoftDelete()} disabled={selected.size === 0}>
            批量软删除 ({selected.size})
          </button>
        )}
        {tab === "conversations" && (
          <>
            <button className="btn-secondary" onClick={() => void batchScanConversations()}>
              敏感词/AI 扫描
            </button>
            <button className="btn-secondary" onClick={() => void batchBlockConversations()} disabled={selected.size === 0}>
              批量封禁
            </button>
          </>
        )}
        {tabMeta.userScoped && (
          <button className="btn-secondary" onClick={() => void purgeByUser()} disabled={!userFilter.trim()}>
            清空该用户
          </button>
        )}
        {tabMeta.purgeAll && (
          <>
            <input
              value={purgeConfirm}
              placeholder={`输入 ${CONFIRM_ALL} 全库清空`}
              onChange={(e) => setPurgeConfirm(e.target.value)}
              style={{ maxWidth: 220 }}
            />
            <button
              className="btn-secondary"
              style={{ color: "var(--danger, #ef4444)" }}
              onClick={() => void purgeAll()}
              disabled={purgeConfirm !== CONFIRM_ALL}
            >
              全库清空
            </button>
          </>
        )}
        <span style={{ marginLeft: "auto", opacity: 0.7 }}>
          共 {total} 条 · 第 {page}/{totalPages} 页
        </span>
      </div>

      {loading ? (
        <p className="module-copy">加载中…</p>
      ) : items.length === 0 ? (
        <p className="module-copy">暂无数据。</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} />
                </th>
                {columns.map((col) => (
                  <th key={col}>{col}</th>
                ))}
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => toggleOne(item.id)}
                    />
                  </td>
                  {renderRow(item)}
                  <td style={{ whiteSpace: "nowrap" }}>
                    {tab === "conversations" && (
                      <>
                        <button className="btn-secondary" style={{ marginRight: 8 }} onClick={() => void openConversationDetail(item.id)}>
                          详情
                        </button>
                        {!item.deleted_at && (
                          <button className="btn-secondary" style={{ marginRight: 8 }} onClick={() => void softDeleteOne(item.id)}>
                            软删除
                          </button>
                        )}
                        <button
                          className="btn-secondary"
                          style={{ color: "var(--danger, #ef4444)" }}
                          onClick={() => void hardDeleteOne(item.id)}
                        >
                          永久删除
                        </button>
                      </>
                    )}
                    {tab !== "conversations" && (
                      <button className="btn-secondary" onClick={() => void deleteOne(item.id)}>删除</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detail && tab === "conversations" && (
        <article className="panel" style={{ marginTop: 16 }}>
          <div className="panel-header">
            <div>
              <span>Conversation Detail</span>
              <h2>{detail.title || detail.id}</h2>
            </div>
            <button className="secondary-button" onClick={() => setDetail(null)}>关闭</button>
          </div>
          <p className="module-copy">
            用户：{fmtUser(detail.user, detail.user_id)} ·
            审核：{MODERATION_LABELS[detail.moderation_status || "clean"] ?? detail.moderation_status}
            {detail.moderation_reason ? ` · ${detail.moderation_reason}` : ""}
            {detail.deleted_at ? ` · 用户已于 ${fmtDate(detail.deleted_at)} 软删除` : ""}
          </p>
          {(detail.activity?.length ?? 0) > 0 && (
            <div className="table-wrap" style={{ marginBottom: 12 }}>
              <table>
                <thead>
                  <tr>
                    <th>操作记录</th>
                    <th>时间</th>
                    <th>详情</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.activity!.map((a) => (
                    <tr key={a.id}>
                      <td>{a.action}</td>
                      <td>{fmtDate(a.created_at)}</td>
                      <td>{JSON.stringify(a.details ?? {})}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>角色</th>
                  <th>内容</th>
                  <th>时间</th>
                </tr>
              </thead>
              <tbody>
                {(detail.messages ?? []).map((msg) => (
                  <tr key={msg.id}>
                    <td>{msg.role}</td>
                    <td style={{ maxWidth: 520, whiteSpace: "pre-wrap" }}>{msg.content}</td>
                    <td>{fmtDate(msg.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}

      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button
            disabled={offset <= 0 || loading}
            onClick={() => void loadList(tab, Math.max(0, offset - PAGE_SIZE))}
          >
            上一页
          </button>
          <button
            disabled={offset + PAGE_SIZE >= total || loading}
            onClick={() => void loadList(tab, offset + PAGE_SIZE)}
          >
            下一页
          </button>
        </div>
      )}
    </section>
  );
}
