import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Sparkles, BookOpen, Send, Loader2, CheckCircle2, RefreshCcw, GitBranch, Flag, Images } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "../../api";

type VoicePreset = { id: string; name: string; gender: string };

const LENGTHS = [
  { id: "short", label: "短篇", desc: "3章·轻松" },
  { id: "medium", label: "中篇", desc: "3-4章·标准" },
  { id: "long", label: "长篇", desc: "4章·史诗" },
];

export default function StoryPublisher() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [length, setLength] = useState("medium");
  const [numChapters, setNumChapters] = useState(3);
  const [numEndings, setNumEndings] = useState(2);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [generatedStory, setGeneratedStory] = useState<any>(null);
  const [published, setPublished] = useState(false);
  const [voices, setVoices] = useState<VoicePreset[]>([]);

  useEffect(() => {
    apiRequest<VoicePreset[]>("/api/games/voices").then(setVoices).catch(() => setVoices([]));
  }, []);

  const setCharacterVoice = (index: number, voice: string) => {
    if (!generatedStory?.characters) return;
    const newChars = [...generatedStory.characters];
    newChars[index] = { ...newChars[index], voice };
    setGeneratedStory({ ...generatedStory, characters: newChars });
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setGeneratedStory(null);
    setPublished(false);
    try {
      // The backend now assigns cover + character avatars from the asset library.
      const data = await apiRequest<any>("/api/games/admin/generate-story", {
        method: "POST",
        body: JSON.stringify({
          prompt, game_type: "roleplay",
          length, num_chapters: numChapters, num_endings: numEndings,
        }),
      });
      setGeneratedStory(data);
    } catch (e) {
      console.error(e);
      alert("生成失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const pickAsset = async (kind: string, era?: string, gender?: string): Promise<string> => {
    const qs = new URLSearchParams({ kind, ...(era ? { era } : {}), ...(gender ? { gender } : {}) });
    const res = await apiRequest<{ url: string }>(`/api/games/assets/pick?${qs.toString()}`);
    return res.url;
  };

  const handleRandomizeCover = async () => {
    if (!generatedStory) return;
    const url = await pickAsset("cover", generatedStory.era);
    if (url) setGeneratedStory({ ...generatedStory, cover_url: url });
  };

  const handleRandomizeAvatar = async (index: number) => {
    if (!generatedStory?.characters) return;
    const c = generatedStory.characters[index];
    const url = await pickAsset("avatar", generatedStory.era, c.gender);
    if (!url) return;
    const newChars = [...generatedStory.characters];
    newChars[index] = { ...c, avatar_url: url };
    setGeneratedStory({ ...generatedStory, characters: newChars });
  };

  const handlePublish = async () => {
    if (!generatedStory) return;
    setPublishing(true);
    try {
      await apiRequest("/api/games/templates", {
        method: "POST",
        body: JSON.stringify({
          title: generatedStory.title,
          description: generatedStory.description,
          game_type: "roleplay",
          config: generatedStory,
        }),
      });
      setPublished(true);
    } catch (e) {
      console.error(e);
      alert("发布失败，请重试");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 flex flex-col font-sans relative text-[#111827] pb-10">
      <header className="sticky top-0 left-0 w-full z-50 px-4 pt-[env(safe-area-inset-top,20px)] h-14 flex items-center justify-between bg-white shadow-sm">
        <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center text-gray-700 active:scale-95 transition-transform">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-bold text-[16px] text-[#111827]">AI 故事发布系统</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/admin/templates")} className="text-[11px] text-slate-500 font-bold">内容管理</button>
          <button onClick={() => navigate("/admin/asset-library")} className="text-[11px] text-indigo-600 font-bold flex items-center gap-1">
            <Images size={14} /> 素材库
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 pt-6 flex flex-col gap-6 max-w-md mx-auto w-full">
        {/* Input Section */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-[14px]">
            <Sparkles size={16} className="text-indigo-500" /> 设定灵感
          </div>
          <p className="text-[12px] text-slate-500 leading-relaxed">
            输入故事设定（例：中世纪魔法学院、赛博朋克黑客、职场生存）。AI 自动生成完整故事线、人物立绘、分支与结局，发布后前端直接读取，无需每次调用 AI。
          </p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="描述你想生成的剧本设定..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[13px] h-20 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
          />

          {/* Length selector */}
          <div className="flex flex-col gap-2">
            <span className="text-[12px] font-bold text-slate-700">故事篇幅</span>
            <div className="grid grid-cols-3 gap-2">
              {LENGTHS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLength(l.id)}
                  className={`py-2 rounded-xl border text-center transition-all ${
                    length === l.id ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200"
                  }`}
                >
                  <div className="text-[13px] font-bold">{l.label}</div>
                  <div className="text-[9px] opacity-80">{l.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Chapters / endings steppers */}
          <div className="grid grid-cols-2 gap-3">
            <Stepper label="章节数" value={numChapters} setValue={setNumChapters} min={1} max={6} />
            <Stepper label="结局数" value={numEndings} setValue={setNumEndings} min={1} max={4} />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="w-full bg-indigo-600 text-white rounded-xl py-3 font-bold text-[13px] shadow-md shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95 mt-1"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? "AI 正在创作剧本..." : "一键生成剧本"}
          </button>
        </div>

        {/* Preview Section */}
        <AnimatePresence>
          {generatedStory && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-[14px] px-1 mt-2">
                <BookOpen size={16} className="text-pink-500" /> 生成预览
              </div>

              <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 flex flex-col">
                {/* Cover */}
                <div className="relative w-full h-40 bg-slate-200 group">
                  {generatedStory.cover_url && <img src={generatedStory.cover_url} alt="Cover" className="w-full h-full object-cover" />}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button onClick={handleRandomizeCover} className="bg-white/90 text-slate-800 px-3 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 hover:scale-105 transition-transform shadow-sm">
                      <RefreshCcw size={12} /> 从素材库换封面
                    </button>
                  </div>
                  <span className="absolute top-2 left-2 bg-black/40 text-white text-[9px] px-2 py-0.5 rounded-full">{generatedStory.era}</span>
                </div>

                <div className="p-5 flex flex-col gap-4">
                  <div className="flex flex-col">
                    <h2 className="text-xl font-bold text-slate-800">{generatedStory.title}</h2>
                    <span className="text-[11px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full w-max mt-1">{generatedStory.subtitle}</span>
                  </div>
                  <p className="text-[13px] text-slate-600 leading-relaxed border-l-2 border-indigo-200 pl-3">{generatedStory.description}</p>

                  {/* Characters */}
                  <div className="flex flex-col gap-2 mt-1">
                    <h3 className="text-[12px] font-bold text-slate-700">主要人物与立绘</h3>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                      {generatedStory.characters?.map((c: any, i: number) => (
                        <div key={i} className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 min-w-[150px] shrink-0 flex gap-2">
                          <div className="relative w-12 h-12 rounded-lg bg-slate-200 shrink-0 overflow-hidden group">
                            {c.avatar_url && <img src={c.avatar_url} alt={c.name} className="w-full h-full object-cover" />}
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button onClick={() => handleRandomizeAvatar(i)} className="text-white"><RefreshCcw size={14} /></button>
                            </div>
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className="font-bold text-[12px] text-slate-800 truncate">{c.name} <span className="text-[9px] text-slate-400">{c.gender === "female" ? "♀" : c.gender === "male" ? "♂" : ""}</span></div>
                            <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-2 leading-snug">{c.personality}</div>
                            <select
                              value={c.voice || ""}
                              onChange={(e) => setCharacterVoice(i, e.target.value)}
                              className="mt-1 rounded-md border border-slate-200 px-1.5 py-1 text-[10px] bg-white text-slate-600"
                            >
                              <option value="">音色：自动</option>
                              {voices.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Chapters with branches */}
                  <div className="flex flex-col gap-2 mt-1">
                    <h3 className="text-[12px] font-bold text-slate-700">故事章节与分支 ({generatedStory.chapters?.length || 0})</h3>
                    <div className="flex flex-col gap-2">
                      {generatedStory.chapters?.map((ch: any, i: number) => (
                        <div key={i} className="bg-slate-50 p-2.5 rounded-lg">
                          <div className="flex gap-2 items-start">
                            <span className="bg-slate-200 text-slate-600 font-bold text-[10px] px-1.5 py-0.5 rounded mt-0.5">T{i + 1}</span>
                            <div className="flex flex-col flex-1">
                              <span className="text-[12px] font-bold text-slate-700">{ch.title}</span>
                              <span className="text-[10px] text-slate-500">{ch.goal}</span>
                              {(ch.branches || []).map((b: any, bi: number) => (
                                <div key={bi} className="flex items-start gap-1 mt-1 text-[10px] text-indigo-600">
                                  <GitBranch size={10} className="mt-0.5 shrink-0" />
                                  <span><b>{b.choice}</b> → {b.outcome}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Endings */}
                  {generatedStory.endings?.length > 0 && (
                    <div className="flex flex-col gap-2 mt-1">
                      <h3 className="text-[12px] font-bold text-slate-700">结局分支 ({generatedStory.endings.length})</h3>
                      <div className="flex flex-col gap-1.5">
                        {generatedStory.endings.map((e: any, i: number) => (
                          <div key={i} className="flex items-start gap-2 bg-pink-50 border border-pink-100 p-2 rounded-lg">
                            <Flag size={12} className="text-pink-500 mt-0.5 shrink-0" />
                            <div>
                              <span className="text-[12px] font-bold text-pink-700">{e.title}</span>
                              <span className="text-[10px] text-slate-500 block">{e.condition} — {e.summary}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {!published ? (
                <button
                  onClick={handlePublish}
                  disabled={publishing}
                  className="w-full bg-pink-500 text-white rounded-xl py-3.5 font-bold text-[14px] shadow-lg shadow-pink-200 flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95 mt-2 mb-10"
                >
                  {publishing ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="ml-1 -mt-0.5" />}
                  {publishing ? "正在发布..." : "发布到故事大厅"}
                </button>
              ) : (
                <div className="w-full bg-green-50 text-green-600 rounded-xl py-3.5 font-bold text-[14px] flex items-center justify-center gap-2 border border-green-100 mt-2 mb-10">
                  <CheckCircle2 size={18} /> 已成功发布到故事大厅！
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function Stepper({ label, value, setValue, min, max }: { label: string; value: number; setValue: (n: number) => void; min: number; max: number }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[12px] font-bold text-slate-700">{label}</span>
      <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5">
        <button onClick={() => setValue(Math.max(min, value - 1))} className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-600 font-bold">−</button>
        <span className="text-[15px] font-bold text-slate-800">{value}</span>
        <button onClick={() => setValue(Math.min(max, value + 1))} className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-600 font-bold">+</button>
      </div>
    </div>
  );
}
