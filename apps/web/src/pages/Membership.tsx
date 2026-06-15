import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";

const PLANS = [
  {
    id: "vip",
    name: "VIP",
    subtitle: "Premium Core",
    accentClass: "border-t-tertiary-fixed-dim",
    iconColor: "text-tertiary-container",
    icon: "military_tech",
    ctaBg: "bg-surface-container border border-outline-variant/30 text-on-surface",
    features: [
      "高级表达助手",
      "实时语音互动",
      "更多 Thought Freeze",
      "参与小组讨论"
    ]
  },
  {
    id: "pro",
    name: "Pro",
    subtitle: "Full Power AI",
    badge: "Popular",
    accentClass: "border-t-primary ring-1 ring-primary/20 shadow-xl",
    iconColor: "text-primary",
    icon: "stars",
    ctaBg: "bg-primary text-white shadow-md",
    features: [
      "无限表达资产",
      "Soulmate 高级匹配",
      "AI 三人对话模式",
      "高级语音模型"
    ]
  },
  {
    id: "business",
    name: "Business",
    subtitle: "Expert Level",
    accentClass: "border-t-secondary-container",
    iconColor: "text-secondary-container",
    icon: "business_center",
    ctaBg: "bg-surface-container border border-outline-variant/30 text-on-surface",
    features: [
      "创业伙伴匹配",
      "商业表达训练",
      "商业小组会议",
      "高级数据导出"
    ]
  }
];

const COMPARISON = [
  { label: "高级表达", vip: true, pro: true, biz: true },
  { label: "实时语音", vip: true, pro: true, biz: true },
  { label: "Thought Freeze", vip: true, pro: true, biz: true },
  { label: "小组讨论", vip: true, pro: true, biz: true },
  { label: "Connect 匹配", vip: false, pro: true, biz: true },
  { label: "高级数据导出", vip: false, pro: false, biz: true }
];

function CheckIcon({ on, color }: { on: boolean; color: string }) {
  return on ? (
    <span className={`material-symbols-outlined fill text-[20px] ${color}`} style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
  ) : (
    <span className="material-symbols-outlined text-[20px] text-outline-variant">close</span>
  );
}

export default function Membership() {
  const navigate = useNavigate();
  const membership = useAuthStore((s) => s.user?.membership_level ?? "free");

  return (
    <div className="premium min-h-full bg-surface text-on-surface">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-20 right-0 w-64 h-64 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute top-1/2 -left-20 w-48 h-48 rounded-full bg-tertiary-fixed/15 blur-2xl" />
      </div>

      {/* Top App Bar */}
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-white/20 px-margin-mobile h-touch-target-min flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="material-symbols-outlined text-primary">arrow_back</button>
        <h1 className="font-bold text-[18px] text-primary">Membership</h1>
      </header>

      <main className="px-margin-mobile pt-6 pb-24 space-y-8">
        {/* Hero */}
        <section>
          <h2 className="font-bold text-[26px] text-on-surface leading-tight mb-1">解锁更强的表达</h2>
          <p className="text-[14px] text-on-surface-variant">增强您的语音和匹配能力</p>
        </section>

        {/* Current plan */}
        <section className="glass-card premium-shadow rounded-2xl p-5 border border-primary/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />
          <div className="flex justify-between items-center relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-primary text-[20px]">verified_user</span>
                <h3 className="font-bold text-[16px] text-on-surface">当前会员: {membership.toUpperCase()}</h3>
              </div>
              <p className="text-[13px] text-on-surface-variant">基础表达与少量 AI 对话</p>
            </div>
            <button className="bg-primary text-white h-10 px-5 rounded-full text-[13px] font-bold active:scale-95 transition-transform shadow-md">
              升级会员
            </button>
          </div>
        </section>

        {/* Plans — horizontal scroll */}
        <section className="-mx-margin-mobile px-margin-mobile">
          <div className="flex gap-4 overflow-x-auto hide-scrollbar snap-x pb-2">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`min-w-[260px] snap-center glass-card rounded-xl p-5 flex flex-col border-t-4 ${plan.accentClass}`}
              >
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-[18px] text-on-surface">{plan.name}</h4>
                      {plan.badge && (
                        <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          {plan.badge}
                        </span>
                      )}
                    </div>
                    <p className={`text-[12px] font-medium mt-0.5 ${plan.iconColor}`}>{plan.subtitle}</p>
                  </div>
                  <span className={`material-symbols-outlined ${plan.iconColor}`} style={{ fontVariationSettings: plan.id === "pro" ? "'FILL' 1" : undefined }}>
                    {plan.icon}
                  </span>
                </div>

                <ul className="space-y-3 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-3">
                      <span className={`material-symbols-outlined text-[18px] ${plan.iconColor}`} style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      <span className="text-[14px] text-on-surface">{f}</span>
                    </li>
                  ))}
                </ul>

                <button className={`w-full h-11 rounded-xl text-[13px] font-bold active:scale-95 transition-all ${plan.ctaBg}`}>
                  联系开通
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Feature comparison */}
        <section>
          <h3 className="font-bold text-[18px] text-on-surface mb-4">权益对比</h3>
          <div className="glass-card premium-shadow rounded-2xl overflow-hidden divide-y divide-white/30">
            <div className="grid grid-cols-4 px-4 py-3 bg-surface-container-low text-[11px] text-on-surface-variant font-bold uppercase tracking-wider">
              <span>功能</span>
              <span className="text-center text-tertiary-container">VIP</span>
              <span className="text-center text-primary">Pro</span>
              <span className="text-center text-secondary-container">Biz</span>
            </div>
            {COMPARISON.map((row, i) => (
              <div key={row.label} className={`grid grid-cols-4 px-4 py-3 items-center ${i % 2 === 0 ? "bg-white/20" : ""}`}>
                <span className="text-[13px] text-on-surface">{row.label}</span>
                <div className="flex justify-center"><CheckIcon on={row.vip} color="text-tertiary-container" /></div>
                <div className="flex justify-center"><CheckIcon on={row.pro} color="text-primary" /></div>
                <div className="flex justify-center"><CheckIcon on={row.biz} color="text-secondary-container" /></div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-center text-outline mt-2 opacity-60">VIP / Pro / Business 权益对比概览</p>
        </section>

        {/* Contact activation */}
        <section className="bg-primary/5 border border-primary/10 rounded-2xl p-5 space-y-4">
          <div>
            <h3 className="font-bold text-[18px] text-on-surface mb-1">人工开通会员</h3>
            <p className="text-[14px] text-on-surface-variant">暂不集成支付，请通过 Telegram 或微信联系开通。</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button className="flex items-center justify-center gap-2 bg-white/80 text-on-surface h-11 rounded-xl border border-outline-variant/30 active:scale-95 transition-transform">
              <span className="material-symbols-outlined text-primary text-[20px]">send</span>
              <span className="text-[13px] font-medium">Telegram</span>
            </button>
            <button className="flex items-center justify-center gap-2 bg-white/80 text-on-surface h-11 rounded-xl border border-outline-variant/30 active:scale-95 transition-transform">
              <span className="material-symbols-outlined text-tertiary-container text-[20px]">chat</span>
              <span className="text-[13px] font-medium">微信</span>
            </button>
          </div>
          <div className="text-[12px] text-on-surface-variant space-y-1 pt-1">
            <p>📮 Telegram: @AinerSpeak</p>
            <p>💬 微信: AinerSpeak_Official</p>
            <p>📧 Email: hello@ainerspeak.com</p>
          </div>
        </section>
      </main>
    </div>
  );
}
