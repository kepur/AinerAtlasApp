import { useNavigate } from "react-router-dom";
import { ChevronLeft, Sparkles, BookOpen, Users, Wand2 } from "lucide-react";

const FORGE_CARDS = [
  {
    title: "故事锻造",
    desc: "用一两句话描述灵感，AI 补全世界观与分支剧情",
    icon: BookOpen,
    to: "/game/custom-story-builder",
    gradient: "from-[#4648d4] to-[#6063ee]",
  },
  {
    title: "角色锻造",
    desc: "创建恋爱/社交角色，绑定音色与真人头像",
    icon: Users,
    to: "/game/romance-social/characters",
    gradient: "from-[#0058be] to-[#2170e4]",
  },
  {
    title: "AI 一键开玩",
    desc: "从已发布模板快速进入角色扮演或海龟汤",
    icon: Wand2,
    to: "/game",
    gradient: "from-[#006c49] to-[#00885d]",
  },
];

export default function LuminaForge() {
  const navigate = useNavigate();

  return (
    <div
      className="premium w-full min-h-screen flex flex-col text-[#191c1e]"
      style={{ background: "linear-gradient(135deg, #EEF2FF 0%, #f7f9fb 50%, #ECFDF5 100%)" }}
    >
      <header className="sticky top-0 z-50 px-4 pt-[env(safe-area-inset-top,20px)] h-14 flex items-center justify-between backdrop-blur-md bg-white/40 border-b border-white/60">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/70 border border-white/80 shadow-sm">
          <ChevronLeft size={20} />
        </button>
        <h1 className="font-bold text-[16px] tracking-tight">Lumina Forge</h1>
        <div className="w-9" />
      </header>

      <main className="flex-1 px-4 py-6 flex flex-col gap-6 max-w-lg mx-auto w-full">
        <section className="rounded-3xl p-6 bg-white/60 backdrop-blur-xl border border-white/80 shadow-[0_8px_32px_rgba(70,72,212,0.08)]">
          <div className="flex items-center gap-2 text-[#4648d4] font-bold text-sm mb-2">
            <Sparkles size={16} /> 沉浸式创作工坊
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-[#191c1e]">用 Lumina 玻璃质感<br />锻造你的故事与角色</h2>
          <p className="text-sm text-[#464554] mt-3 leading-relaxed">
            学英语为主、游戏为辅。在这里创建自定义剧情、角色与派对局，所有内容接入真实后端 API。
          </p>
        </section>

        <div className="flex flex-col gap-4">
          {FORGE_CARDS.map((card) => (
            <button
              key={card.title}
              onClick={() => navigate(card.to)}
              className="text-left rounded-2xl p-5 bg-white/55 backdrop-blur-xl border border-white/70 shadow-sm active:scale-[0.98] transition-transform"
            >
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-white mb-3 shadow-md`}>
                <card.icon size={22} />
              </div>
              <h3 className="font-bold text-[15px]">{card.title}</h3>
              <p className="text-xs text-[#464554] mt-1 leading-relaxed">{card.desc}</p>
            </button>
          ))}
        </div>

        <button
          onClick={() => navigate("/game/party-room/new")}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#4648d4] to-[#6063ee] text-white font-bold text-sm shadow-lg shadow-[#4648d4]/25"
        >
          创建多人 Party 房间
        </button>
      </main>
    </div>
  );
}
