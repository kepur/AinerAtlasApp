import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Sparkles, BookOpen, Send, Loader2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "../../api";

export default function StoryPublisher() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [generatedStory, setGeneratedStory] = useState<any>(null);
  const [published, setPublished] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setGeneratedStory(null);
    setPublished(false);
    try {
      const data = await apiRequest("/api/games/admin/generate-story", {
        method: "POST",
        body: JSON.stringify({ prompt, game_type: "roleplay" })
      });
      setGeneratedStory(data);
    } catch (e) {
      console.error(e);
      alert("生成失败，请重试");
    } finally {
      setLoading(false);
    }
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
          config: generatedStory
        })
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
      {/* Header */}
      <header className="sticky top-0 left-0 w-full z-50 px-4 pt-[env(safe-area-inset-top,20px)] h-14 flex items-center justify-between bg-white shadow-sm">
        <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center text-gray-700 active:scale-95 transition-transform">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-bold text-[16px] text-[#111827]">AI 故事发布系统</h1>
        <div className="w-8"></div>
      </header>

      <main className="flex-1 px-4 pt-6 flex flex-col gap-6 max-w-md mx-auto w-full">
        
        {/* Input Section */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-[14px]">
            <Sparkles size={16} className="text-indigo-500" /> 设定灵感
          </div>
          <p className="text-[12px] text-slate-500 leading-relaxed">
            输入你想要的故事设定（例如：中世纪魔法学院、赛博朋克黑客、职场生存）。AI将自动生成完整故事线、人物和对话。
          </p>
          <textarea 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="描述你想生成的剧本设定..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[13px] h-24 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
          />
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
              
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col gap-4">
                <div className="flex flex-col">
                  <h2 className="text-xl font-bold text-slate-800">{generatedStory.title}</h2>
                  <span className="text-[11px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full w-max mt-1">{generatedStory.subtitle}</span>
                </div>
                
                <p className="text-[13px] text-slate-600 leading-relaxed border-l-2 border-indigo-200 pl-3">
                  {generatedStory.description}
                </p>

                <div className="flex flex-col gap-2 mt-2">
                  <h3 className="text-[12px] font-bold text-slate-700">主要人物</h3>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                    {generatedStory.characters?.map((c: any, i: number) => (
                      <div key={i} className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 min-w-[120px] shrink-0">
                        <div className="font-bold text-[12px] text-slate-800">{c.name}</div>
                        <div className="text-[10px] text-slate-500 mt-1 line-clamp-2">{c.personality}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-1">
                  <h3 className="text-[12px] font-bold text-slate-700">故事章节 ({generatedStory.chapters?.length || 0})</h3>
                  <div className="flex flex-col gap-2">
                    {generatedStory.chapters?.map((ch: any, i: number) => (
                      <div key={i} className="flex gap-2 items-start bg-slate-50 p-2 rounded-lg">
                        <span className="bg-slate-200 text-slate-600 font-bold text-[10px] px-1.5 py-0.5 rounded mt-0.5">T{i+1}</span>
                        <div className="flex flex-col">
                          <span className="text-[12px] font-bold text-slate-700">{ch.title}</span>
                          <span className="text-[10px] text-slate-500">{ch.goal}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {!published ? (
                <button 
                  onClick={handlePublish}
                  disabled={publishing}
                  className="w-full bg-pink-500 text-white rounded-xl py-3.5 font-bold text-[14px] shadow-lg shadow-pink-200 flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95 mt-2"
                >
                  {publishing ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="ml-1 -mt-0.5" />}
                  {publishing ? "正在发布..." : "发布到故事大厅"}
                </button>
              ) : (
                <div className="w-full bg-green-50 text-green-600 rounded-xl py-3.5 font-bold text-[14px] flex items-center justify-center gap-2 border border-green-100 mt-2">
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
