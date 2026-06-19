import { Plus, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  PAGE_SIZE,
  Paginated,
  apiDelete,
  apiGet,
  apiPost,
  apiPatch,
} from "./adminListUtils";
import { PaginationBar } from "./PaginationBar";

type PackRow = {
  id: string;
  game_type: string;
  pack_type: string;
  label: string;
  content: string;
  example: string;
  difficulty: string;
  enabled: boolean;
  sort_order: number;
};

const GAME_TYPES = [
  { value: "", label: "全部游戏" },
  { value: "social_logic", label: "狼人杀 Lite" },
  { value: "detective", label: "AI 侦探" },
  { value: "roleplay", label: "角色扮演" },
  { value: "turtle_soup", label: "海龟汤" },
  { value: "romance", label: "恋爱社交" },
];

const PACK_TYPES = [
  { value: "pattern", label: "句型" },
  { value: "vocabulary", label: "词汇" },
];

const EMPTY_FORM = {
  game_type: "social_logic",
  pack_type: "pattern",
  label: "",
  content: "",
  example: "",
  difficulty: "B1",
  enabled: true,
  sort_order: 100,
};

type Props = {
  token: string;
  onStatus: (msg: string) => void;
};

export function LearningPackManagement({ token, onStatus }: Props) {
  const [items, setItems] = useState<PackRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filterGame, setFilterGame] = useState("");
  const [searchGame, setSearchGame] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PackRow>>({});
  const [createForm, setCreateForm] = useState({ ...EMPTY_FORM });
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });
      if (searchGame) params.set("game_type", searchGame);
      const data = await apiGet<Paginated<PackRow>>(
        `/api/admin/data/game-learning-packs?${params}`,
        token,
      );
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      onStatus(`学习包加载失败：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [token, offset, searchGame, onStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createPack() {
    if (!createForm.content.trim()) {
      onStatus("请填写句型/词汇内容。");
      return;
    }
    try {
      await apiPost("/api/admin/data/game-learning-packs", token, createForm);
      onStatus("学习包已创建。");
      setCreateForm({ ...EMPTY_FORM });
      setShowCreate(false);
      await load();
    } catch (err) {
      onStatus(`创建失败：${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function saveEdit(id: string) {
    try {
      await apiPatch(`/api/admin/data/game-learning-packs/${id}`, token, {
        label: editForm.label,
        content: editForm.content,
        example: editForm.example,
        difficulty: editForm.difficulty,
        enabled: editForm.enabled,
        sort_order: editForm.sort_order,
        pack_type: editForm.pack_type,
      });
      setEditingId(null);
      onStatus("学习包已更新。");
      await load();
    } catch (err) {
      onStatus(`保存失败：${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function deletePack(id: string, label: string) {
    if (!window.confirm(`删除学习包「${label || id}」？`)) return;
    try {
      await apiDelete(`/api/admin/data/game-learning-packs/${id}`, token);
      onStatus("已删除。");
      await load();
    } catch (err) {
      onStatus(`删除失败：${err instanceof Error ? err.message : String(err)}`);
    }
  }

  function startEdit(row: PackRow) {
    setEditingId(row.id);
    setEditForm({ ...row });
  }

  return (
    <section className="panel page-panel">
      <div className="panel-header">
        <div>
          <span>Learning Packs</span>
          <h2>游戏学习包（句型 / 词汇）</h2>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => setShowCreate((v) => !v)}>
            <Plus size={15} /> 新建
          </button>
          <button type="button" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={15} /> 刷新
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="prompt-edit-form" style={{ marginBottom: 20 }}>
          <h3 className="section-subtitle">新建学习包</h3>
          <div className="form-grid">
            <label>
              游戏类型
              <select
                value={createForm.game_type}
                onChange={(e) => setCreateForm({ ...createForm, game_type: e.target.value })}
              >
                {GAME_TYPES.filter((g) => g.value).map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </label>
            <label>
              类型
              <select
                value={createForm.pack_type}
                onChange={(e) => setCreateForm({ ...createForm, pack_type: e.target.value })}
              >
                {PACK_TYPES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </label>
            <label>
              标签
              <input
                value={createForm.label}
                placeholder="如：质疑位置"
                onChange={(e) => setCreateForm({ ...createForm, label: e.target.value })}
              />
            </label>
            <label>
              难度
              <input
                value={createForm.difficulty}
                onChange={(e) => setCreateForm({ ...createForm, difficulty: e.target.value })}
              />
            </label>
            <label style={{ gridColumn: "1 / -1" }}>
              句型 / 词汇 *
              <input
                value={createForm.content}
                placeholder="Why were you...?"
                onChange={(e) => setCreateForm({ ...createForm, content: e.target.value })}
              />
            </label>
            <label style={{ gridColumn: "1 / -1" }}>
              例句
              <textarea
                rows={2}
                value={createForm.example}
                placeholder="Why were you near the gate last night?"
                onChange={(e) => setCreateForm({ ...createForm, example: e.target.value })}
              />
            </label>
            <label>
              排序
              <input
                type="number"
                value={createForm.sort_order}
                onChange={(e) => setCreateForm({ ...createForm, sort_order: Number(e.target.value) })}
              />
            </label>
          </div>
          <div className="prompt-edit-actions">
            <button type="button" onClick={() => void createPack()}>创建</button>
            <button type="button" className="secondary-button" onClick={() => setShowCreate(false)}>取消</button>
          </div>
        </div>
      )}

      <div className="form-grid" style={{ marginBottom: 16 }}>
        <label>
          游戏筛选
          <select value={filterGame} onChange={(e) => setFilterGame(e.target.value)}>
            {GAME_TYPES.map((g) => (
              <option key={g.value || "all"} value={g.value}>{g.label}</option>
            ))}
          </select>
        </label>
        <label style={{ alignSelf: "end" }}>
          <button
            type="button"
            className="admin-query-btn"
            onClick={() => {
              setOffset(0);
              setSearchGame(filterGame);
            }}
          >
            搜索
          </button>
        </label>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>游戏</th>
              <th>类型</th>
              <th>标签</th>
              <th>内容</th>
              <th>例句</th>
              <th>难度</th>
              <th>排序</th>
              <th>启用</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign: "center", padding: 24 }}>暂无数据</td></tr>
            )}
            {items.map((row) => (
              <tr key={row.id}>
                {editingId === row.id ? (
                  <>
                    <td>{row.game_type}</td>
                    <td>
                      <select
                        value={editForm.pack_type || row.pack_type}
                        onChange={(e) => setEditForm({ ...editForm, pack_type: e.target.value })}
                      >
                        {PACK_TYPES.map((p) => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        value={editForm.label ?? ""}
                        onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        value={editForm.content ?? ""}
                        onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                      />
                    </td>
                    <td>
                      <textarea
                        rows={2}
                        value={editForm.example ?? ""}
                        onChange={(e) => setEditForm({ ...editForm, example: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        value={editForm.difficulty ?? ""}
                        onChange={(e) => setEditForm({ ...editForm, difficulty: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={editForm.sort_order ?? 0}
                        onChange={(e) => setEditForm({ ...editForm, sort_order: Number(e.target.value) })}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={!!editForm.enabled}
                        onChange={(e) => setEditForm({ ...editForm, enabled: e.target.checked })}
                      />
                    </td>
                    <td>
                      <button type="button" onClick={() => void saveEdit(row.id)}>保存</button>
                      <button type="button" className="ghost-button" onClick={() => setEditingId(null)}>取消</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{row.game_type}</td>
                    <td>{row.pack_type}</td>
                    <td>{row.label || "—"}</td>
                    <td style={{ maxWidth: 180 }}>{row.content}</td>
                    <td style={{ maxWidth: 200, fontSize: 12 }}>{row.example || "—"}</td>
                    <td>{row.difficulty}</td>
                    <td>{row.sort_order}</td>
                    <td>{row.enabled ? "✓" : "—"}</td>
                    <td>
                      <button type="button" className="ghost-button" onClick={() => startEdit(row)}>编辑</button>
                      <button type="button" className="ghost-button" onClick={() => void deletePack(row.id, row.label)}>删除</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PaginationBar total={total} offset={offset} pageSize={PAGE_SIZE} onPage={setOffset} />
    </section>
  );
}
