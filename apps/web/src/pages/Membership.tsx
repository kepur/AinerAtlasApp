import { useNavigate } from "react-router-dom";
import { membershipDisplayName } from "../lib/membership";
import { useAuthStore } from "../stores/authStore";

const PLANS = [
  {
    id: "vip",
    name: "VIP",
    subtitle: "核心进阶",
    accentClass: "border-t-tertiary-fixed-dim",
    iconColor: "text-tertiary-container",
    icon: "military_tech",
    ctaBg: "bg-surface-container border border-outline-variant/30 text-on-surface",
    features: [
      "高级表达助手",
      "实时语音互动",
      "更多 Thought Freeze",
      "参与小组讨论",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    subtitle: "全能力 AI",
    badge: "推荐",
    accentClass: "border-t-primary ring-1 ring-primary/20 shadow-xl",
    iconColor: "text-primary",
    icon: "stars",
    ctaBg: "bg-primary text-white shadow-md",
    features: [
      "更高 AI 对话额度",
      "Soulmate 高级匹配",
      "AI 三人对话模式",
      "更长语音时长",
    ],
  },
] as const;

const COMPARISON = [
  { label: "AI 对话", free: "5 次/天", vip: "50 次/天", pro: "200 次/天" },
  { label: "实时语音", free: false, vip: true, pro: true },
  { label: "语音时长", free: "—", vip: "10 分钟/天", pro: "30 分钟/天" },
  { label: "Thought Freeze", free: "1 次/天", vip: "5 次/天", pro: "20 次/天" },
  { label: "Connect 匹配", free: "1 人/次", vip: "3 人/次", pro: "5 人/次" },
];

function CheckIcon({ on }: { on: boolean }) {
  return on ? (
    <span className="material-symbols-outlined fill text-[18px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
      check_circle
    </span>
  ) : (
    <span className="material-symbols-outlined text-[18px] text-outline-variant">close</span>
  );
}

export default function Membership() {
  const navigate = useNavigate();
  const membership = useAuthStore((s) => s.user?.membership_level ?? "free");
  const displayName = membershipDisplayName(membership);
  const isPaid = displayName === "VIP" || displayName === "Pro";

  return (
    <div className="premium min-h-full bg-surface text-on-surface">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-20 right-0 w-64 h-64 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute top-1/2 -left-20 w-48 h-48 rounded-full bg-tertiary-fixed/15 blur-2xl" />
      </div>

      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/20 px-margin-mobile h-touch-target-min flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="material-symbols-outlined text-primary">arrow_back</button>
        <h1 className="font-bold text-[18px] text-primary">会员中心</h1>
      </header>

      <main className="px-margin-mobile pt-6 pb-24 space-y-8">
        <section>
          <h2 className="font-bold text-[26px] text-on-surface leading-tight mb-1">解锁更强的表达</h2>
          <p className="text-[14px] text-on-surface-variant">普通用户、VIP、Pro 三档，按需升级</p>
        </section>

        <section className="glass-card premium-shadow rounded-2xl p-5 border border-primary/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />
          <div className="flex justify-between items-center relative z-10 gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-primary text-[20px]">verified_user</span>
                <h3 className="font-bold text-[16px] text-on-surface">当前：{displayName}</h3>
              </div>
              <p className="text-[13px] text-on-surface-variant">
                {isPaid ? "已开通付费权益" : "基础表达与少量 AI 对话"}
              </p>
            </div>
            {!isPaid && (
              <button className="bg-primary text-white h-10 px-5 rounded-full text-[13px] font-bold active:scale-95 transition-transform shadow-md flex-shrink-0">
                升级会员
              </button>
            )}
          </div>
        </section>

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
                      {"badge" in plan && plan.badge && (
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

        <section>
          <h3 className="font-bold text-[18px] text-on-surface mb-4">权益对比</h3>
          <div className="glass-card premium-shadow rounded-2xl overflow-hidden divide-y divide-white/30">
            <div className="grid grid-cols-4 px-4 py-3 bg-surface-container-low text-[11px] text-on-surface-variant font-bold uppercase tracking-wider">
              <span>功能</span>
              <span className="text-center">普通</span>
              <span className="text-center text-tertiary-container">VIP</span>
              <span className="text-center text-primary">Pro</span>
            </div>
            {COMPARISON.map((row, i) => (
              <div key={row.label} className={`grid grid-cols-4 px-4 py-3 items-center ${i % 2 === 0 ? "bg-surface-container-lowest/20" : ""}`}>
                <span className="text-[13px] text-on-surface">{row.label}</span>
                <span className="text-[12px] text-center text-on-surface-variant">
                  {typeof row.free === "boolean" ? <CheckIcon on={row.free} /> : row.free}
                </span>
                <span className="text-[12px] text-center text-on-surface-variant">
                  {typeof row.vip === "boolean" ? <CheckIcon on={row.vip} /> : row.vip}
                </span>
                <span className="text-[12px] text-center text-on-surface-variant">
                  {typeof row.pro === "boolean" ? <CheckIcon on={row.pro} /> : row.pro}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-center text-outline mt-2 opacity-60">普通用户 / VIP / Pro 权益对比</p>
        </section>

        <section className="bg-primary/5 border border-primary/10 rounded-2xl p-5 space-y-4">
          <div>
            <h3 className="font-bold text-[18px] text-on-surface mb-1">人工开通会员</h3>
            <p className="text-[14px] text-on-surface-variant">暂不集成支付，请通过 Telegram 或微信联系开通 VIP / Pro。</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button className="flex items-center justify-center gap-2 bg-surface-container-lowest/80 text-on-surface h-11 rounded-xl border border-outline-variant/30 active:scale-95 transition-transform">
              <span className="material-symbols-outlined text-primary text-[20px]">send</span>
              <span className="text-[13px] font-medium">Telegram</span>
            </button>
            <button className="flex items-center justify-center gap-2 bg-surface-container-lowest/80 text-on-surface h-11 rounded-xl border border-outline-variant/30 active:scale-95 transition-transform">
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
