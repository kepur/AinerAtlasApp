import {
  Activity,
  BookOpen,
  Bot,
  ChevronRight,
  ClipboardList,
  CreditCard,
  DollarSign,
  FileText,
  Globe,
  Hash,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Moon,
  Puzzle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Sun,
  Users,
  Settings
} from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { MatchRadar } from "./MatchRadar";

const navGroups = [
  {
    title: "概览",
    items: [{ key: "Dashboard", label: "仪表盘", icon: LayoutDashboard }]
  },
  {
    title: "运营",
    items: [
      { key: "Users", label: "会员", icon: Users },
      { key: "Matches", label: "匹配", icon: Sparkles },
      { key: "Memberships", label: "会员套餐", icon: CreditCard },
      { key: "Cost Center", label: "成本中心", icon: DollarSign },
      { key: "Topics", label: "话题", icon: Hash },
      { key: "Circles", label: "圈子", icon: Globe },
      { key: "Assets", label: "表达资产", icon: BookOpen }
    ]
  },
  {
    title: "AI 配置",
    items: [
      { key: "AI Providers", label: "模型供应商", icon: Bot },
      { key: "Prompts", label: "Prompt 模板", icon: FileText },
      { key: "Patterns", label: "语法模式", icon: Puzzle },
      { key: "Usage Logs", label: "用量日志", icon: Activity },
      { key: "LLM Logs", label: "LLM日志", icon: ClipboardList }
    ]
  },
  {
    title: "系统",
    items: [
      { key: "Audit Logs", label: "审计日志", icon: ClipboardList },
      { key: "Moderation", label: "内容审核", icon: ShieldCheck },
      { key: "Gamification", label: "游戏化", icon: Sparkles },
      { key: "Security", label: "安全与邮件", icon: ShieldCheck },
      { key: "Settings", label: "系统设置", icon: Settings }
    ]
  }
];

const statAccents = ["stat-card--violet", "stat-card--blue", "stat-card--emerald", "stat-card--amber"] as const;

const ALL_LOCALES = [
  { code: "en", label: "English" },
  { code: "zh", label: "简体中文" },
  { code: "hi", label: "हिन्दी" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "ar", label: "العربية" },
  { code: "bn", label: "বাংলা" },
  { code: "pt", label: "Português" },
  { code: "ru", label: "Русский" },
  { code: "ja", label: "日本語" },
  { code: "sr", label: "Srpski" },
  { code: "ko", label: "한국어" }
];

const providerPresets = {
  openai: { provider_name: "openai", provider_type: "llm", api_base_url: "https://api.openai.com/v1", model_name: "gpt-4o-mini" },
  qwen: { provider_name: "qwen", provider_type: "llm", api_base_url: "https://dashscope.aliyuncs.com/compatible-mode/v1", model_name: "qwen-plus" },
  deepseek: { provider_name: "deepseek", provider_type: "llm", api_base_url: "https://api.deepseek.com/v1", model_name: "deepseek-v4-pro" },
  anthropic: { provider_name: "anthropic", provider_type: "llm", api_base_url: "https://api.anthropic.com", model_name: "claude-3-5-haiku-latest" },
  gemini: { provider_name: "gemini", provider_type: "llm", api_base_url: "https://generativelanguage.googleapis.com/v1beta", model_name: "gemini-1.5-flash" },
  openrouter: { provider_name: "openrouter", provider_type: "llm", api_base_url: "https://openrouter.ai/api/v1", model_name: "openai/gpt-4o-mini" },
  ollama: { provider_name: "ollama", provider_type: "llm", api_base_url: "http://localhost:11434", model_name: "llama3.1" },
  dashscope_voice: { provider_name: "dashscope", provider_type: "voice", api_base_url: "https://dashscope.aliyuncs.com/api/v1", model_name: "fun-asr-realtime" },
  cosyvoice: { provider_name: "cosyvoice", provider_type: "voice", api_base_url: "https://dashscope.aliyuncs.com/api/v1", model_name: "cosyvoice-v3-flash" },
  qwentts: { provider_name: "qwentts", provider_type: "voice", api_base_url: "https://dashscope.aliyuncs.com/api/v1", model_name: "qwen3-tts-flash" },
  dashscope_emb: { provider_name: "dashscope-embedding", provider_type: "embedding", api_base_url: "https://dashscope.aliyuncs.com/api/v1", model_name: "text-embedding-v4" },
  volcano: { provider_name: "volcano", provider_type: "llm", api_base_url: "https://ark.cn-beijing.volces.com/api/v3", model_name: "doubao-pro-32k" },
} satisfies Record<string, ProviderForm>;

type AuthUser = {
  email: string;
  username?: string;
  role: string;
  membership_level: string;
  status?: string;
};

type ProviderForm = {
  provider_name: string;
  provider_type: string;
  api_base_url: string;
  api_key?: string;
  model_name: string;
  enabled?: boolean;
  priority?: number;
  cost_weight?: number;
  fallback_provider?: string;
  config?: Record<string, unknown>;
};

type ProviderRead = Required<Omit<ProviderForm, "api_key">> & {
  id: string;
  api_key_status?: "none" | "valid" | "invalid" | string;
};

type ProviderCapability = {
  key: string;
  label: string;
  features: string[];
  status: "ready" | "mock" | "missing" | "key_invalid" | string;
  active_provider: string;
  message: string;
  required: boolean;
};

type TestResult = {
  ok: boolean;
  provider_name: string;
  provider_type: string;
  model_name: string;
  latency_ms: number;
  message: string;
  request_url: string;
  response_preview: string;
  error: string;
};

type Overview = {
  users: number;
  conversations: number;
  assets: number;
  usage_logs: number;
};

type AdminUserRead = {
  id: string;
  email: string;
  username: string;
  role: string;
  membership_level: string;
  status: string;
  created_at: string;
};

type PromptTemplate = {
  id: string;
  name: string;
  task_type: string;
  version: string;
  content: string;
  enabled: boolean;
  updated_at: string;
};

type UsageLog = {
  id: string;
  task_type: string;
  tokens_input: number;
  tokens_output: number;
  voice_seconds: number;
  cost_estimate: number;
  latency_ms: number;
  status: string;
  created_at: string;
};

type LLMCallLog = {
  id: string;
  provider_name: string;
  model_name: string;
  method_name: string;
  prompt: string | null;
  response: string | null;
  error: string | null;
  status: string;
  latency_ms: number;
  created_at: string;
};

type SecurityStatus = {
  jwt: string;
  admin_role_guard: string;
  provider_keys: string;
  cors: string;
  active_users: number;
  disabled_users: number;
  notes: string[];
};

type UserDetail = AdminUserRead & {
  membership_expires_at?: string | null;
  profile?: {
    native_language: string;
    primary_target_language: string;
    current_level: string;
    fluency_score: number;
  } | null;
  stats: Record<string, number>;
};

type CostCenter = {
  today_total: number;
  by_provider: Array<{ provider_id: string; cost: number }>;
  by_task_type: Array<{ task_type: string; cost: number }>;
  high_cost_users: Array<{ user_id: string; email: string; cost: number }>;
};

type AuditLog = {
  id: string;
  admin_user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: Record<string, unknown>;
  created_at: string;
};

type MembershipPlan = {
  id: string;
  level: string;
  display_name: string;
  daily_ai_dialogue: number;
  daily_voice_minutes: number;
  daily_freeze_count: number;
  asset_limit: number;
  enabled: boolean;
  updated_at: string;
};

type AppSettings = {
  default_theme: string;
  default_locale: string;
  enabled_locales: string[];
  allow_user_theme_override: boolean;
  allow_user_locale_override: boolean;
  default_llm_provider: string;
  default_voice_provider: string;
  realtime_asr_provider: string;
  default_embedding_provider: string;
  tts_provider: string;
  tts_voice: string;
  tts_speed: number;
  tts_pitch: number;
  global_api_keys: { platform: string; api_key: string; base_url: string }[];
  updated_at: string;
};

type AuthSettings = {
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_from_email: string;
  smtp_use_tls: boolean;
  smtp_configured: boolean;
  email_verification_enabled: boolean;
  verification_code_ttl_seconds: number;
  google_trial_enabled: boolean;
  google_trial_days: number;
  google_trial_membership_level: string;
  google_email_domains: string[];
  demo_mode_enabled: boolean;
  demo_user_email: string;
  demo_password_configured: boolean;
  updated_at: string;
};

type Topic = {
  id: string;
  title: string;
  creator_email?: string;
  tags: string[];
  status: string;
  view_count: number;
  parent_topic_id: string | null;
};

type Circle = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  ended_at: string | null;
  room_type: string;
  allowed_languages: string[];
};

type CircleMember = {
  id: string;
  user_id: string;
  email: string;
  username: string;
  role: string;
  joined_at: string;
};

type GrammarPattern = {
  id: string;
  code: string;
  name: string;
  description: string;
  difficulty: number;
  language_code: string;
};

type BlockedUser = {
  id: string;
  email: string;
  username: string;
  reason: string;
  blocked_at: string;
};

type MatchFeedback = {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  updated_at: string;
};

type ModerationEvent = {
  id: string;
  event_type: string;
  content_type: string;
  content_id: string;
  user_id: string;
  status: string;
  details: Record<string, unknown>;
  created_at: string;
};

type UserAsset = {
  id: string;
  user_id: string;
  title: string;
  source_text: string;
  target_language: string;
  variants: Record<string, string>;
  keywords: string[];
  current_version: number;
  created_at: string;
};

type LeaderboardEntry = {
  user_id: string;
  username: string;
  total_xp: number;
  current_level: number;
  current_streak_days: number;
};

const defaultForm: ProviderForm = {
  provider_name: "",
  provider_type: "llm",
  api_base_url: "",
  api_key: "",
  model_name: "",
  enabled: true,
  priority: 10,
  cost_weight: 1,
  fallback_provider: "",
  config: {}
};

function AdminApp() {
  const [token, setToken] = useState(localStorage.getItem("ainerspeak_admin_token") ?? "");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loginEmail, setLoginEmail] = useState("admin@ainerspeak.com");
  const [loginPassword, setLoginPassword] = useState("ChangeMe123!");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [providers, setProviders] = useState<ProviderRead[]>([]);
  const [providerCapabilities, setProviderCapabilities] = useState<ProviderCapability[]>([]);
  const [users, setUsers] = useState<AdminUserRead[]>([]);
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [llmLogs, setLlmLogs] = useState<LLMCallLog[]>([]);
  const [selectedLlmLog, setSelectedLlmLog] = useState<LLMCallLog | null>(null);
  const [llmFilterStatus, setLlmFilterStatus] = useState<string>("");
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus | null>(null);
  const [form, setForm] = useState<ProviderForm>(defaultForm);
  const [providerPanelMode, setProviderPanelMode] = useState<"closed" | "view" | "edit" | "create">("closed");
  const [activeProviderId, setActiveProviderId] = useState("");
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [status, setStatus] = useState("请先登录后台，然后测试 Provider 连接。");
  const [toasts, setToasts] = useState<{id:number;msg:string;type:'ok'|'err'|'info'}[]>([]);
  const toastIdRef = useRef(0);

  useEffect(() => {
    if (!status || status.includes("请先登录")) return;
    const id = ++toastIdRef.current;
    const isErr = status.includes("失败") || status.includes("请先");
    const type = isErr ? 'err' : status.includes("成功") || status.includes("已保存") || status.includes("已更新") || status.includes("已创建") || status.includes("已删除") || status.includes("已加载") || status.includes("已退出") || status.includes("登录成功") ? 'ok' : 'info';
    setToasts(prev => [...prev.slice(-4), {id, msg: status, type}]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, [status]);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [promptForm, setPromptForm] = useState({ name: "", task_type: "", version: "", content: "", enabled: true });
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [userPanelMode, setUserPanelMode] = useState<"closed" | "create" | "edit">("closed");
  const [userForm, setUserForm] = useState({
    email: "", username: "", role: "user", membership_level: "free", status: "active", password: ""
  });
  const [costCenter, setCostCenter] = useState<CostCenter | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>([]);
  const [planForm, setPlanForm] = useState<MembershipPlan | null>(null);
  const [authSettings, setAuthSettings] = useState<AuthSettings | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [adminTheme, setAdminTheme] = useState<"dark" | "light">(
    () => (localStorage.getItem("ainerspeak_admin_theme") === "light" ? "light" : "dark")
  );
  const [authForm, setAuthForm] = useState({
    smtp_host: "",
    smtp_port: 587,
    smtp_username: "",
    smtp_password: "",
    smtp_from_email: "",
    smtp_use_tls: true,
    email_verification_enabled: true,
    verification_code_ttl_seconds: 600,
    google_trial_enabled: true,
    google_trial_days: 30,
    google_trial_membership_level: "vip",
    google_email_domains: "gmail.com,googlemail.com",
    demo_mode_enabled: true,
    demo_user_email: "demo@ainerspeak.com",
    demo_user_password: ""
  });
  const [appForm, setAppForm] = useState({
    default_theme: "dark",
    default_locale: "zh",
    enabled_locales: ["zh", "en"],
    allow_user_theme_override: true,
    allow_user_locale_override: true,
    default_llm_provider: "",
    default_voice_provider: "",
    realtime_asr_provider: "auto",
    default_embedding_provider: "",
    tts_provider: "browser",
    tts_voice: "Xiaoxiao",
    tts_speed: 0.9,
    tts_pitch: 1.1,
    global_api_keys: [] as { platform: string; api_key: string; base_url: string }[],
  });
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicsPage, setTopicsPage] = useState(1);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [topicForm, setTopicForm] = useState({ title: "", tags: "" });
  const [circles, setCircles] = useState<Circle[]>([]);
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);
  const [circleMembers, setCircleMembers] = useState<CircleMember[]>([]);
  const [patterns, setPatterns] = useState<GrammarPattern[]>([]);
  const [patternFilter, setPatternFilter] = useState("");
  const [editingPatternId, setEditingPatternId] = useState<string | null>(null);
  const [patternForm, setPatternForm] = useState({ description: "", difficulty: 1 });
  const [feedbackList, setFeedbackList] = useState<MatchFeedback[]>([]);
  const [feedbackLookupId, setFeedbackLookupId] = useState("");
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [moderationEvents, setModerationEvents] = useState<ModerationEvent[]>([]);
  const [userAssets, setUserAssets] = useState<UserAsset[]>([]);
  const [assetLookupId, setAssetLookupId] = useState("");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  function toggleAdminTheme(theme: "dark" | "light") {
    setAdminTheme(theme);
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("ainerspeak_admin_theme", theme);
  }

  function toggleLocale(code: string) {
    setAppForm((prev) => {
      const exists = prev.enabled_locales.includes(code);
      const next = exists
        ? prev.enabled_locales.filter((item) => item !== code)
        : [...prev.enabled_locales, code];
      return { ...prev, enabled_locales: next.length ? next : ["zh"] };
    });
  }

  const activeNavLabel = useMemo(() => {
    for (const group of navGroups) {
      const item = group.items.find((entry) => entry.key === activeNav);
      if (item) return item.label;
    }
    return activeNav;
  }, [activeNav]);

  const stats = useMemo(
    () => [
      { label: "Total Users", value: String(overview?.users ?? "-"), trend: "registered users", icon: Users },
      {
        label: "Active Conversations",
        value: String(overview?.conversations ?? "-"),
        trend: "thought dialogues",
        icon: Activity
      },
      { label: "Expression Assets", value: String(overview?.assets ?? "-"), trend: "Thought Freeze", icon: FileText },
      { label: "Usage Logs", value: String(overview?.usage_logs ?? "-"), trend: "provider calls", icon: Bot }
    ],
    [overview]
  );

  useEffect(() => {
    if (token) {
      void loadSession(token);
    }
  }, [token]);

  async function loadSession(activeToken: string) {
    try {
      const currentUser = await apiGet<AuthUser>("/api/auth/me", activeToken);
      setUser(currentUser);
      await loadDashboard(activeToken);
    } catch {
      localStorage.removeItem("ainerspeak_admin_token");
      setToken("");
      setUser(null);
      setStatus("登录已过期，请重新登录。");
    }
  }

  async function adminLogin() {
    try {
      setLoginLoading(true);
      setLoginError("");
      setStatus("正在登录测试管理员...");
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await parseResponse<{ access_token: string; user: AuthUser }>(response);
      localStorage.setItem("ainerspeak_admin_token", data.access_token);
      setToken(data.access_token);
      setUser(data.user);
      setStatus("后台登录成功，可以保存或测试 Provider。");
      await loadDashboard(data.access_token);
    } catch (error) {
      setLoginError(errorMessage(error));
      setStatus(`登录失败：${errorMessage(error)}`);
    } finally {
      setLoginLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("ainerspeak_admin_token");
    setToken("");
    setUser(null);
    setOverview(null);
    setProviders([]);
    setTestResult(null);
    setStatus("已退出登录。");
  }

  function mergeAppForm(appData: AppSettings) {
    setAppForm({
      default_theme: appData.default_theme,
      default_locale: appData.default_locale,
      enabled_locales: appData.enabled_locales,
      allow_user_theme_override: appData.allow_user_theme_override,
      allow_user_locale_override: appData.allow_user_locale_override,
      default_llm_provider: appData.default_llm_provider ?? "",
      default_voice_provider: appData.default_voice_provider ?? "",
      realtime_asr_provider: appData.realtime_asr_provider ?? "auto",
      default_embedding_provider: appData.default_embedding_provider ?? "",
      tts_provider: (appData as any).tts_provider ?? "browser",
      tts_voice: (appData as any).tts_voice ?? "Xiaoxiao",
      tts_speed: (appData as any).tts_speed ?? 0.9,
      tts_pitch: (appData as any).tts_pitch ?? 1.1,
      global_api_keys: Array.isArray((appData as any).global_api_keys) ? (appData as any).global_api_keys : [],
    });
  }

  async function loadLlmLogs(statusFilter = llmFilterStatus) {
    if (!token) return;
    setStatus("正在加载LLM调用日志...");
    try {
      const url = statusFilter ? `/api/admin/llm-logs?status=${statusFilter}` : "/api/admin/llm-logs";
      const data = await apiGet<LLMCallLog[]>(url, token);
      setLlmLogs(data);
      setStatus(`LLM 调用日志已加载：${data.length} 条。`);
    } catch (err) {
      setStatus(`加载日志失败: ${errorMessage(err)}`);
    }
  }

  async function clearLlmLogs() {
    if (!token) return;
    if (!window.confirm("确定要清除全部 LLM 调用日志吗？此操作不可逆。")) return;
    setStatus("正在清除日志...");
    try {
      await apiDelete("/api/admin/llm-logs", token);
      setLlmLogs([]);
      setSelectedLlmLog(null);
      setStatus("已成功清空 LLM 调用日志。");
    } catch (err) {
      setStatus(`清空日志失败: ${errorMessage(err)}`);
    }
  }

  async function loadDashboard(activeToken = token) {
    if (!activeToken) return;
    try {
      const [overviewData, providerData, capabilityData, userData, appData] = await Promise.all([
        apiGet<Overview>("/api/admin/overview", activeToken),
        apiGet<ProviderRead[]>("/api/admin/providers", activeToken),
        apiGet<ProviderCapability[]>("/api/admin/providers/capabilities", activeToken),
        apiGet<AdminUserRead[]>("/api/admin/users", activeToken),
        apiGet<AppSettings>("/api/admin/app-settings", activeToken)
      ]);
      setOverview(overviewData);
      setProviders(providerData);
      setProviderCapabilities(capabilityData);
      setUsers(userData);
      setAppSettings(appData);
      mergeAppForm(appData);
      setStatus("后台数据已刷新。");
    } catch (error) {
      setStatus(`刷新失败：${errorMessage(error)}`);
    }
  }

  function closeProviderPanel() {
    setProviderPanelMode("closed");
    setActiveProviderId("");
    setForm(defaultForm);
    setTestResult(null);
  }

  function startCreateProvider() {
    setProviderPanelMode("create");
    setActiveProviderId("");
    setForm(defaultForm);
    setTestResult(null);
    setStatus("新建 Provider，请在下方填写并保存。");
  }

  function startViewProvider(provider: ProviderRead) {
    setProviderPanelMode("view");
    setActiveProviderId(provider.id);
    setTestResult(null);
    setStatus(`查看 ${provider.provider_name}`);
  }

  function startEditProvider(provider: ProviderRead) {
    setProviderPanelMode("edit");
    setActiveProviderId(provider.id);
    setForm({
      provider_name: provider.provider_name,
      provider_type: provider.provider_type,
      api_base_url: provider.api_base_url,
      api_key: "",
      model_name: provider.model_name,
      enabled: provider.enabled,
      priority: provider.priority,
      cost_weight: provider.cost_weight,
      fallback_provider: provider.fallback_provider,
      config: provider.config ?? {}
    });
    setTestResult(null);
    setStatus(`正在编辑 ${provider.provider_name}。API Key 留空则保留原值。`);
  }

  function resetProviderForm() {
    startCreateProvider();
  }

  async function deleteProvider(provider: ProviderRead) {
    if (!token) {
      setStatus("请先登录后台。");
      return;
    }
    if (!window.confirm(`确定删除 Provider「${provider.provider_name}」吗？此操作不可恢复。`)) {
      return;
    }
    try {
      setStatus(`正在删除 ${provider.provider_name}...`);
      await apiDelete(`/api/admin/providers/${provider.id}`, token);
      if (activeProviderId === provider.id) {
        closeProviderPanel();
      }
      setAppForm((current) => ({
        ...current,
        default_llm_provider:
          current.default_llm_provider === provider.provider_name ? "" : current.default_llm_provider,
        default_voice_provider:
          current.default_voice_provider === provider.provider_name ? "" : current.default_voice_provider,
        default_embedding_provider:
          current.default_embedding_provider === provider.provider_name ? "" : current.default_embedding_provider
      }));
      await loadDashboard();
      setStatus(`${provider.provider_name} 已删除。`);
    } catch (error) {
      setStatus(`删除失败：${errorMessage(error)}`);
    }
  }

  async function saveProvider() {
    if (!token) {
      setStatus("请先点击右上角登录测试账号。");
      return;
    }
    try {
      const isUpdate = providerPanelMode === "edit" && Boolean(activeProviderId);
      setStatus(isUpdate ? "正在更新 Provider..." : "正在保存 Provider...");
      const payload = normalizeForm(form);
      const saved = isUpdate
        ? await apiPut<ProviderRead>(`/api/admin/providers/${activeProviderId}`, token, payload)
        : await apiPost<ProviderRead>("/api/admin/providers", token, payload);
      setProviders((items) =>
        isUpdate
          ? items.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...items]
      );
      setProviderPanelMode("edit");
      setActiveProviderId(saved.id);
      setStatus(`${saved.provider_name} 已${isUpdate ? "更新" : "创建"}。`);
    } catch (error) {
      setStatus(`保存失败：${errorMessage(error)}`);
    }
  }

  async function testDraftProvider() {
    if (!token) {
      setStatus("请先点击右上角登录测试账号。");
      return;
    }
    try {
      setStatus("正在测试当前表单配置...");
      const result = await apiPost<TestResult>("/api/admin/providers/test", token, {
        ...normalizeForm(form),
        provider_id: providerPanelMode === "edit" ? activeProviderId : "",
        timeout_seconds: 12
      });
      setTestResult(result);
      setStatus(result.ok ? "连接测试成功。" : "连接测试失败，请检查 Base URL、模型名或 API Key。");
    } catch (error) {
      setStatus(`测试失败：${errorMessage(error)}`);
    }
  }

  async function testSavedProvider(providerId: string) {
    if (!token) {
      setStatus("请先点击右上角登录测试账号。");
      return;
    }
    try {
      setStatus("正在测试已保存 Provider...");
      const result = await apiPost<TestResult>(`/api/admin/providers/${providerId}/test`, token, {});
      setTestResult(result);
      setStatus(result.ok ? "已保存 Provider 连接成功。" : "已保存 Provider 连接失败。");
      await loadDashboard();
    } catch (error) {
      setStatus(`测试失败：${errorMessage(error)}`);
    }
  }

  function applyPreset(key: string) {
    const preset = providerPresets[key as keyof typeof providerPresets];
    setProviderPanelMode("create");
    setActiveProviderId("");
    setForm({
      ...defaultForm,
      ...preset,
      api_key: key === "mock" || key === "ollama" ? "" : form.api_key,
      config: {}
    });
    setTestResult(null);
    setStatus(`已切换到 ${key} 预设（新建模式）。`);
  }

  async function handleNav(label: string) {
    setActiveNav(label);
    if (!token) {
      setStatus("请先登录后台。");
      return;
    }
    const messages: Record<string, string> = {
      Dashboard: "已切换到 Dashboard。",
      Users: "正在加载用户列表...",
      Memberships: "正在加载会员数据...",
      "Cost Center": "正在加载成本数据...",
      Topics: "正在加载话题列表...",
      Circles: "正在加载圈子列表...",
      "AI Providers": "正在加载 Provider...",
      Prompts: "正在加载 Prompt 模板...",
      Patterns: "正在加载语法模式...",
      "Usage Logs": "正在加载用量日志...",
      "LLM Logs": "正在加载LLM调用日志...",
      "Audit Logs": "正在加载审计日志...",
      Security: "正在加载安全状态...",
      Matches: "正在加载匹配数据..."
    };
    setStatus(messages[label] ?? `${label} 已选中。`);
    try {
      if (label === "Dashboard" || label === "AI Providers") {
        await loadDashboard();
      }
      if (label === "Users" || label === "Memberships") {
        const data = await apiGet<AdminUserRead[]>("/api/admin/users", token);
        setUsers(data);
        if (label === "Memberships") {
          const plans = await apiGet<MembershipPlan[]>("/api/admin/membership-plans", token);
          setMembershipPlans(plans);
        }
        setStatus(`${label} 已加载：${data.length} 个用户。`);
      }
      if (label === "Cost Center") {
        const data = await apiGet<CostCenter>("/api/admin/costs", token);
        setCostCenter(data);
        setStatus(`今日总成本 $${data.today_total.toFixed(4)}`);
      }
      if (label === "Topics") {
        const data = await apiGet<Topic[]>("/api/topics", token);
        setTopics(data);
        setTopicsPage(1);
        setStatus(`话题已加载：${data.length} 篇。`);
      }
      if (label === "Circles") {
        const data = await apiGet<Circle[]>("/api/circles", token);
        setCircles(data);
        setSelectedCircleId(null);
        setCircleMembers([]);
        setStatus(`圈子已加载：${data.length} 个。`);
      }
      if (label === "Matches") {
        setStatus("匹配雷达已加载。");
      }
      if (label === "Patterns") {
        const data = await apiGet<GrammarPattern[]>("/api/grammar/patterns", token);
        setPatterns(data);
        setPatternFilter("");
        setStatus(`语法模式已加载：${data.length} 条。`);
      }
      if (label === "Moderation") {
        const data = await apiGet<ModerationEvent[]>("/api/admin/moderation", token);
        setModerationEvents(data);
        setStatus(`审核事件已加载：${data.length} 条。`);
      }
      if (label === "Gamification") {
        const data = await apiGet<LeaderboardEntry[]>("/api/gamification/leaderboard", token);
        setLeaderboard(data);
        setStatus(`排行榜已加载：${data.length} 人。`);
      }
      if (label === "Audit Logs") {
        const data = await apiGet<AuditLog[]>("/api/admin/audit-logs", token);
        setAuditLogs(data);
        setStatus(`审计日志已加载：${data.length} 条。`);
      }
      if (label === "Prompts") {
        const data = await apiGet<PromptTemplate[]>("/api/admin/prompts", token);
        setPrompts(data);
        setStatus(`Prompt 模板已加载：${data.length} 个。`);
      }
      if (label === "Usage Logs") {
        const data = await apiGet<UsageLog[]>("/api/admin/usage", token);
        setUsageLogs(data);
        setStatus(`用量日志已加载：${data.length} 条。`);
      }
      if (label === "LLM Logs") {
        await loadLlmLogs();
      }
      if (label === "Security" || label === "Settings") {
        const [data, settings, appData] = await Promise.all([
          apiGet<SecurityStatus>("/api/admin/security", token).catch(() => null),
          apiGet<AuthSettings>("/api/admin/auth-settings", token),
          apiGet<AppSettings>("/api/admin/app-settings", token)
        ]);
        if (data) setSecurityStatus(data);
        setAuthSettings(settings);
        setAppSettings(appData);
        mergeAppForm(appData);
        setAuthForm({
          smtp_host: settings.smtp_host,
          smtp_port: settings.smtp_port,
          smtp_username: settings.smtp_username,
          smtp_password: "",
          smtp_from_email: settings.smtp_from_email,
          smtp_use_tls: settings.smtp_use_tls,
          email_verification_enabled: settings.email_verification_enabled,
          verification_code_ttl_seconds: settings.verification_code_ttl_seconds,
          google_trial_enabled: settings.google_trial_enabled,
          google_trial_days: settings.google_trial_days,
          google_trial_membership_level: settings.google_trial_membership_level,
          google_email_domains: settings.google_email_domains.join(","),
          demo_mode_enabled: settings.demo_mode_enabled,
          demo_user_email: settings.demo_user_email,
          demo_user_password: ""
        });
        setStatus(label === "Security" ? "安全状态与 SMTP 配置已加载。" : "系统设置与界面配置已加载。");
      }
    } catch (error) {
      setStatus(`${label} 加载失败：${errorMessage(error)}`);
    }
  }

  function startEditPrompt(p: PromptTemplate) {
    setEditingPromptId(p.id);
    setPromptForm({ name: p.name, task_type: p.task_type, version: p.version, content: p.content, enabled: p.enabled });
  }

  function cancelEditPrompt() {
    setEditingPromptId(null);
  }

  async function saveAppSettings() {
    if (!token) return;
    try {
      setStatus("正在保存后台配置...");
      const saved = await apiPut<AppSettings>("/api/admin/app-settings", token, appForm);
      setAppSettings(saved);
      mergeAppForm(saved);
      setStatus("后台配置已保存（优先于 .env）。");
    } catch (error) {
      setStatus(`保存失败：${errorMessage(error)}`);
    }
  }

  const llmProviderOptions = useMemo(
    () => providers.filter((item) => item.provider_type === "llm"),
    [providers]
  );
  const voiceProviderOptions = useMemo(
    () => providers.filter((item) => item.provider_type === "voice"),
    [providers]
  );
  const embeddingProviderOptions = useMemo(
    () => providers.filter((item) => item.provider_type === "embedding"),
    [providers]
  );

  const providerGroups = useMemo(() => {
    const labels: Record<string, { title: string; required: boolean; hint: string }> = {
      llm: { title: "LLM 大模型", required: true, hint: "必接 · 启用文字对话、语法纠错" },
      voice: { title: "实时语音 / Voice", required: true, hint: "必接 · 启用语音对话与实时 ASR" },
      embedding: { title: "Embedding 向量", required: true, hint: "必接 · 启用长期记忆与表达检索" }
    };
    const grouped = new Map<string, ProviderRead[]>();
    for (const item of providers) {
      const bucket = grouped.get(item.provider_type) ?? [];
      bucket.push(item);
      grouped.set(item.provider_type, bucket);
    }
    const ordered = ["llm", "voice", "embedding"].map((type) => ({
      type,
      title: labels[type]?.title ?? type,
      required: labels[type]?.required ?? false,
      hint: labels[type]?.hint ?? "",
      items: grouped.get(type) ?? []
    }));
    for (const [type, items] of grouped.entries()) {
      if (!["llm", "voice", "embedding"].includes(type)) {
        ordered.push({ type, title: type, required: false, hint: "", items });
      }
    }
    return ordered.filter((group) => group.items.length > 0);
  }, [providers]);

  const activeProvider = useMemo(
    () => providers.find((item) => item.id === activeProviderId) ?? null,
    [providers, activeProviderId]
  );

  function providerKeyBadge(provider: ProviderRead) {
    if (provider.provider_name === "mock" || provider.provider_name === "mock-voice") {
      return <span className="badge badge-muted">无需 Key</span>;
    }
    if (provider.api_key_status === "valid") {
      return <span className="badge badge-success">Key 有效</span>;
    }
    if (provider.api_key_status === "invalid") {
      return <span className="badge badge-danger">Key 需重填</span>;
    }
    return <span className="badge badge-muted">未配置 Key</span>;
  }

  function providerStatusBadge(provider: ProviderRead) {
    const lastTest = provider.config?.last_test as TestResult | undefined;
    if (!lastTest) {
      return provider.enabled ? (
        <span className="badge badge-muted">未测试</span>
      ) : (
        <span className="badge badge-danger">已禁用</span>
      );
    }
    return lastTest.ok ? (
      <span className="badge badge-success">已连接 ({lastTest.latency_ms}ms)</span>
    ) : (
      <span className="badge badge-danger">失败</span>
    );
  }

  function renderProviderRow(provider: ProviderRead) {
    const selected = provider.id === activeProviderId && providerPanelMode !== "closed";
    return (
      <tr className={selected ? "selected-row" : undefined} key={provider.id}>
        <td><strong>{provider.provider_name}</strong></td>
        <td>{provider.provider_type}</td>
        <td>{provider.model_name || "-"}</td>
        <td>#{provider.priority}</td>
        <td>{providerKeyBadge(provider)}</td>
        <td>{providerStatusBadge(provider)}</td>
        <td className="provider-table-actions">
          <div className="mini-actions">
            <button type="button" onClick={() => startViewProvider(provider)}>查看</button>
            <button type="button" onClick={() => startEditProvider(provider)}>编辑</button>
            <button
              type="button"
              onClick={() => {
                setActiveProviderId(provider.id);
                void testSavedProvider(provider.id);
              }}
            >
              测试
            </button>
            <button type="button" className="danger" onClick={() => void deleteProvider(provider)}>删除</button>
          </div>
        </td>
      </tr>
    );
  }

  function renderProviderDetailPanel() {
    if (providerPanelMode === "closed") {
      return null;
    }

    if (providerPanelMode === "view" && activeProvider) {
      const lastTest = activeProvider.config?.last_test as TestResult | undefined;
      return (
        <div className="provider-detail-panel">
          <div className="provider-detail-header">
            <div>
              <span>Provider Detail</span>
              <h3>{activeProvider.provider_name}</h3>
            </div>
            <div className="mini-actions">
              <button type="button" onClick={() => startEditProvider(activeProvider)}>编辑</button>
              <button type="button" onClick={() => void testSavedProvider(activeProvider.id)}>测试</button>
              <button type="button" className="secondary-button" onClick={closeProviderPanel}>关闭</button>
            </div>
          </div>
          <div className="detail-grid read-only">
            <div><span className="detail-label">类型</span><strong>{activeProvider.provider_type}</strong></div>
            <div><span className="detail-label">模型</span><strong>{activeProvider.model_name || "-"}</strong></div>
            <div><span className="detail-label">Base URL</span><code>{activeProvider.api_base_url || "-"}</code></div>
            <div><span className="detail-label">优先级</span><strong>#{activeProvider.priority}</strong></div>
            <div><span className="detail-label">状态</span>{providerStatusBadge(activeProvider)}</div>
            <div><span className="detail-label">API Key</span>{providerKeyBadge(activeProvider)}</div>
            <div><span className="detail-label">说明</span>
              <strong>
                {activeProvider.api_key_status === "valid"
                  ? "Key 已保存在数据库；编辑框留空也会保留原 Key"
                  : activeProvider.api_key_status === "invalid"
                    ? "Key 无效，请重新粘贴并点「保存修改」"
                    : "尚未配置 API Key"}
              </strong>
            </div>
            {typeof activeProvider.config?.workspace_id === "string" && activeProvider.config.workspace_id && (
              <div><span className="detail-label">Workspace</span><code>{activeProvider.config.workspace_id}</code></div>
            )}
            {typeof activeProvider.config?.ws_url === "string" && activeProvider.config.ws_url && (
              <div className="detail-label-wide"><span className="detail-label">WebSocket</span><code>{activeProvider.config.ws_url}</code></div>
            )}
          </div>
          {lastTest && (
            <div className={lastTest.ok ? "test-result ok" : "test-result error"}>
              <strong>{lastTest.ok ? "最近测试成功" : "最近测试失败"}</strong>
              <span>{lastTest.latency_ms}ms · {lastTest.message}</span>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="provider-detail-panel">
        <div className="provider-detail-header">
          <div>
            <span>{providerPanelMode === "create" ? "New Provider" : "Edit Provider"}</span>
            <h3>{providerPanelMode === "create" ? "新建 Provider" : `编辑 · ${form.provider_name}`}</h3>
          </div>
          <div className="mini-actions">
            <button type="button" className="secondary-button" onClick={closeProviderPanel}>关闭</button>
          </div>
        </div>

        {providerPanelMode === "create" && (
          <div className="preset-row compact">
            {Object.keys(providerPresets).map((key) => (
              <button
                type="button"
                className={form.provider_name === key ? "preset active" : "preset"}
                key={key}
                onClick={() => applyPreset(key)}
              >
                {key}
              </button>
            ))}
          </div>
        )}

        <div className="form-grid">
          <label>
            Provider Name
            <input value={form.provider_name} onChange={(e) => setForm({ ...form, provider_name: e.target.value })} />
          </label>
          <label>
            Provider Type
            <select value={form.provider_type} onChange={(e) => setForm({ ...form, provider_type: e.target.value })}>
              <option value="llm">LLM</option>
              <option value="voice">Voice</option>
              <option value="embedding">Embedding</option>
            </select>
          </label>
          <label>
            API Base URL
            <input value={form.api_base_url} placeholder="https://api.openai.com/v1" onChange={(e) => setForm({ ...form, api_base_url: e.target.value })} />
          </label>
          <label>
            Model
            <input value={form.model_name} placeholder="gpt-4o-mini" onChange={(e) => setForm({ ...form, model_name: e.target.value })} />
          </label>
          <label>
            API Key
            <input
              value={form.api_key}
              type="password"
              placeholder={providerPanelMode === "edit" ? "留空则保留已有 Key" : "粘贴 API Key"}
              onChange={(e) => setForm({ ...form, api_key: e.target.value })}
            />
          </label>
          <label>
            Priority
            <input value={form.priority} type="number" onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} />
          </label>
          <label>
            Workspace ID
            <input
              value={String(form.config?.workspace_id ?? "")}
              placeholder="ws-xxxxxxxx"
              onChange={(e) => setForm({
                ...form,
                config: { ...(form.config ?? {}), workspace_id: e.target.value }
              })}
            />
          </label>
          {(form.provider_type === "voice" || form.provider_name === "dashscope") && (
            <label>
              WebSocket URL
              <input
                value={String(form.config?.ws_url ?? "")}
                placeholder="wss://.../api-ws/v1/inference"
                onChange={(e) => setForm({
                  ...form,
                  config: { ...(form.config ?? {}), ws_url: e.target.value }
                })}
              />
            </label>
          )}
        </div>

        <div className="button-row">
          <button type="button" onClick={() => void testDraftProvider()}>测试当前配置</button>
          <button type="button" onClick={() => void saveProvider()}>
            {providerPanelMode === "edit" ? "保存修改" : "创建 Provider"}
          </button>
          {providerPanelMode === "edit" && activeProviderId && (
            <button type="button" className="btn-secondary" onClick={() => void testSavedProvider(activeProviderId)}>
              测试已保存配置
            </button>
          )}
        </div>

        {testResult && (
          <div className={testResult.ok ? "test-result ok" : "test-result error"}>
            <strong>{testResult.ok ? "连接成功" : "连接失败"}</strong>
            <span>{testResult.provider_name} · {testResult.model_name} · {testResult.latency_ms}ms</span>
            <p>{testResult.message}</p>
            {testResult.request_url && <code>{testResult.request_url}</code>}
            <pre>{testResult.response_preview || testResult.error}</pre>
          </div>
        )}
      </div>
    );
  }

  async function saveAuthSettings() {
    if (!token) return;
    try {
      setStatus("正在保存 SMTP / 注册配置...");
      const saved = await apiPut<AuthSettings>("/api/admin/auth-settings", token, {
        ...authForm,
        google_email_domains: authForm.google_email_domains
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      });
      setAuthSettings(saved);
      setStatus("SMTP 与注册策略已保存。");
    } catch (error) {
      setStatus(`保存失败：${errorMessage(error)}`);
    }
  }

  async function testSmtp() {
    if (!token) return;
    try {
      setStatus("正在发送测试邮件...");
      const result = await apiPost<{ message: string }>("/api/admin/auth-settings/test-smtp", token, {});
      setStatus(result.message);
    } catch (error) {
      setStatus(`测试失败：${errorMessage(error)}`);
    }
  }

  async function savePrompt() {
    if (!token || !editingPromptId) return;
    try {
      setStatus("正在保存 Prompt...");
      await apiPut<PromptTemplate>(`/api/admin/prompts/${editingPromptId}`, token, {
        content: promptForm.content,
        version: promptForm.version,
        enabled: promptForm.enabled,
      });
      const data = await apiGet<PromptTemplate[]>("/api/admin/prompts", token);
      setPrompts(data);
      setEditingPromptId(null);
      setStatus("Prompt 已保存。");
    } catch (error) {
      setStatus(`Prompt 保存失败：${errorMessage(error)}`);
    }
  }

  async function loadUserDetail(userId: string) {
    if (!token) return;
    try {
      setSelectedUserId(userId);
      const detail = await apiGet<UserDetail>(`/api/admin/users/${userId}`, token);
      setUserDetail(detail);
      setStatus(`已加载用户详情：${detail.email}`);
    } catch (error) {
      setStatus(`用户详情加载失败：${errorMessage(error)}`);
    }
  }

  async function saveMembershipPlan() {
    if (!token || !planForm) return;
    try {
      setStatus("正在保存套餐配置...");
      await apiPut<MembershipPlan>(`/api/admin/membership-plans/${planForm.id}`, token, {
        display_name: planForm.display_name,
        daily_ai_dialogue: planForm.daily_ai_dialogue,
        daily_voice_minutes: planForm.daily_voice_minutes,
        daily_freeze_count: planForm.daily_freeze_count,
        asset_limit: planForm.asset_limit,
        enabled: planForm.enabled,
      });
      const plans = await apiGet<MembershipPlan[]>("/api/admin/membership-plans", token);
      setMembershipPlans(plans);
      setPlanForm(null);
      setStatus("套餐配置已保存。");
    } catch (error) {
      setStatus(`套餐保存失败：${errorMessage(error)}`);
    }
  }

  async function updateMembership(userId: string, membershipLevel: string) {
    if (!token) {
      setStatus("请先登录后台。");
      return;
    }
    try {
      setStatus(`正在修改会员为 ${membershipLevel}...`);
      await apiPut<AdminUserRead>(`/api/admin/users/${userId}/membership`, token, {
        membership_level: membershipLevel,
        status: "active",
        membership_expires_at: null
      });
      const data = await apiGet<AdminUserRead[]>("/api/admin/users", token);
      setUsers(data);
      if (selectedUserId === userId) {
        await loadUserDetail(userId);
      }
      setStatus(`会员已更新为 ${membershipLevel}。`);
    } catch (error) {
      setStatus(`会员更新失败：${errorMessage(error)}`);
    }
  }

  function startCreateUser() {
    setUserPanelMode("create");
    setUserForm({ email: "", username: "", role: "user", membership_level: "free", status: "active", password: "" });
    setSelectedUserId(null);
  }

  function startEditUser(u: AdminUserRead) {
    setUserPanelMode("edit");
    setSelectedUserId(u.id);
    setUserForm({
      email: u.email,
      username: u.username,
      role: u.role,
      membership_level: u.membership_level,
      status: u.status,
      password: ""
    });
  }

  async function saveUser() {
    if (!token) return;
    try {
      const isUpdate = userPanelMode === "edit" && Boolean(selectedUserId);
      setStatus(isUpdate ? "正在更新会员..." : "正在创建会员...");
      const saved = isUpdate
        ? await apiPut<AdminUserRead>(`/api/admin/users/${selectedUserId}`, token, userForm)
        : await apiPost<AdminUserRead>("/api/admin/users", token, userForm);
      setUsers((prev) => isUpdate ? prev.map(u => u.id === saved.id ? saved : u) : [saved, ...prev]);
      setUserPanelMode("closed");
      setStatus(`会员 ${saved.email} 保存成功。`);
    } catch (err) {
      setStatus(`会员保存失败：${errorMessage(err)}`);
    }
  }

  async function deleteUser(u: AdminUserRead) {
    if (!token) return;
    if (!window.confirm(`确定删除会员 ${u.email} 吗？将清除其所有数据且不可恢复！`)) return;
    try {
      setStatus(`正在删除会员 ${u.email}...`);
      await apiDelete(`/api/admin/users/${u.id}`, token);
      setUsers(users.filter(x => x.id !== u.id));
      if (selectedUserId === u.id) {
        setSelectedUserId(null);
        setUserDetail(null);
        setUserPanelMode("closed");
      }
      setStatus(`会员 ${u.email} 已删除。`);
    } catch (err) {
      setStatus(`删除失败：${errorMessage(err)}`);
    }
  }

  if (!token || !user) {
    return (
      <main className="login-shell">
        <section className="login-hero">
          <div className="login-hero-content">
            <div className="login-hero-badge">
              <Sparkles size={14} />
              AinerSpeak Admin
            </div>
            <h1>AI Expression OS 运营控制台</h1>
            <p>统一管理用户、会员、模型供应商、Prompt 与安全策略。与 H5 用户端共享同一套 API 契约。</p>
            <div className="login-hero-features">
              <span>用户与会员生命周期管理</span>
              <span>多 Provider 路由与成本监控</span>
              <span>SMTP / Demo / Google 试用配置</span>
            </div>
          </div>
        </section>
        <section className="login-panel">
          <div className="login-card">
            <div className="login-brand">
              <div className="login-brand-icon">
                <KeyRound size={22} />
              </div>
              <div>
                <strong>AinerSpeak Admin</strong>
                <span>Expression OS Control Center</span>
              </div>
            </div>
            <div className="login-copy">
              <h2>登录后台</h2>
              <p>使用管理员账号进入控制台，测试账号已预填。</p>
            </div>
            <form
              className="login-form"
              onSubmit={(event) => {
                event.preventDefault();
                void adminLogin();
              }}
            >
              <label>
                邮箱
                <input
                  value={loginEmail}
                  type="email"
                  placeholder="admin@ainerspeak.com"
                  onChange={(event) => setLoginEmail(event.target.value)}
                />
              </label>
              <label>
                密码
                <input
                  value={loginPassword}
                  type="password"
                  placeholder="请输入密码"
                  onChange={(event) => setLoginPassword(event.target.value)}
                />
              </label>
              {loginError && <div className="login-error">登录失败：{loginError}</div>}
              <button disabled={loginLoading} type="submit">
                {loginLoading ? "登录中..." : "登录后台"}
              </button>
            </form>
            <div className="login-hint">
              测试账号：<strong>admin@ainerspeak.com</strong> / <strong>ChangeMe123!</strong>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Sparkles size={20} />
          </div>
          <div>
            <strong>AinerSpeak</strong>
            <span>Admin Console</span>
          </div>
        </div>
        {navGroups.map((group) => (
          <div className="nav-group" key={group.title}>
            <span className="nav-group-label">{group.title}</span>
            <nav>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    className={activeNav === item.key ? "active" : ""}
                    key={item.key}
                    onClick={() => void handleNav(item.key)}
                  >
                    <Icon size={17} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        ))}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <strong>{user.email}</strong>
            <span>{user.role} · {user.membership_level}</span>
          </div>
          <button className="sidebar-logout" onClick={logout}>
            <LogOut size={16} />
            退出登录
          </button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <div className="topbar-breadcrumb">
              <span>运营后台</span>
              <ChevronRight size={14} />
              <span>{activeNavLabel}</span>
            </div>
            <h1>{activeNavLabel}</h1>
            <div className="topbar-meta">AinerSpeak AI Expression OS · 管理控制台</div>
          </div>
          <div className="topbar-actions">
            <button className="btn-secondary" onClick={() => void handleNav(activeNav)}>
              <RefreshCw size={15} />
              刷新
            </button>
            <button
              className={adminTheme === "dark" ? "btn-primary" : "btn-secondary"}
              onClick={() => toggleAdminTheme("dark")}
              title="深色模式"
            >
              <Moon size={15} />
            </button>
            <button
              className={adminTheme === "light" ? "btn-primary" : "btn-secondary"}
              onClick={() => toggleAdminTheme("light")}
              title="浅色模式"
            >
              <Sun size={15} />
            </button>
          </div>
        </header>

        <div className="workspace-content">
        {activeNav === "Dashboard" && (
          <>
            <section className="stats-grid">
              {stats.map((item, index) => {
                const Icon = item.icon;
                return (
                  <article className={`stat-card ${statAccents[index % statAccents.length]}`} key={item.label}>
                    <div className="stat-card-header">
                      <span>{item.label}</span>
                      <div className="stat-icon">
                        <Icon size={18} />
                      </div>
                    </div>
                    <strong>{item.value}</strong>
                    <p>{item.trend}</p>
                  </article>
                );
              })}
            </section>

            <section className="main-grid">
              <article className="panel large">
                <div className="panel-header">
                  <div>
                    <span>Quick Access</span>
                    <h2>用户与会员</h2>
                  </div>
                  <button onClick={() => void handleNav("Users")}>查看全部用户</button>
                </div>
                <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Email</th><th>Role</th><th>Plan</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {users.slice(0, 5).map((u) => (
                      <tr key={u.id}>
                        <td>{u.email}</td>
                        <td>{u.role}</td>
                        <td>{membershipBadge(u.membership_level)}</td>
                        <td>{statusBadge(u.status)}</td>
                      </tr>
                    ))}
                    {users.length === 0 && <tr><td colSpan={4}>点击「用户管理」加载数据</td></tr>}
                  </tbody>
                </table>
                </div>
              </article>

              <article className="panel">
                <div className="panel-header">
                  <div>
                    <span>Provider Routing</span>
                    <h2>AI 供应商</h2>
                  </div>
                  <button onClick={() => void handleNav("AI Providers")}>管理 Provider</button>
                </div>
                {providers.length === 0 ? (
                  <p className="module-copy">暂无 Provider，请前往 AI Providers 页添加。</p>
                ) : (
                <div className="table-wrap compact-table">
                  <table>
                    <thead>
                      <tr>
                        <th>名称</th>
                        <th>类型</th>
                        <th>状态</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {providers.slice(0, 6).map((provider) => (
                        <tr key={provider.id}>
                          <td><strong>{provider.provider_name}</strong></td>
                          <td>{provider.provider_type}</td>
                          <td>{providerStatusBadge(provider)}</td>
                          <td>
                            <button
                              type="button"
                              className="link-button"
                              onClick={() => {
                                setActiveNav("AI Providers");
                                startViewProvider(provider);
                              }}
                            >
                              查看
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                )}
              </article>
            </section>

            <section className="panel prompt-panel">
              <div className="panel-header">
                <div>
                  <span>Quick Access</span>
                  <h2>核心 Prompt 模板</h2>
                </div>
                <button onClick={() => void handleNav("Prompts")}>管理 Prompt</button>
              </div>
              <div className="prompt-grid">
                {["思想对话", "纠错分析", "Thought Freeze", "消消乐生成"].map((name) => (
                  <button className="prompt" key={name} onClick={() => void handleNav("Prompts")}>
                    <strong>{name}</strong>
                    <span>v1.0 active</span>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {(activeNav === "Matches" || activeNav === "Match Radar") && (
          <>
            <MatchRadar token={token} apiGet={apiGet} />

            <section className="panel page-panel" style={{ marginTop: 24 }}>
              <div className="panel-header">
                <div>
                  <span>Feedback</span>
                  <h2>匹配反馈查询</h2>
                </div>
              </div>
              <div className="form-grid" style={{ marginBottom: 16 }}>
                <label>
                  用户 ID
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={feedbackLookupId}
                      placeholder="输入用户 UUID"
                      onChange={(e) => setFeedbackLookupId(e.target.value)}
                    />
                    <button
                      onClick={async () => {
                        if (!feedbackLookupId.trim()) return;
                        try {
                          setStatus("正在加载匹配反馈...");
                          const data = await apiGet<MatchFeedback[]>(`/api/connect/feedback/${feedbackLookupId.trim()}`, token);
                          setFeedbackList(data);
                          setStatus(`匹配反馈已加载：${data.length} 条。`);
                        } catch (err) {
                          setStatus(`加载失败：${errorMessage(err)}`);
                        }
                      }}
                    >
                      查询
                    </button>
                  </div>
                </label>
              </div>
              {feedbackList.length > 0 ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Rating</th><th>Comment</th><th>Created</th><th>Updated</th></tr>
                    </thead>
                    <tbody>
                      {feedbackList.map((fb) => (
                        <tr key={fb.id}>
                          <td>{fb.rating}/5</td>
                          <td>{fb.comment || "-"}</td>
                          <td>{new Date(fb.created_at).toLocaleString()}</td>
                          <td>{new Date(fb.updated_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="module-copy">{feedbackLookupId ? "暂无匹配反馈数据。" : "输入用户 ID 后点击查询。"}</p>
              )}
            </section>

            <section className="panel page-panel" style={{ marginTop: 24 }}>
              <div className="panel-header">
                <div>
                  <span>Blacklist</span>
                  <h2>屏蔽用户管理</h2>
                </div>
                <button onClick={async () => {
                  try {
                    setStatus("正在加载屏蔽列表...");
                    const data = await apiGet<BlockedUser[]>("/api/reports/blocks", token);
                    setBlockedUsers(data);
                    setStatus(`屏蔽列表已加载：${data.length} 人。`);
                  } catch (err) {
                    setStatus(`加载失败：${errorMessage(err)}`);
                  }
                }}>
                  刷新列表
                </button>
              </div>
              {blockedUsers.length > 0 ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Email</th><th>Username</th><th>Reason</th><th>Blocked At</th></tr>
                    </thead>
                    <tbody>
                      {blockedUsers.map((b) => (
                        <tr key={b.id}>
                          <td>{b.email}</td>
                          <td>{b.username || "-"}</td>
                          <td>{b.reason || "-"}</td>
                          <td>{new Date(b.blocked_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="module-copy">暂无屏蔽用户。点击「刷新列表」加载数据。</p>
              )}
            </section>
          </>
        )}

        {(activeNav === "Users" || activeNav === "Memberships") && (
          <section className="panel page-panel">
            <div className="panel-header">
              <div>
                <span>{activeNav}</span>
                <h2>{activeNav === "Users" ? "会员管理" : "会员套餐配置"}</h2>
              </div>
              {activeNav === "Users" && (
                <div className="mini-actions">
                  <button onClick={startCreateUser}>添加会员</button>
                </div>
              )}
            </div>
            {activeNav === "Users" && userPanelMode !== "closed" && (
              <article className="panel user-detail-panel" style={{ marginBottom: 24, border: "1px solid var(--border)", padding: 24 }}>
                <div className="panel-header" style={{ borderBottom: "none", paddingBottom: 0, marginBottom: 16 }}>
                  <div>
                    <span>{userPanelMode === "create" ? "新建会员" : "编辑会员"}</span>
                    <h2>{userForm.email || "New Member"}</h2>
                  </div>
                  <button className="secondary-button" onClick={() => setUserPanelMode("closed")}>关闭</button>
                </div>
                <div className="form-grid">
                  <label>Email<input value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} /></label>
                  <label>Username<input value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} /></label>
                  <label>Password (至少8位, 编辑时留空则不修改)<input type="password" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} /></label>
                  <label>Role
                    <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})}>
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </label>
                  <label>会员等级
                    <select value={userForm.membership_level} onChange={e => setUserForm({...userForm, membership_level: e.target.value})}>
                      <option value="free">Free</option>
                      <option value="pro">Pro</option>
                      <option value="premium">Premium</option>
                      <option value="vip">VIP</option>
                    </select>
                  </label>
                  <label>状态
                    <select value={userForm.status} onChange={e => setUserForm({...userForm, status: e.target.value})}>
                      <option value="active">Active</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </label>
                </div>
                <div className="prompt-edit-actions" style={{ marginTop: 24 }}>
                  <button onClick={() => void saveUser()}>保存会员</button>
                  {userPanelMode === "edit" && selectedUserId && (
                    <button className="ghost-button" style={{ color: "var(--red)" }} onClick={() => {
                      const u = users.find(x => x.id === selectedUserId);
                      if (u) void deleteUser(u);
                    }}>删除会员</button>
                  )}
                </div>
              </article>
            )}
            {activeNav === "Memberships" && membershipPlans.length > 0 && (
              <div className="module-grid membership-grid">
                {membershipPlans.map((plan) => (
                  <article className="module-card" key={plan.id}>
                    <strong>{plan.display_name}</strong>
                    <span>{plan.level} · {plan.enabled ? "enabled" : "disabled"}</span>
                    {planForm?.id === plan.id ? (
                      <div className="prompt-edit-form">
                        <label>日对话次数<input type="number" value={planForm.daily_ai_dialogue} onChange={(e) => setPlanForm({ ...planForm, daily_ai_dialogue: Number(e.target.value) })} /></label>
                        <label>语音分钟<input type="number" value={planForm.daily_voice_minutes} onChange={(e) => setPlanForm({ ...planForm, daily_voice_minutes: Number(e.target.value) })} /></label>
                        <label>Freeze 次数<input type="number" value={planForm.daily_freeze_count} onChange={(e) => setPlanForm({ ...planForm, daily_freeze_count: Number(e.target.value) })} /></label>
                        <label>资产上限<input type="number" value={planForm.asset_limit} onChange={(e) => setPlanForm({ ...planForm, asset_limit: Number(e.target.value) })} /></label>
                        <div className="prompt-edit-actions">
                          <button onClick={() => void saveMembershipPlan()}>保存</button>
                          <button className="secondary-button" onClick={() => setPlanForm(null)}>取消</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p>对话 {plan.daily_ai_dialogue}/天 · 语音 {plan.daily_voice_minutes} 分钟 · Freeze {plan.daily_freeze_count}</p>
                        <button className="ghost-button prompt-edit-btn" onClick={() => setPlanForm(plan)}>编辑额度</button>
                      </>
                    )}
                  </article>
                ))}
              </div>
            )}
            {users.length === 0 ? (
              <p className="module-copy">正在加载用户数据...</p>
            ) : (
              <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Email</th><th>Username</th><th>Role</th><th>Plan</th><th>Status</th><th>Created</th><th>操作</th></tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className={selectedUserId === u.id ? "selected-row" : ""}>
                      <td><button className="link-button" onClick={() => void loadUserDetail(u.id)}>{u.email}</button></td>
                      <td>{u.username}</td>
                      <td>{u.role}</td>
                      <td>{membershipBadge(u.membership_level)}</td>
                      <td>{statusBadge(u.status)}</td>
                      <td>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td>
                        <div className="mini-actions">
                          <button onClick={() => { const userToEdit = users.find(x => x.id === u.id); if (userToEdit) startEditUser(userToEdit); }}>编辑</button>
                          <button onClick={() => void updateMembership(u.id, "vip")}>VIP</button>
                          <button onClick={() => void updateMembership(u.id, "pro")}>Pro</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
            {userDetail && (
              <article className="panel user-detail-panel">
                <div className="panel-header">
                  <div>
                    <span>User Detail</span>
                    <h2>{userDetail.email}</h2>
                  </div>
                  <button className="secondary-button" onClick={() => { setSelectedUserId(null); setUserDetail(null); }}>关闭</button>
                </div>
                <div className="module-grid">
                  <article className="module-card"><strong>会员</strong><span>{userDetail.membership_level}</span></article>
                  <article className="module-card"><strong>对话数</strong><span>{userDetail.stats.conversations}</span></article>
                  <article className="module-card"><strong>资产数</strong><span>{userDetail.stats.assets}</span></article>
                  <article className="module-card"><strong>Pattern</strong><span>{userDetail.stats.patterns} / 已掌握 {userDetail.stats.mastered_patterns}</span></article>
                  <article className="module-card"><strong>平均掌握度</strong><span>{userDetail.stats.avg_mastery_score}</span></article>
                  {userDetail.profile && (
                    <article className="module-card wide">
                      <strong>语言设置</strong>
                      <p>{userDetail.profile.native_language} → {userDetail.profile.primary_target_language} · {userDetail.profile.current_level}</p>
                    </article>
                  )}
                </div>
              </article>
            )}
          </section>
        )}

        {activeNav === "Cost Center" && (
          <section className="panel page-panel">
            <div className="panel-header">
              <div>
                <span>Cost Center</span>
                <h2>成本中心</h2>
              </div>
            </div>
            {!costCenter ? (
              <p className="module-copy">正在加载成本数据...</p>
            ) : (
              <>
                <div className="stats-grid">
                  <article className="stat-card">
                    <span>Today Total</span>
                    <strong>${costCenter.today_total.toFixed(4)}</strong>
                    <p>usage_logs 聚合</p>
                  </article>
                </div>
                <div className="main-grid">
                  <article className="panel">
                    <h3>按 Provider</h3>
                    <table>
                      <thead><tr><th>Provider</th><th>Cost</th></tr></thead>
                      <tbody>
                        {costCenter.by_provider.map((row) => (
                          <tr key={row.provider_id}><td>{row.provider_id}</td><td>${row.cost.toFixed(4)}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </article>
                  <article className="panel">
                    <h3>按功能</h3>
                    <table>
                      <thead><tr><th>Task</th><th>Cost</th></tr></thead>
                      <tbody>
                        {costCenter.by_task_type.map((row) => (
                          <tr key={row.task_type}><td>{row.task_type}</td><td>${row.cost.toFixed(4)}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </article>
                </div>
                <article className="panel">
                  <h3>高成本用户</h3>
                  <table>
                    <thead><tr><th>Email</th><th>Cost</th></tr></thead>
                    <tbody>
                      {costCenter.high_cost_users.map((row) => (
                        <tr key={row.user_id}><td>{row.email}</td><td>${row.cost.toFixed(4)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </article>
              </>
            )}
          </section>
        )}

        {activeNav === "Topics" && (
          <section className="panel page-panel">
            <div className="panel-header">
              <div>
                <span>Topics</span>
                <h2>话题管理</h2>
              </div>
              <button onClick={() => void handleNav("Topics")}>
                <RefreshCw size={15} /> 刷新
              </button>
            </div>
            {topics.length === 0 ? (
              <p className="module-copy">正在加载话题列表...</p>
            ) : (
              <>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Title</th><th>Creator</th><th>Tags</th><th>Status</th><th>Views</th><th>Forked</th><th>操作</th></tr>
                    </thead>
                    <tbody>
                      {topics.slice((topicsPage - 1) * 10, topicsPage * 10).map((t) => (
                        <tr key={t.id} className={editingTopicId === t.id ? "selected-row" : ""}>
                          <td>{t.title}</td>
                          <td>{t.creator_email || "-"}</td>
                          <td>{(t.tags || []).join(", ") || "-"}</td>
                          <td>{t.status}</td>
                          <td>{t.view_count}</td>
                          <td>{t.parent_topic_id ? t.parent_topic_id.slice(0, 8) + "..." : "-"}</td>
                          <td>
                            <div className="mini-actions">
                              {editingTopicId === t.id ? (
                                <>
                                  <button onClick={async () => {
                                    try {
                                      setStatus("正在保存话题...");
                                      await apiPut(`/api/topics/${t.id}`, token, {
                                        title: topicForm.title,
                                        tags: topicForm.tags.split(",").map((s: string) => s.trim()).filter(Boolean)
                                      });
                                      const data = await apiGet<Topic[]>("/api/topics", token);
                                      setTopics(data);
                                      setEditingTopicId(null);
                                      setStatus("话题已更新。");
                                    } catch (err) { setStatus(`保存失败：${errorMessage(err)}`); }
                                  }}>保存</button>
                                  <button className="secondary-button" onClick={() => setEditingTopicId(null)}>取消</button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => {
                                    setEditingTopicId(t.id);
                                    setTopicForm({ title: t.title, tags: (t.tags || []).join(", ") });
                                  }}>编辑</button>
                                  <button onClick={async () => {
                                    const nextStatus = t.status === "active" ? "archived" : "active";
                                    try {
                                      setStatus(`正在${nextStatus === "active" ? "激活" : "归档"}话题...`);
                                      await apiPut(`/api/topics/${t.id}`, token, { status: nextStatus });
                                      const data = await apiGet<Topic[]>("/api/topics", token);
                                      setTopics(data);
                                      setStatus(`话题已${nextStatus === "active" ? "激活" : "归档"}。`);
                                    } catch (err) { setStatus(`操作失败：${errorMessage(err)}`); }
                                  }}>
                                    {t.status === "active" ? "归档" : "激活"}
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {editingTopicId && (
                  <article className="panel" style={{ marginTop: 16, border: "1px solid var(--border)", padding: 24 }}>
                    <h3>编辑话题</h3>
                    <div className="form-grid">
                      <label>Title<input value={topicForm.title} onChange={e => setTopicForm({ ...topicForm, title: e.target.value })} /></label>
                      <label>Tags (逗号分隔)<input value={topicForm.tags} onChange={e => setTopicForm({ ...topicForm, tags: e.target.value })} /></label>
                    </div>
                  </article>
                )}
                <div className="button-row" style={{ marginTop: 16, justifyContent: "center" }}>
                  {Array.from({ length: Math.ceil(topics.length / 10) }, (_, i) => (
                    <button key={i} className={topicsPage === i + 1 ? "preset active" : "preset"} onClick={() => setTopicsPage(i + 1)}>
                      {i + 1}
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {activeNav === "Circles" && (
          <section className="panel page-panel">
            <div className="panel-header">
              <div>
                <span>Circles</span>
                <h2>圈子管理</h2>
              </div>
              <button onClick={() => void handleNav("Circles")}>
                <RefreshCw size={15} /> 刷新
              </button>
            </div>
            {circles.length === 0 ? (
              <p className="module-copy">正在加载圈子列表...</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Title</th><th>Type</th><th>Languages</th><th>Status</th><th>Created</th><th>Ended</th><th>操作</th></tr>
                  </thead>
                  <tbody>
                    {circles.map((c) => (
                      <tr key={c.id} className={selectedCircleId === c.id ? "selected-row" : ""}>
                        <td><strong>{c.title}</strong></td>
                        <td>{c.room_type}</td>
                        <td>{(c.allowed_languages || []).join(", ") || "-"}</td>
                        <td>{c.status}</td>
                        <td>{new Date(c.created_at).toLocaleDateString()}</td>
                        <td>{c.ended_at ? new Date(c.ended_at).toLocaleDateString() : "-"}</td>
                        <td>
                          <div className="mini-actions">
                            <button onClick={async () => {
                              try {
                                setSelectedCircleId(c.id);
                                setStatus("正在加载圈子成员...");
                                const members = await apiGet<CircleMember[]>(`/api/circles/${c.id}/members`, token);
                                setCircleMembers(members);
                                setStatus(`成员已加载：${members.length} 人。`);
                              } catch (err) { setStatus(`加载失败：${errorMessage(err)}`); }
                            }}>查看成员</button>
                            <button onClick={async () => {
                              const nextStatus = c.status === "active" ? "archived" : "active";
                              try {
                                setStatus(`正在${nextStatus === "active" ? "激活" : "归档"}圈子...`);
                                await apiPut(`/api/circles/${c.id}`, token, { status: nextStatus });
                                const data = await apiGet<Circle[]>("/api/circles", token);
                                setCircles(data);
                                setStatus(`圈子已${nextStatus === "active" ? "激活" : "归档"}。`);
                              } catch (err) { setStatus(`操作失败：${errorMessage(err)}`); }
                            }}>
                              {c.status === "active" ? "归档" : "激活"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {selectedCircleId && circleMembers.length > 0 && (
              <article className="panel" style={{ marginTop: 16, border: "1px solid var(--border)", padding: 24 }}>
                <div className="panel-header" style={{ borderBottom: "none", paddingBottom: 0, marginBottom: 16 }}>
                  <h2>圈子成员</h2>
                  <button className="secondary-button" onClick={() => { setSelectedCircleId(null); setCircleMembers([]); }}>关闭</button>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Email</th><th>Username</th><th>Role</th><th>Joined</th></tr></thead>
                    <tbody>
                      {circleMembers.map((m) => (
                        <tr key={m.id}>
                          <td>{m.email}</td>
                          <td>{m.username || "-"}</td>
                          <td>{m.role}</td>
                          <td>{new Date(m.joined_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            )}
          </section>
        )}

        {activeNav === "AI Providers" && (
          <>
            <section className="panel page-panel">
              <div className="panel-header">
                <div>
                  <span>Capabilities</span>
                  <h2>必接能力状态</h2>
                </div>
                <button onClick={() => void loadDashboard()}>刷新状态</button>
              </div>
              <p className="module-copy">
                配置保存在 Docker 数据库卷中，<strong>改代码/重建容器不会清空</strong>。
                编辑时空 Key 输入框是正常的（安全设计）；看「Key」列判断是否已保存。
                若显示「Key 需重填」，重新粘贴一次即可。
              </p>
              <div className="capability-grid">
                {providerCapabilities.map((capability) => (
                  <article
                    className={`capability-card status-${capability.status}`}
                    key={capability.key}
                  >
                    <div className="capability-head">
                      <strong>{capability.label}</strong>
                      <span className={`capability-badge status-${capability.status}`}>
                        {capabilityStatusLabel(capability.status)}
                      </span>
                    </div>
                    <p className="capability-features">{capability.features.join(" · ")}</p>
                    <p className="capability-message">{capability.message}</p>
                    {capability.active_provider && (
                      <code className="capability-provider">当前：{capability.active_provider}</code>
                    )}
                  </article>
                ))}
                {providerCapabilities.length === 0 && (
                  <p className="module-copy">正在加载能力状态...</p>
                )}
              </div>
            </section>

            <section className="panel page-panel">
              <div className="panel-header">
                <div>
                  <span>Runtime Routing</span>
                  <h2>运行时 Provider 路由</h2>
                </div>
                <button onClick={() => void saveAppSettings()}>保存路由配置</button>
              </div>
              <p className="module-copy">
                后台配置优先：API Key、Endpoint、默认 Provider 均先在下方 Provider 列表中维护；
                仅当后台未配置时，才会读取 `.env` 作为兜底。
              </p>
              <div className="form-grid">
                <label>
                  默认 LLM Provider
                  <select
                    value={appForm.default_llm_provider}
                    onChange={(e) => setAppForm({ ...appForm, default_llm_provider: e.target.value })}
                  >
                    <option value="">自动（按优先级）</option>
                    {llmProviderOptions.map((item) => (
                      <option key={item.id} value={item.provider_name}>{item.provider_name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  默认 Voice Provider
                  <select
                    value={appForm.default_voice_provider}
                    onChange={(e) => setAppForm({ ...appForm, default_voice_provider: e.target.value })}
                  >
                    <option value="">自动（按优先级）</option>
                    {voiceProviderOptions.map((item) => (
                      <option key={item.id} value={item.provider_name}>{item.provider_name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  实时 ASR 模式
                  <select
                    value={appForm.realtime_asr_provider}
                    onChange={(e) => setAppForm({ ...appForm, realtime_asr_provider: e.target.value })}
                  >
                    <option value="auto">auto（有 Key 则 DashScope）</option>
                    <option value="dashscope">dashscope</option>
                    <option value="mock">mock</option>
                  </select>
                </label>
                <label>
                  默认 Embedding Provider
                  <select
                    value={appForm.default_embedding_provider}
                    onChange={(e) => setAppForm({ ...appForm, default_embedding_provider: e.target.value })}
                  >
                    <option value="">自动（按优先级）</option>
                    {embeddingProviderOptions.map((item) => (
                      <option key={item.id} value={item.provider_name}>{item.provider_name}</option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <section className="panel page-panel">
              <div className="panel-header">
                <div>
                  <span>TTS Settings</span>
                  <h2>语音合成配置</h2>
                </div>
                <button onClick={() => void saveAppSettings()}>💾 保存语音配置</button>
              </div>
              <div className="form-grid">
                <label>
                  TTS 平台
                  <select value={appForm.tts_provider} onChange={(e) => setAppForm({ ...appForm, tts_provider: e.target.value })}>
                    <option value="browser">Edge 浏览器原生</option>
                    <option value="qwentts">阿里云 Qwen-TTS (推荐)</option>
                    <option value="cosyvoice">阿里云 CosyVoice</option>
                    <option value="openai">OpenAI TTS</option>
                  </select>
                </label>
                <label>
                  默认音色
                  <select value={appForm.tts_voice} onChange={(e) => setAppForm({ ...appForm, tts_voice: e.target.value })}>
                    <optgroup label="Qwen-TTS 阿里云 (推荐)">
                      <option value="Cherry">Cherry (甜美女声)</option>
                      <option value="Stella">Stella (知性女声)</option>
                      <option value="Ethan">Ethan (稳重男声)</option>
                    </optgroup>
                    <optgroup label="CosyVoice 阿里云">
                      <option value="longanhuan">龙安欢 (温柔)</option>
                      <option value="longaxiang">龙阿香 (活泼)</option>
                      <option value="longafang">龙阿芳 (知性)</option>
                      <option value="longaxing">龙阿星 (清亮)</option>
                      <option value="longxiaochun_v2">龙小春 V2 (甜美)</option>
                      <option value="longxiaoxia_v2">龙小夏 V2 (清新)</option>
                      <option value="longxiaoyue_v2">龙小悦 V2 (温柔)</option>
                    </optgroup>
                    <optgroup label="Edge 浏览器 (微软语音)">
                      <option value="Xiaoxiao">晓晓 Xiaoxiao (甜美)</option>
                      <option value="Yunjian">云间 Yunjian (温柔)</option>
                    </optgroup>
                    <optgroup label="英文女声">
                      <option value="Aria">Aria (清亮)</option>
                      <option value="Jenny">Jenny (自然)</option>
                    </optgroup>
                    <optgroup label="英文男声">
                      <option value="Guy">Guy (稳重)</option>
                    </optgroup>
                  </select>
                </label>
                <label>
                  语速
                  <input type="range" min="0.5" max="1.5" step="0.05" value={appForm.tts_speed}
                    onChange={(e) => setAppForm({ ...appForm, tts_speed: parseFloat(e.target.value) })} />
                  <span style={{fontSize:12,color:'#94a3b8'}}>{appForm.tts_speed.toFixed(2)}x</span>
                </label>
                <label>
                  音调
                  <input type="range" min="0.7" max="1.4" step="0.05" value={appForm.tts_pitch}
                    onChange={(e) => setAppForm({ ...appForm, tts_pitch: parseFloat(e.target.value) })} />
                  <span style={{fontSize:12,color:'#94a3b8'}}>{appForm.tts_pitch.toFixed(2)}</span>
                </label>
              </div>
            </section>

            <section className="panel page-panel">
              <div className="panel-header">
                <div>
                  <span>Global API Keys</span>
                  <h2>全局 API 密钥（配置一次，全局共享）</h2>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={() => void saveAppSettings()}>💾 保存</button>
                  <button onClick={() => setAppForm({
                    ...appForm,
                    global_api_keys: [...appForm.global_api_keys, { platform: "", api_key: "", base_url: "" }]
                  })}>+ 添加密钥</button>
                </div>
              </div>
              <p className="module-copy" style={{marginBottom:12}}>此处配置的 API Key 会自动应用于所有同平台服务（LLM / TTS / 实时语音 / Embedding），无需在 AI 供应商中逐个配置。</p>
              {appForm.global_api_keys.length > 0 ? (
                <div className="table-wrap">
                <table className="provider-table">
                  <thead>
                    <tr>
                      <th style={{width:150}}>平台</th>
                      <th>API Key</th>
                      <th style={{width:220}}>Base URL</th>
                      <th style={{width:60}}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appForm.global_api_keys.map((entry: { platform: string; api_key: string; base_url: string }, i: number) => (
                      <tr key={i}>
                        <td>
                          <select value={entry.platform} className="cell-select"
                            onChange={(e) => {
                              const keys = [...appForm.global_api_keys];
                              keys[i] = { ...keys[i], platform: e.target.value };
                              setAppForm({ ...appForm, global_api_keys: keys });
                            }}>
                            <option value="">选择...</option>
                            <option value="dashscope">阿里云 DashScope</option>
                            <option value="volcano">火山引擎</option>
                            <option value="openai">OpenAI</option>
                            <option value="deepseek">DeepSeek</option>
                            <option value="anthropic">Anthropic</option>
                            <option value="google">Google AI</option>
                            <option value="azure">Azure</option>
                            <option value="custom">自定义</option>
                          </select>
                        </td>
                        <td>
                          <input className="full-inp" placeholder="sk-xxx..."
                            value={entry.api_key}
                            onChange={(e) => {
                              const keys = [...appForm.global_api_keys];
                              keys[i] = { ...keys[i], api_key: e.target.value };
                              setAppForm({ ...appForm, global_api_keys: keys });
                            }} />
                        </td>
                        <td>
                          <input className="full-inp" placeholder="https://..."
                            value={entry.base_url}
                            onChange={(e) => {
                              const keys = [...appForm.global_api_keys];
                              keys[i] = { ...keys[i], base_url: e.target.value };
                              setAppForm({ ...appForm, global_api_keys: keys });
                            }} />
                        </td>
                        <td>
                          <button className="secondary-button" onClick={() => {
                            setAppForm({ ...appForm, global_api_keys: appForm.global_api_keys.filter((_, j) => j !== i) });
                          }}>删除</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              ) : (
                <p className="module-copy">暂无全局密钥，点击「添加密钥」配置。</p>
              )}
            </section>

            <section className="panel page-panel">
              <div className="panel-header">
                <div>
                  <span>Provider Routing</span>
                  <h2>已保存的 AI 供应商</h2>
                </div>
                <div className="mini-actions">
                  <button type="button" onClick={startCreateProvider}>新建 Provider</button>
                  <button type="button" onClick={() => void loadDashboard()}>刷新列表</button>
                </div>
              </div>
              {providers.length === 0 ? (
                <p className="module-copy">暂无 Provider，点击「新建 Provider」添加。</p>
              ) : (
                <div className="table-wrap">
                  <table className="provider-table">
                    <thead>
                      <tr>
                        <th style={{width:80}}>名称</th>
                        <th style={{width:50}}>类型</th>
                        <th style={{width:90}}>模型</th>
                        <th style={{width:40}}>Pri</th>
                        <th style={{width:60}}>Key</th>
                        <th style={{width:50}}>连接</th>
                        <th style={{width:130}}>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {providerGroups.map((group) => (
                        <Fragment key={group.type}>
                          <tr className="group-row">
                            <td colSpan={7}>
                              <div className="group-row-label">
                                <strong>{group.title}</strong>
                                {group.required && <span className="required-badge">必接</span>}
                                {group.hint && <span className="group-row-hint">{group.hint}</span>}
                              </div>
                            </td>
                          </tr>
                          {group.items.map((provider) => renderProviderRow(provider))}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {renderProviderDetailPanel()}
            </section>
          </>
        )}

        {activeNav === "Prompts" && (
          <section className="panel page-panel">
            <div className="panel-header">
              <div>
                <span>Prompts</span>
                <h2>Prompt 模板管理</h2>
              </div>
            </div>
            {prompts.length === 0 ? (
              <p className="module-copy">正在加载 Prompt 模板...</p>
            ) : (
              <div className="module-grid">
                {prompts.map((p) => (
                  <article className="module-card" key={p.id}>
                    <strong>{p.name}</strong>
                    <span>{p.task_type} · {p.version} · {p.enabled ? "✓ enabled" : "✗ disabled"}</span>
                    {editingPromptId === p.id ? (
                      <div className="prompt-edit-form">
                        <label>
                          Version
                          <input
                            value={promptForm.version}
                            onChange={(e) => setPromptForm({ ...promptForm, version: e.target.value })}
                          />
                        </label>
                        <label>
                          Content
                          <textarea
                            value={promptForm.content}
                            rows={6}
                            onChange={(e) => setPromptForm({ ...promptForm, content: e.target.value })}
                          />
                        </label>
                        <label className="toggle-label">
                          <span>Enabled</span>
                          <button
                            type="button"
                            className={`toggle-switch ${promptForm.enabled ? "on" : "off"}`}
                            onClick={() => setPromptForm({ ...promptForm, enabled: !promptForm.enabled })}
                          >
                            <span className="toggle-knob" />
                          </button>
                        </label>
                        <div className="prompt-edit-actions">
                          <button onClick={() => void savePrompt()}>保存</button>
                          <button className="secondary-button" onClick={cancelEditPrompt}>取消</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p>{p.content.length > 120 ? p.content.slice(0, 120) + "..." : p.content}</p>
                        <span>Updated: {new Date(p.updated_at).toLocaleDateString()}</span>
                        <button className="ghost-button prompt-edit-btn" onClick={() => startEditPrompt(p)}>编辑</button>
                      </>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {activeNav === "Patterns" && (
          <section className="panel page-panel">
            <div className="panel-header">
              <div>
                <span>Patterns</span>
                <h2>语法模式管理</h2>
              </div>
              <button onClick={() => void handleNav("Patterns")}>
                <RefreshCw size={15} /> 刷新
              </button>
            </div>
            <div className="form-grid" style={{ marginBottom: 16 }}>
              <label>
                语言过滤
                <select value={patternFilter} onChange={(e) => setPatternFilter(e.target.value)}>
                  <option value="">全部</option>
                  {["en", "ja", "ko", "es", "fr", "zh", "de", "pt", "ru", "ar", "hi", "bn"].map((code) => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </select>
              </label>
            </div>
            {patterns.length === 0 ? (
              <p className="module-copy">正在加载语法模式...</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Code</th><th>Name</th><th>Description</th><th>Difficulty</th><th>Language</th><th>操作</th></tr>
                  </thead>
                  <tbody>
                    {patterns
                      .filter((p) => !patternFilter || p.language_code === patternFilter)
                      .map((p) => (
                        <tr key={p.id} className={editingPatternId === p.id ? "selected-row" : ""}>
                          <td><code>{p.code}</code></td>
                          <td><strong>{p.name}</strong></td>
                          <td>
                            {editingPatternId === p.id ? (
                              <input
                                value={patternForm.description}
                                onChange={(e) => setPatternForm({ ...patternForm, description: e.target.value })}
                              />
                            ) : (
                              p.description.length > 60 ? p.description.slice(0, 60) + "..." : p.description
                            )}
                          </td>
                          <td>
                            {editingPatternId === p.id ? (
                              <input
                                type="number"
                                value={patternForm.difficulty}
                                min={1}
                                max={5}
                                style={{ width: 60 }}
                                onChange={(e) => setPatternForm({ ...patternForm, difficulty: Number(e.target.value) })}
                              />
                            ) : (
                              p.difficulty
                            )}
                          </td>
                          <td>{p.language_code}</td>
                          <td>
                            <div className="mini-actions">
                              {editingPatternId === p.id ? (
                                <>
                                  <button onClick={async () => {
                                    try {
                                      setStatus("正在保存语法模式...");
                                      await apiPut(`/api/grammar/patterns/${p.id}`, token, {
                                        description: patternForm.description,
                                        difficulty: patternForm.difficulty
                                      });
                                      const data = await apiGet<GrammarPattern[]>("/api/grammar/patterns", token);
                                      setPatterns(data);
                                      setEditingPatternId(null);
                                      setStatus("语法模式已更新。");
                                    } catch (err) { setStatus(`保存失败：${errorMessage(err)}`); }
                                  }}>保存</button>
                                  <button className="secondary-button" onClick={() => setEditingPatternId(null)}>取消</button>
                                </>
                              ) : (
                                <button onClick={() => {
                                  setEditingPatternId(p.id);
                                  setPatternForm({ description: p.description, difficulty: p.difficulty });
                                }}>编辑</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {activeNav === "Usage Logs" && (
          <section className="panel page-panel">
            <div className="panel-header">
              <div>
                <span>Usage Logs</span>
                <h2>用量日志</h2>
              </div>
            </div>
            {usageLogs.length === 0 ? (
              <p className="module-copy">当前没有调用日志。真实 LLM/Voice 调用后数据将显示在这里。</p>
            ) : (
              <table>
                <thead>
                  <tr><th>Task</th><th>Tokens In</th><th>Tokens Out</th><th>Voice (s)</th><th>Latency (ms)</th><th>Cost</th><th>Status</th><th>Time</th></tr>
                </thead>
                <tbody>
                  {usageLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{log.task_type}</td>
                      <td>{log.tokens_input}</td>
                      <td>{log.tokens_output}</td>
                      <td>{log.voice_seconds}</td>
                      <td>{log.latency_ms}</td>
                      <td>${log.cost_estimate.toFixed(4)}</td>
                      <td>{log.status}</td>
                      <td>{new Date(log.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {activeNav === "LLM Logs" && (
          <section className="panel page-panel">
            <div className="panel-header">
              <div>
                <span>LLM Call Logs</span>
                <h2>LLM 调用日志</h2>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="ghost-button danger" onClick={() => void clearLlmLogs()}>清除全部日志</button>
                <button className="primary-button" onClick={() => void loadLlmLogs()}>刷新</button>
              </div>
            </div>

            <div className="filter-bar" style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <select 
                value={llmFilterStatus} 
                onChange={(e) => {
                  const val = e.target.value;
                  setLlmFilterStatus(val);
                  void loadLlmLogs(val);
                }}
                style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--panel-bg)', color: 'var(--text)' }}
              >
                <option value="">所有状态</option>
                <option value="success">成功</option>
                <option value="failed">失败</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
              <div className="table-wrap" style={{ flex: 1 }}>
                {llmLogs.length === 0 ? (
                  <p className="module-copy">当前没有调用日志。调用 LLM 后数据将显示在这里。</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>时间</th>
                        <th>供应商</th>
                        <th>模型</th>
                        <th>接口方法</th>
                        <th>延迟</th>
                        <th>状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {llmLogs.map((log) => (
                        <tr
                          key={log.id}
                          className={selectedLlmLog?.id === log.id ? "selected-row" : ""}
                          onClick={() => setSelectedLlmLog(log)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td>{new Date(log.created_at).toLocaleString()}</td>
                          <td>{log.provider_name}</td>
                          <td>{log.model_name}</td>
                          <td><code>{log.method_name}</code></td>
                          <td>{log.latency_ms} ms</td>
                          <td style={{ color: log.status === 'success' ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold' }}>
                            {log.status === 'success' ? '成功' : '失败'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {selectedLlmLog && (
                <article className="panel detail-panel" style={{ width: '480px', position: 'sticky', top: '16px', background: 'var(--panel-bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px' }}>
                  <div className="panel-header" style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Log Details</span>
                      <h3 style={{ margin: 0, fontSize: '16px' }}>{selectedLlmLog.provider_name} - {selectedLlmLog.model_name}</h3>
                    </div>
                    <button className="secondary-button" onClick={() => setSelectedLlmLog(null)}>关闭</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: 'var(--text)' }}>
                    <div>
                      <strong>时间:</strong> {new Date(selectedLlmLog.created_at).toLocaleString()}
                    </div>
                    <div>
                      <strong>方法:</strong> <code>{selectedLlmLog.method_name}</code>
                    </div>
                    <div>
                      <strong>延迟:</strong> {selectedLlmLog.latency_ms} ms
                    </div>
                    <div>
                      <strong>状态:</strong>{' '}
                      <span style={{ color: selectedLlmLog.status === 'success' ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold' }}>
                        {selectedLlmLog.status === 'success' ? '成功' : '失败'}
                      </span>
                    </div>

                    {selectedLlmLog.error && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <strong style={{ color: 'var(--danger)' }}>错误信息:</strong>
                        <pre style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: 'var(--danger)',
                          padding: '8px',
                          borderRadius: '4px',
                          overflowX: 'auto',
                          fontSize: '11px',
                          whiteSpace: 'pre-wrap',
                          maxHeight: '120px',
                          border: '1px solid rgba(239, 68, 68, 0.2)'
                        }}>
                          {selectedLlmLog.error}
                        </pre>
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <strong>输入 Prompt (参数):</strong>
                      <pre style={{
                        background: 'rgba(0,0,0,0.05)',
                        padding: '8px',
                        borderRadius: '4px',
                        overflow: 'auto',
                        maxHeight: '220px',
                        fontSize: '11px',
                        whiteSpace: 'pre-wrap',
                        border: '1px solid var(--border)'
                      }}>
                        {formatPrompt(selectedLlmLog.prompt)}
                      </pre>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <strong>返回结果:</strong>
                      <pre style={{
                        background: 'rgba(0,0,0,0.05)',
                        padding: '8px',
                        borderRadius: '4px',
                        overflow: 'auto',
                        maxHeight: '220px',
                        fontSize: '11px',
                        whiteSpace: 'pre-wrap',
                        border: '1px solid var(--border)'
                      }}>
                        {selectedLlmLog.response || '(无)'}
                      </pre>
                    </div>
                  </div>
                </article>
              )}
            </div>
          </section>
        )}

        {activeNav === "Audit Logs" && (
          <section className="panel page-panel">
            <div className="panel-header">
              <div>
                <span>Audit Logs</span>
                <h2>审计日志</h2>
              </div>
            </div>
            {auditLogs.length === 0 ? (
              <p className="module-copy">暂无审计记录。修改会员、Provider 或 Prompt 后会自动记录。</p>
            ) : (
              <table>
                <thead>
                  <tr><th>Action</th><th>Resource</th><th>Resource ID</th><th>Admin</th><th>Time</th></tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{log.action}</td>
                      <td>{log.resource_type}</td>
                      <td>{log.resource_id.slice(0, 8)}...</td>
                      <td>{log.admin_user_id.slice(0, 8)}...</td>
                      <td>{new Date(log.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {activeNav === "Security" && (
          <section className="panel page-panel">
            <div className="panel-header">
              <div>
                <span>Security</span>
                <h2>安全状态</h2>
              </div>
            </div>
            {!securityStatus ? (
              <p className="module-copy">正在加载安全状态...</p>
            ) : (
              <div className="module-grid">
                <article className="module-card"><strong>JWT 认证</strong><span>{securityStatus.jwt}</span></article>
                <article className="module-card"><strong>Admin 权限守卫</strong><span>{securityStatus.admin_role_guard}</span></article>
                <article className="module-card"><strong>Provider 密钥加密</strong><span>{securityStatus.provider_keys}</span></article>
                <article className="module-card"><strong>CORS 策略</strong><span>{securityStatus.cors}</span></article>
                <article className="module-card"><strong>活跃用户</strong><span>{securityStatus.active_users} 人</span></article>
                <article className="module-card"><strong>已禁用用户</strong><span>{securityStatus.disabled_users} 人</span></article>
                <article className="module-card wide">
                  <strong>安全说明</strong>
                  {securityStatus.notes.map((note, i) => <p key={i}>{note}</p>)}
                </article>
              </div>
            )}

            <div className="panel-header" style={{ marginTop: 24 }}>
              <div>
                <span>Auth & SMTP</span>
                <h2>注册验证与 Google 试用</h2>
              </div>
              <div className="mini-actions">
                <button onClick={() => void testSmtp()}>测试 SMTP</button>
                <button onClick={() => void saveAuthSettings()}>保存配置</button>
              </div>
            </div>

            {authSettings && (
              <div className="form-grid">
                <label>SMTP Host<input value={authForm.smtp_host} onChange={(e) => setAuthForm({ ...authForm, smtp_host: e.target.value })} /></label>
                <label>SMTP Port<input type="number" value={authForm.smtp_port} onChange={(e) => setAuthForm({ ...authForm, smtp_port: Number(e.target.value) })} /></label>
                <label>SMTP Username<input value={authForm.smtp_username} onChange={(e) => setAuthForm({ ...authForm, smtp_username: e.target.value })} /></label>
                <label>SMTP Password<input type="password" value={authForm.smtp_password} placeholder="留空则不修改" onChange={(e) => setAuthForm({ ...authForm, smtp_password: e.target.value })} /></label>
                <label>From Email<input value={authForm.smtp_from_email} onChange={(e) => setAuthForm({ ...authForm, smtp_from_email: e.target.value })} /></label>
                <label>验证码有效期(秒)<input type="number" value={authForm.verification_code_ttl_seconds} onChange={(e) => setAuthForm({ ...authForm, verification_code_ttl_seconds: Number(e.target.value) })} /></label>
                <label>Google 试用天数<input type="number" value={authForm.google_trial_days} onChange={(e) => setAuthForm({ ...authForm, google_trial_days: Number(e.target.value) })} /></label>
                <label>Google 试用等级<input value={authForm.google_trial_membership_level} onChange={(e) => setAuthForm({ ...authForm, google_trial_membership_level: e.target.value })} /></label>
                <label className="wide">Google 邮箱域名（逗号分隔）<input value={authForm.google_email_domains} onChange={(e) => setAuthForm({ ...authForm, google_email_domains: e.target.value })} /></label>
                <label className="toggle-row"><span>启用邮箱验证码</span><input type="checkbox" checked={authForm.email_verification_enabled} onChange={(e) => setAuthForm({ ...authForm, email_verification_enabled: e.target.checked })} /></label>
                <label className="toggle-row"><span>启用 Google 30 天试用</span><input type="checkbox" checked={authForm.google_trial_enabled} onChange={(e) => setAuthForm({ ...authForm, google_trial_enabled: e.target.checked })} /></label>
                <label className="toggle-row"><span>SMTP TLS</span><input type="checkbox" checked={authForm.smtp_use_tls} onChange={(e) => setAuthForm({ ...authForm, smtp_use_tls: e.target.checked })} /></label>
                <article className="module-card wide">
                  <strong>当前状态</strong>
                  <span>SMTP 已配置：{authSettings.smtp_configured ? "是" : "否（开发模式会在 API 日志返回 dev_code）"}</span>
                  <span>Google 邮箱注册：{authSettings.google_trial_enabled ? `${authSettings.google_trial_days} 天 ${authSettings.google_trial_membership_level.toUpperCase()} 试用后自动停用` : "已关闭"}</span>
                  <span>H5 演示模式：{authSettings.demo_mode_enabled ? "已开启" : "已关闭"}</span>
                </article>
              </div>
            )}
          </section>
        )}

        {activeNav === "Settings" && (
          <section className="panel page-panel">
            <div className="panel-header">
              <div>
                <span>Localization</span>
                <h2>界面语言与主题</h2>
              </div>
              <div className="mini-actions">
                <button onClick={() => void saveAppSettings()}>保存配置</button>
              </div>
            </div>

            {appSettings && (
              <div className="form-grid" style={{ marginBottom: 24 }}>
                <label>默认 H5 主题
                  <select
                    value={appForm.default_theme}
                    onChange={(e) => setAppForm({ ...appForm, default_theme: e.target.value })}
                  >
                    <option value="dark">深色 Dark</option>
                    <option value="light">浅色 Light</option>
                  </select>
                </label>
                <label>默认界面语言
                  <select
                    value={appForm.default_locale}
                    onChange={(e) => setAppForm({ ...appForm, default_locale: e.target.value })}
                  >
                    {appForm.enabled_locales.map((code) => (
                      <option key={code} value={code}>{code}</option>
                    ))}
                  </select>
                </label>
                <label className="toggle-row wide">
                  <span>允许用户切换界面语言</span>
                  <input
                    type="checkbox"
                    checked={appForm.allow_user_locale_override}
                    onChange={(e) => setAppForm({ ...appForm, allow_user_locale_override: e.target.checked })}
                  />
                </label>
                <label className="toggle-row wide">
                  <span>允许用户切换深/浅色主题</span>
                  <input
                    type="checkbox"
                    checked={appForm.allow_user_theme_override}
                    onChange={(e) => setAppForm({ ...appForm, allow_user_theme_override: e.target.checked })}
                  />
                </label>
                <article className="module-card wide">
                  <strong>启用的 H5 界面语言</strong>
                  <div className="locale-check-grid">
                    {ALL_LOCALES.map((item) => (
                      <label key={item.code} className="locale-check">
                        <input
                          type="checkbox"
                          checked={appForm.enabled_locales.includes(item.code)}
                          onChange={() => toggleLocale(item.code)}
                        />
                        <span>{item.label} ({item.code})</span>
                      </label>
                    ))}
                  </div>
                  <span>仅启用的语言会出现在 H5 用户语言切换列表中；LLM 解释语言会跟随用户选择的界面语言。</span>
                </article>
              </div>
            )}

            <div className="panel-header" style={{ marginTop: 24 }}>
              <div>
                <span>Demo Mode</span>
                <h2>H5 演示阶段</h2>
              </div>
            </div>

            {authSettings && (
              <div className="form-grid" style={{ marginBottom: 24 }}>
                <label className="toggle-row wide">
                  <span>开启 Demo 演示阶段（H5 登录页自动填充测试账密）</span>
                  <input
                    type="checkbox"
                    checked={authForm.demo_mode_enabled}
                    onChange={(e) => setAuthForm({ ...authForm, demo_mode_enabled: e.target.checked })}
                  />
                </label>
                <label>演示测试邮箱
                  <input
                    value={authForm.demo_user_email}
                    onChange={(e) => setAuthForm({ ...authForm, demo_user_email: e.target.value })}
                    placeholder="demo@ainerspeak.com"
                  />
                </label>
                <label>演示测试密码
                  <input
                    type="password"
                    value={authForm.demo_user_password}
                    placeholder={authSettings.demo_password_configured ? "留空则不修改" : "默认 Demo123!"}
                    onChange={(e) => setAuthForm({ ...authForm, demo_user_password: e.target.value })}
                  />
                </label>
                <article className="module-card wide">
                  <strong>演示说明</strong>
                  <span>
                    开启后 H5 登录页会预填测试账号并显示「演示登录」；关闭后用户需自行注册/登录，注册入口才会显示。
                  </span>
                  <span>
                    当前演示账号：<strong>{authSettings.demo_user_email}</strong>
                    {authSettings.demo_password_configured ? "（已自定义密码）" : "（默认密码 Demo123!）"}
                  </span>
                </article>
              </div>
            )}
          </section>
        )}

        {activeNav === "Moderation" && (
          <section className="panel page-panel">
            <div className="panel-header">
              <div>
                <span>Moderation</span>
                <h2>内容审核队列</h2>
              </div>
              <button onClick={async () => {
                try {
                  setStatus("正在刷新审核列表...");
                  const data = await apiGet<ModerationEvent[]>("/api/admin/moderation", token);
                  setModerationEvents(data);
                  setStatus(`审核事件已刷新：${data.length} 条。`);
                } catch (err) { setStatus(`刷新失败：${errorMessage(err)}`); }
              }}>
                刷新
              </button>
            </div>
            {moderationEvents.length === 0 ? (
              <p className="module-copy">暂无审核事件。敏感内容被标记后将显示在这里。</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Type</th><th>Content</th><th>User</th><th>Status</th><th>Time</th></tr>
                  </thead>
                  <tbody>
                    {moderationEvents.map((event) => (
                      <tr key={event.id}>
                        <td><span className="badge">{event.event_type}</span></td>
                        <td>{event.content_type} / {event.content_id.slice(0, 8)}...</td>
                        <td>{event.user_id.slice(0, 8)}...</td>
                        <td>
                          <span className={`badge ${event.status === "flagged" ? "badge-warn" : "badge-ok"}`}>
                            {event.status}
                          </span>
                        </td>
                        <td>{new Date(event.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {activeNav === "Assets" && (
          <section className="panel page-panel">
            <div className="panel-header">
              <div>
                <span>Expression Assets</span>
                <h2>用户表达资产查询</h2>
              </div>
            </div>
            <div className="form-grid" style={{ marginBottom: 16 }}>
              <label>
                用户 ID
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={assetLookupId}
                    placeholder="输入用户 UUID"
                    onChange={(e) => setAssetLookupId(e.target.value)}
                  />
                  <button
                    onClick={async () => {
                      if (!assetLookupId.trim()) return;
                      try {
                        setStatus("正在查询资产...");
                        const assets = await apiGet<UserAsset[]>(`/api/admin/users/${assetLookupId.trim()}/assets`, token);
                        setUserAssets(assets);
                        setStatus(`资产查询完成：${assets.length} 个。`);
                      } catch (err) {
                        setStatus(`查询失败：${errorMessage(err)}`);
                      }
                    }}
                  >
                    查询
                  </button>
                </div>
              </label>
            </div>
            {userAssets.length > 0 ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Title</th><th>Language</th><th>Version</th><th>Keywords</th><th>Created</th></tr>
                  </thead>
                  <tbody>
                    {userAssets.map((asset) => (
                      <tr key={asset.id}>
                        <td><strong>{asset.title}</strong></td>
                        <td>{asset.target_language}</td>
                        <td>v{asset.current_version}</td>
                        <td>{(asset.keywords ?? []).slice(0, 3).join(", ")}{(asset.keywords ?? []).length > 3 ? "..." : ""}</td>
                        <td>{new Date(asset.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="module-copy">{assetLookupId ? "该用户暂无表达资产。" : "输入用户 ID 后点击查询。"}</p>
            )}
          </section>
        )}

        {activeNav === "Gamification" && (
          <section className="panel page-panel">
            <div className="panel-header">
              <div>
                <span>Gamification</span>
                <h2>游戏化排行榜</h2>
              </div>
              <button onClick={async () => {
                try {
                  setStatus("正在刷新排行榜...");
                  const data = await apiGet<LeaderboardEntry[]>("/api/gamification/leaderboard", token);
                  setLeaderboard(data);
                  setStatus(`排行榜已刷新：${data.length} 人。`);
                } catch (err) { setStatus(`刷新失败：${errorMessage(err)}`); }
              }}>
                刷新
              </button>
            </div>
            {leaderboard.length === 0 ? (
              <p className="module-copy">暂无排行榜数据。用户获得 XP 后将显示在这里。</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>#</th><th>User</th><th>Level</th><th>XP</th><th>Streak</th></tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((entry, i) => (
                      <tr key={entry.user_id}>
                        <td>{i + 1}</td>
                        <td>{entry.username || entry.user_id.slice(0, 8) + "..."}</td>
                        <td><strong>Lv.{entry.current_level}</strong></td>
                        <td>{entry.total_xp.toLocaleString()}</td>
                        <td>{entry.current_streak_days} days</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        </div>
      </section>

      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map(t => (
            <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>
          ))}
        </div>
      )}
    </main>
  );
}

async function apiGet<T>(path: string, token: string): Promise<T> {
  return parseResponse<T>(
    await fetch(path, {
      headers: { Authorization: `Bearer ${token}` }
    })
  );
}

async function apiPost<T>(path: string, token: string, body: unknown): Promise<T> {
  return parseResponse<T>(
    await fetch(path, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    })
  );
}

async function apiPut<T>(path: string, token: string, body: unknown): Promise<T> {
  return parseResponse<T>(
    await fetch(path, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    })
  );
}

async function apiDelete(path: string, token: string): Promise<void> {
  const response = await fetch(path, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function normalizeForm(form: ProviderForm): Required<ProviderForm> {
  return {
    provider_name: form.provider_name,
    provider_type: form.provider_type,
    api_base_url: form.api_base_url,
    api_key: form.api_key ?? "",
    model_name: form.model_name,
    enabled: form.enabled ?? true,
    priority: form.priority ?? 100,
    cost_weight: form.cost_weight ?? 1,
    fallback_provider: form.fallback_provider ?? "",
    config: form.config ?? {}
  };
}

function lastTestLabel(provider: ProviderRead): string {
  const lastTest = provider.config?.last_test as TestResult | undefined;
  if (!lastTest) return provider.enabled ? "Enabled · 未测试" : "Disabled · 未测试";
  return `${lastTest.ok ? "Connected" : "Failed"} · ${lastTest.latency_ms}ms`;
}

function capabilityStatusLabel(status: string): string {
  switch (status) {
    case "ready":
      return "已就绪";
    case "mock":
      return "Mock 联调";
    case "key_invalid":
      return "Key 失效";
    case "missing":
      return "未接入";
    default:
      return status;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "未知错误";
}

function formatPrompt(promptStr: string | null): string {
  if (!promptStr) return "(无)";
  try {
    const parsed = JSON.parse(promptStr);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return promptStr;
  }
}

function statusBadge(status: string) {
  const normalized = status.toLowerCase();
  const cls =
    normalized === "active"
      ? "badge badge-success"
      : normalized === "expired" || normalized === "disabled"
        ? "badge badge-danger"
        : "badge badge-muted";
  return <span className={cls}>{status}</span>;
}

function membershipBadge(level: string) {
  const normalized = level.toLowerCase();
  const cls =
    normalized === "free"
      ? "badge badge-muted"
      : normalized === "vip"
        ? "badge badge-vip"
        : "badge badge-warning";
  return <span className={cls}>{level}</span>;
}


export default AdminApp;
