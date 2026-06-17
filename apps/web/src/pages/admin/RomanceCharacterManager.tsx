import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Loader2 } from "lucide-react";
import { apiRequest } from "../../api";

type RomanceCharacter = {
  id: string;
  template_id: string | null;
  target_id: string;
  name: string;
  role?: string;
  category?: string;
  personality?: string;
  chat_style?: string;
  identity_background?: string;
  initial_scene?: string;
  prompt_override?: string;
  tags?: string[];
  avatar_url?: string;
  difficulty?: string;
  source: "builtin" | "template";
};

const EMPTY_FORM = {
  slug: "",
  name: "",
  role: "",
  category: "恋爱社交",
  personality: "",
  chat_style: "",
  identity_background: "",
  initial_scene: "",
  prompt_override: "",
  avatar_url: "",
  tags: "",
  difficulty: "B1",
};

export default function RomanceCharacterManager() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [characters, setCharacters] = useState<RomanceCharacter[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<RomanceCharacter[]>("/api/games/romance-characters?include_disabled=true");
      setCharacters(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiRequest("/api/games/admin/romance-characters", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          tags: form.tags.split(",").map((x) => x.trim()).filter(Boolean),
          title: form.name,
          subtitle: form.category,
          description: form.initial_scene,
        }),
      });
      setForm(EMPTY_FORM);
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 text-[#111827] pb-8">
      <header className="sticky top-0 z-20 px-4 pt-[env(safe-area-inset-top,20px)] h-14 bg-white shadow-sm flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center text-gray-700"><ChevronLeft size={22} /></button>
        <h1 className="font-bold text-[16px]">恋爱社交人物配置</h1>
        <span className="text-xs text-slate-400">{characters.length}</span>
      </header>

      <main className="px-4 pt-4 flex flex-col gap-4">
        <form onSubmit={submit} className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-col gap-2 shadow-sm">
          <h2 className="font-bold text-sm">新增固定人物</h2>
          <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="slug（如 business-luna）" value={form.slug} onChange={(e) => setForm((s) => ({ ...s, slug: e.target.value }))} required />
          <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="角色名" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} required />
          <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="身份（如 欧洲客户）" value={form.role} onChange={(e) => setForm((s) => ({ ...s, role: e.target.value }))} />
          <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="分类（恋爱社交/旅游出差/商务谈判/移民生活）" value={form.category} onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))} />
          <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="头像 URL" value={form.avatar_url} onChange={(e) => setForm((s) => ({ ...s, avatar_url: e.target.value }))} />
          <textarea className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="人格" value={form.personality} onChange={(e) => setForm((s) => ({ ...s, personality: e.target.value }))} />
          <textarea className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="聊天方式" value={form.chat_style} onChange={(e) => setForm((s) => ({ ...s, chat_style: e.target.value }))} />
          <textarea className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="身份背景" value={form.identity_background} onChange={(e) => setForm((s) => ({ ...s, identity_background: e.target.value }))} />
          <textarea className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="初始场景" value={form.initial_scene} onChange={(e) => setForm((s) => ({ ...s, initial_scene: e.target.value }))} />
          <textarea className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Prompt 覆盖（可选）" value={form.prompt_override} onChange={(e) => setForm((s) => ({ ...s, prompt_override: e.target.value }))} />
          <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="标签（逗号分隔）" value={form.tags} onChange={(e) => setForm((s) => ({ ...s, tags: e.target.value }))} />
          <button disabled={saving} className="mt-2 h-10 rounded-xl bg-indigo-600 text-white text-sm font-bold disabled:opacity-60">
            {saving ? "保存中..." : "创建人物"}
          </button>
        </form>

        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <h2 className="font-bold text-sm mb-3">已有人物</h2>
          {loading ? (
            <div className="py-6 flex justify-center"><Loader2 size={20} className="animate-spin text-indigo-500" /></div>
          ) : (
            <div className="flex flex-col gap-2">
              {characters.map((c) => (
                <div key={c.id} className="rounded-xl border border-slate-100 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold">{c.name}</div>
                      <div className="text-xs text-slate-500">{c.category} · {c.role || "角色"}</div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${c.source === "builtin" ? "bg-slate-100 text-slate-500" : "bg-indigo-50 text-indigo-600"}`}>
                      {c.source === "builtin" ? "内置" : "后台"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{c.personality || "未配置人格"}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
