import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Plus, Trash2, Loader2, ImageOff, Check, X } from "lucide-react";
import { apiRequest } from "../../api";

interface Asset {
  id: string;
  kind: string;
  title: string;
  url: string;
  era: string;
  gender: string;
  age: string;
  scene: string;
  enabled: boolean;
}

const KINDS = [
  { id: "", label: "全部" },
  { id: "cover", label: "封面/背景" },
  { id: "avatar", label: "人物头像" },
];
const ERAS = ["modern", "ancient", "cyberpunk", "fantasy", "other"];
const GENDERS = ["neutral", "male", "female"];

const EMPTY: Partial<Asset> = { kind: "cover", title: "", url: "", era: "modern", gender: "neutral", age: "adult", scene: "" };

export default function AssetLibrary() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterKind, setFilterKind] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<Asset>>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const qs = filterKind ? `?kind=${filterKind}` : "";
      const data = await apiRequest<Asset[]>(`/api/games/assets${qs}`);
      setAssets(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filterKind]);

  const handleSave = async () => {
    if (!form.url?.trim()) { alert("请填写图片 URL"); return; }
    setSaving(true);
    try {
      await apiRequest("/api/games/assets", { method: "POST", body: JSON.stringify(form) });
      setShowForm(false);
      setForm(EMPTY);
      await load();
    } catch (e) {
      console.error(e); alert("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (a: Asset) => {
    await apiRequest(`/api/games/assets/${a.id}`, { method: "PATCH", body: JSON.stringify({ enabled: !a.enabled }) });
    load();
  };

  const handleDelete = async (a: Asset) => {
    if (!confirm(`删除素材「${a.title || a.url.slice(0, 30)}」？`)) return;
    await apiRequest(`/api/games/assets/${a.id}`, { method: "DELETE" });
    load();
  };

  const covers = assets.filter((a) => a.kind === "cover");
  const avatars = assets.filter((a) => a.kind === "avatar");

  return (
    <div className="w-full min-h-screen bg-slate-50 flex flex-col font-sans text-[#111827] pb-10">
      <header className="sticky top-0 z-50 px-4 pt-[env(safe-area-inset-top,20px)] h-14 flex items-center justify-between bg-white shadow-sm">
        <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center text-gray-700"><ChevronLeft size={24} /></button>
        <h1 className="font-bold text-[16px]">游戏素材库</h1>
        <button onClick={() => { setForm(EMPTY); setShowForm(true); }} className="w-8 h-8 flex items-center justify-center text-indigo-600"><Plus size={22} /></button>
      </header>

      <div className="px-4 pt-3 flex gap-2">
        {KINDS.map((k) => (
          <button key={k.id} onClick={() => setFilterKind(k.id)}
            className={`px-3 py-1.5 rounded-full text-[12px] font-bold ${filterKind === k.id ? "bg-indigo-600 text-white" : "bg-white text-slate-500 border border-slate-200"}`}>
            {k.label}
          </button>
        ))}
        <span className="ml-auto self-center text-[11px] text-slate-400">{assets.length} 个素材</span>
      </div>

      <main className="flex-1 px-4 pt-4 flex flex-col gap-5">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 size={28} className="animate-spin text-indigo-500" /></div>
        ) : (
          <>
            {(filterKind === "" || filterKind === "cover") && covers.length > 0 && (
              <Section title="封面 / 背景库">
                <div className="grid grid-cols-2 gap-3">
                  {covers.map((a) => <CoverCard key={a.id} a={a} onToggle={handleToggle} onDelete={handleDelete} />)}
                </div>
              </Section>
            )}
            {(filterKind === "" || filterKind === "avatar") && avatars.length > 0 && (
              <Section title="人物头像库">
                <div className="grid grid-cols-3 gap-3">
                  {avatars.map((a) => <AvatarCard key={a.id} a={a} onToggle={handleToggle} onDelete={handleDelete} />)}
                </div>
              </Section>
            )}
            {assets.length === 0 && <p className="text-center text-slate-400 text-sm py-12">暂无素材，点击右上角 + 添加</p>}
          </>
        )}
      </main>

      {/* Add form */}
      {showForm && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-end" onClick={() => setShowForm(false)}>
          <div className="w-full bg-white rounded-t-3xl p-5 pb-8 max-w-md mx-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-[17px]">添加素材</h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100"><X size={16} /></button>
            </div>
            <div className="flex flex-col gap-3">
              <Field label="图片 URL"><input value={form.url || ""} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[13px] outline-none" /></Field>
              <Field label="标题"><input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[13px] outline-none" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="类型">
                  <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[13px] outline-none">
                    <option value="cover">封面/背景</option>
                    <option value="avatar">人物头像</option>
                  </select>
                </Field>
                <Field label="年代">
                  <select value={form.era} onChange={(e) => setForm({ ...form, era: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[13px] outline-none">
                    {ERAS.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                </Field>
              </div>
              {form.kind === "avatar" && (
                <Field label="性别">
                  <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[13px] outline-none">
                    {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </Field>
              )}
              {form.url && <img src={form.url} alt="preview" className="w-full h-32 object-cover rounded-xl border border-slate-200" />}
              <button onClick={handleSave} disabled={saving} className="w-full bg-indigo-600 text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2 disabled:opacity-50 mt-1">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} 保存素材
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-[13px] font-bold text-slate-700 mb-2">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-bold text-slate-500">{label}</span>
      {children}
    </div>
  );
}

function CoverCard({ a, onToggle, onDelete }: { a: Asset; onToggle: (a: Asset) => void; onDelete: (a: Asset) => void }) {
  return (
    <div className={`rounded-xl overflow-hidden border bg-white shadow-sm ${a.enabled ? "border-slate-100" : "border-red-200 opacity-50"}`}>
      <div className="relative h-24 bg-slate-200">
        {a.url ? <img src={a.url} alt={a.title} className="w-full h-full object-cover" /> : <ImageOff className="m-auto mt-8 text-slate-400" />}
        <span className="absolute top-1 left-1 bg-black/40 text-white text-[8px] px-1.5 py-0.5 rounded">{a.era}</span>
      </div>
      <div className="p-2 flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-700 truncate">{a.title || "未命名"}</span>
        <div className="flex gap-1.5 shrink-0">
          <button onClick={() => onToggle(a)} className={`w-5 h-5 rounded flex items-center justify-center ${a.enabled ? "text-green-500" : "text-slate-300"}`}><Check size={13} /></button>
          <button onClick={() => onDelete(a)} className="w-5 h-5 rounded flex items-center justify-center text-red-400"><Trash2 size={13} /></button>
        </div>
      </div>
    </div>
  );
}

function AvatarCard({ a, onToggle, onDelete }: { a: Asset; onToggle: (a: Asset) => void; onDelete: (a: Asset) => void }) {
  return (
    <div className={`rounded-xl overflow-hidden border bg-white shadow-sm ${a.enabled ? "border-slate-100" : "border-red-200 opacity-50"}`}>
      <div className="relative aspect-square bg-slate-200">
        {a.url ? <img src={a.url} alt={a.title} className="w-full h-full object-cover" /> : <ImageOff className="m-auto mt-8 text-slate-400" />}
        <span className="absolute bottom-1 left-1 bg-black/40 text-white text-[8px] px-1 py-0.5 rounded">{a.gender === "female" ? "♀" : a.gender === "male" ? "♂" : "·"} {a.era}</span>
      </div>
      <div className="p-1.5 flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-600 truncate">{a.title || "—"}</span>
        <div className="flex gap-1 shrink-0">
          <button onClick={() => onToggle(a)} className={`w-4 h-4 flex items-center justify-center ${a.enabled ? "text-green-500" : "text-slate-300"}`}><Check size={11} /></button>
          <button onClick={() => onDelete(a)} className="w-4 h-4 flex items-center justify-center text-red-400"><Trash2 size={11} /></button>
        </div>
      </div>
    </div>
  );
}
