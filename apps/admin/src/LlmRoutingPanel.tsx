import { useCallback, useEffect, useState } from "react";
import { apiGet, type Paginated } from "./adminListUtils";

export type LlmRouteRow = {
  key: string;
  label: string;
  category: string;
  fallback_bucket: string;
  description: string;
};

type ProviderOption = { id: string; provider_name: string };

type AppFormSlice = {
  default_llm_provider: string;
  llm_routing: Record<string, string>;
};

type Props = {
  token: string;
  appForm: AppFormSlice;
  setAppForm: React.Dispatch<React.SetStateAction<AppFormSlice>>;
  llmProviderOptions: ProviderOption[];
  onSave: () => void | Promise<void>;
};

const BUCKET_ROWS: { key: string; label: string; hint: string }[] = [
  { key: "default", label: "全局路由默认", hint: "所有未命中任务的最终兜底" },
  { key: "conversational_reply", label: "对话类默认", hint: "未单独配置的任务继承" },
  { key: "learning_analysis", label: "学习分析类默认", hint: "语法/HUD/Agent 等继承" },
  { key: "games", label: "游戏类默认", hint: "game_* 任务继承" },
];

export function LlmRoutingPanel({ token, appForm, setAppForm, llmProviderOptions, onSave }: Props) {
  const [catalog, setCatalog] = useState<LlmRouteRow[]>([]);
  const [filter, setFilter] = useState("all");

  const loadCatalog = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiGet<{ routes: LlmRouteRow[] }>("/api/admin/llm-routing-catalog", token);
      setCatalog(data.routes ?? []);
    } catch {
      setCatalog([]);
    }
  }, [token]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  function setRoute(key: string, provider: string) {
    setAppForm((prev) => ({
      ...prev,
      llm_routing: { ...(prev.llm_routing ?? {}), [key]: provider },
    }));
  }

  return (
    <section className="panel page-panel" style={{ marginBottom: 20 }}>
      <div className="panel-header">
        <div>
          <span>LLM Routing</span>
          <h2>LLM 任务路由表</h2>
        </div>
        <button type="button" className="primary-button" onClick={() => void onSave()}>保存路由配置</button>
      </div>
      <p className="module-copy">
        优先级：<strong>任务精确路由</strong> → 分类默认（下表「回退桶」）→ 全局默认 LLM。
        留空表示继承上一级。
      </p>

      <div className="form-grid" style={{ marginBottom: 16 }}>
        <label>
          全局默认 LLM Provider
          <select
            value={appForm.default_llm_provider}
            onChange={(e) => setAppForm((prev) => ({ ...prev, default_llm_provider: e.target.value }))}
          >
            <option value="">自动（按 Provider 优先级）</option>
            {llmProviderOptions.map((item) => (
              <option key={item.id} value={item.provider_name}>{item.provider_name}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="table-wrap" style={{ marginBottom: 16 }}>
        <table className="data-table compact">
          <thead>
            <tr><th>回退 Key</th><th>说明</th><th>Provider</th></tr>
          </thead>
          <tbody>
            {BUCKET_ROWS.map((row) => (
              <tr key={row.key} className="routing-bucket-row">
                <td><code>{row.key}</code></td>
                <td><strong>{row.label}</strong><div className="table-sub">{row.hint}</div></td>
                <td>
                  <select
                    value={appForm.llm_routing?.[row.key] ?? ""}
                    onChange={(e) => setRoute(row.key, e.target.value)}
                  >
                    <option value="">继承 / 自动</option>
                    {llmProviderOptions.map((item) => (
                      <option key={item.id} value={item.provider_name}>{item.provider_name}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="filter-bar">
        {["all", "对话", "学习分析", "游戏", "平台"].map((cat) => (
          <button
            key={cat}
            type="button"
            className={`preset${filter === cat ? " active" : ""}`}
            onClick={() => setFilter(cat)}
          >
            {cat === "all" ? "全部任务" : cat}
          </button>
        ))}
      </div>

      <div className="table-wrap" style={{ maxHeight: 360, overflow: "auto" }}>
        <table className="data-table compact">
          <thead>
            <tr>
              <th>任务 Key</th>
              <th>说明</th>
              <th>分类</th>
              <th>回退桶</th>
              <th>Provider</th>
            </tr>
          </thead>
          <tbody>
            {catalog
              .filter((row) => filter === "all" || row.category === filter)
              .map((row) => (
                <tr key={row.key}>
                  <td><code>{row.key}</code></td>
                  <td>
                    <strong>{row.label}</strong>
                    {row.description ? <div className="table-sub">{row.description}</div> : null}
                  </td>
                  <td>{row.category}</td>
                  <td><code>{row.fallback_bucket}</code></td>
                  <td>
                    <select
                      value={appForm.llm_routing?.[row.key] ?? ""}
                      onChange={(e) => setRoute(row.key, e.target.value)}
                    >
                      <option value="">继承分类默认</option>
                      {llmProviderOptions.map((item) => (
                        <option key={item.id} value={item.provider_name}>{item.provider_name}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {catalog.length === 0 && <p className="module-copy">正在加载路由表…</p>}
      </div>
    </section>
  );
}

export type { Paginated };
