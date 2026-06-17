import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Loader2, Trash2, Eye, EyeOff, Gamepad2 } from "lucide-react";
import { apiRequest } from "../../api";

interface Template {
  id: string;
  title: string;
  subtitle: string;
  game_type: string;
  cover_url: string;
  difficulty: string;
  play_count: number;
  enabled: boolean;
}

const TYPE_LABEL: Record<string, string> = {
  turtle_soup: "海龟汤", roleplay: "角色扮演", detective: "AI侦探",
  social_logic: "狼人杀", romance: "恋爱社交",
};

export default function TemplateManager() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<Template[]>("/api/games/templates?include_disabled=true");
      setTemplates(data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const toggle = async (t: Template) => {
    await apiRequest(`/api/games/templates/${t.id}`, { method: "PATCH", body: JSON.stringify({ enabled: !t.enabled }) });
    load();
  };
  const remove = async (t: Template) => {
    if (!confirm(`删除「${t.title}」？该故事将从大厅移除。`)) return;
    await apiRequest(`/api/games/templates/${t.id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 flex flex-col text-[#111827] pb-10">
      <header className="sticky top-0 z-50 px-4 pt-[env(safe-area-inset-top,20px)] h-14 flex items-center justify-between bg-white shadow-sm">
        <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center text-gray-700"><ChevronLeft size={24} /></button>
        <h1 className="font-bold text-[16px]">已发布内容管理</h1>
        <span className="text-[11px] text-slate-400">{templates.length}</span>
      </header>

      <main className="flex-1 px-4 pt-4 flex flex-col gap-3">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 size={28} className="animate-spin text-indigo-500" /></div>
        ) : templates.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-12">暂无已发布内容</p>
        ) : (
          templates.map((t) => (
            <div key={t.id} className={`bg-white rounded-2xl p-3 shadow-sm border flex gap-3 items-center ${t.enabled ? "border-slate-100" : "border-red-200 opacity-60"}`}>
              <div className="w-16 h-16 rounded-xl bg-slate-200 overflow-hidden shrink-0">
                {t.cover_url ? <img src={t.cover_url} alt={t.title} className="w-full h-full object-cover" /> : <Gamepad2 className="m-auto mt-5 text-slate-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[14px] text-slate-800 truncate">{t.title}</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 shrink-0">{TYPE_LABEL[t.game_type] || t.game_type}</span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">{t.subtitle || t.difficulty}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">游玩 {t.play_count} 次 · {t.enabled ? "已上架" : "已下架"}</p>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button onClick={() => toggle(t)} className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.enabled ? "bg-green-50 text-green-500" : "bg-slate-100 text-slate-400"}`}>
                  {t.enabled ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <button onClick={() => remove(t)} className="w-8 h-8 rounded-lg bg-red-50 text-red-400 flex items-center justify-center"><Trash2 size={16} /></button>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
