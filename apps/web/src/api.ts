export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const TOKEN_KEY = "ainerspeak_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    clearToken();
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!response.ok) {
    const text = await response.text();
    let message = text || `Request failed: ${response.status}`;
    try {
      const parsed = JSON.parse(text) as { detail?: unknown };
      const detail = parsed.detail;
      if (typeof detail === "string") {
        message = detail;
      } else if (Array.isArray(detail)) {
        message = detail
          .map((item) => (typeof item === "object" && item && "msg" in item ? String(item.msg) : String(item)))
          .join("; ");
      }
    } catch {
      /* keep raw text */
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export type AuthUser = {
  id: string;
  email: string;
  username: string;
  role: string;
  membership_level: string;
  status: string;
  created_at: string;
};

export type AuthToken = {
  access_token: string;
  refresh_token?: string;
  token_type: "bearer";
  user: AuthUser;
};

export function resolveMediaUrl(path?: string | null): string {
  if (!path) return "";
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
}

export async function uploadProfileAvatar(file: File): Promise<Profile> {
  const form = new FormData();
  form.append("file", file);
  const token = getToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_BASE_URL}/api/profile/avatar`, {
    method: "POST",
    headers,
    body: form,
  });
  if (response.status === 401) {
    clearToken();
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Upload failed: ${response.status}`);
  }
  return response.json() as Promise<Profile>;
}

export type Profile = {
  id: string;
  user_id: string;
  native_language: string;
  target_languages: string[];
  primary_target_language: string;
  current_level: string;
  learning_goals: string[];
  favorite_topics: string[];
  correction_style: string;
  coach_style: string;
  explanation_language: string;
  ui_language: string;
  ui_theme: string;
  voice_preference: string;
  birthday?: string | null;
  avatar_url?: string;
  gender_identity?: string;
  gender_custom?: string;
  sexual_orientation?: string;
  orientation_custom?: string;
  lgbtq_visible?: boolean;
  speaking_confidence_score: number;
  writing_confidence_score: number;
  grammar_level_score: number;
  vocabulary_level_score: number;
  fluency_score: number;
};

export type GrammarTip = {
  pattern: string;
  explanation: string;
  importance: number;
};

export type MistakeItem = {
  type: string;
  original: string;
  corrected: string;
  explanation: string;
};

export type ChatV2WhyItem = {
  point: string;
  explanation: string;
};

export type ChatV2PatternItem = {
  pattern: string;
  example: string;
  add_to_crush: boolean;
};

export type ChatV2NextQuestion = {
  target: string;
  native: string;
};

export type ChatV2AgentItem = {
  agent: string;
  result: string;
};

export type TokenExplain = {
  token: string;
  meaning: string;
  usage: string;
  example: string;
  part_of_speech: string;
};

export type TtsSegment = {
  text: string;
  language: string;
  provider?: string;
  audio_url?: string;
  audio_base64?: string;
};

export async function addCrushCandidate(
  pattern: string,
  example = "",
  language_code = "en",
  item_type: "pattern" | "vocabulary" | "grammar" = "pattern"
): Promise<void> {
  await apiRequest("/api/grammar/candidate", {
    method: "POST",
    body: JSON.stringify({ pattern, example, language_code, item_type }),
  });
}

export async function explainToken(
  token: string,
  context = "",
  native_language = "zh",
  target_language = "en"
): Promise<TokenExplain> {
  return apiRequest<TokenExplain>("/api/vocabulary/explain", {
    method: "POST",
    body: JSON.stringify({ token, context, native_language, target_language }),
  });
}

export type TtsMixedResult = {
  audio_base64?: string;
  audio_mime?: string;
  segments: TtsSegment[];
};

export async function ttsMixed(text: string, speed = 0.95): Promise<TtsMixedResult> {
  return apiRequest<TtsMixedResult>("/api/voice/tts-mixed", {
    method: "POST",
    body: JSON.stringify({ text, speed }),
  });
}

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  content_language: string;
  translated_content: string;
  analysis: {
    v2?: boolean;
    // V2 fields
    input_language?: string;
    detected_intent?: string;
    main_expression?: string;
    meaning_native?: string;
    variants?: Record<string, string>;
    why_this_expression?: ChatV2WhyItem[];
    patterns_v2?: ChatV2PatternItem[];
    agents?: ChatV2AgentItem[];
    next_question?: ChatV2NextQuestion;
    conversational_reply?: string;
    // Legacy fields
    main_reply_native?: string;
    main_reply_target?: string;
    question?: string;
    challenge?: string;
    suggested_expression?: string;
    grammar_tips?: GrammarTip[];
    patterns?: string[];
    vocabulary?: string[];
    user_input_translated?: string;
    user_input_versions?: Record<string, string>;
    expression_versions?: Record<string, string>;
    corrected_sentence?: string;
    mistakes?: MistakeItem[];
  };
  expression_versions: Record<string, string>;
  created_at: string;
};

export type Conversation = {
  id: string;
  title: string;
  topic: string;
  mode: string;
  native_language: string;
  target_language: string;
  status: string;
  created_at: string;
  messages: Message[];
};

export type ConversationReply = {
  conversation: Conversation;
  user_message: Message;
  assistant_message: Message;
  learning_items_added: string[];
  llm_meta?: {
    provider?: string;
    model?: string;
    tokens_input?: number;
    tokens_output?: number;
    latency_ms?: number;
  } | null;
};

export type Asset = {
  id: string;
  title: string;
  source_text: string;
  target_language: string;
  variants: Record<string, string>;
  keywords: string[];
  patterns: string[];
  created_at: string;
};

export type MasteryItem = {
  id: string;
  item_type: string;
  item_id: string;
  title: string;
  language_code: string;
  mastery_score: number;
  status: string;
  priority: number;
  examples: string[];
};

export type PracticeResult = {
  item: MasteryItem;
  message: string;
};

export type Thought = {
  id: string;
  title: string;
  topic: string;
  summary: string;
  status: string;
  version: number;
  conversation_id: string | null;
  final_content_native?: string;
  final_content_target?: string;
  freeze_payload?: {
    keywords?: string[];
    core_patterns?: string[];
    grammar_structures?: string[];
    expression_versions?: Record<string, string>;
    golden_quote?: string;
    facts?: string[];
    values?: string[];
    arguments?: string[];
  };
  variants?: Record<string, string>;
  keywords?: string[];
  patterns?: string[];
  frozen_at: string | null;
  created_at: string;
};

export type VocabItem = {
  id: string;
  word: string;
  translation?: string;
  mastery_status: string;
  mastery_score: number;
  examples: string[];
  topic?: string;
};

export type UserStats = {
  conversation_count: number;
  asset_count: number;
  pattern_count: number;
  vocab_count: number;
  mastered_count: number;
};

export const VARIANT_LABELS: Record<string, string> = {
  native_full: "中文完整",
  basic: "基础",
  natural_spoken: "口语",
  advanced: "高级",
  written: "书面",
  vlog: "Vlog",
  interview: "面试",
  business: "商务",
  one_line: "金句",
  speech_30s: "30秒演讲",
  speech_1min: "1分钟演讲",
  speech_3min: "3分钟演讲",
  podcast: "播客",
  social_chat: "社交",
  golden_quote: "金句版",
};

export function variantLabel(key: string): string {
  return VARIANT_LABELS[key] ?? key.replace(/_/g, " ");
}

export function orderedVariantKeys(variants: Record<string, string>): string[] {
  const preferred = Object.keys(VARIANT_LABELS);
  const keys = Object.keys(variants);
  const sorted = preferred.filter((k) => keys.includes(k));
  const rest = keys.filter((k) => !preferred.includes(k));
  return [...sorted, ...rest];
}

export async function freezeConversation(
  conversationId: string,
  title?: string
): Promise<Asset> {
  return apiRequest<Asset>(`/api/conversations/${conversationId}/freeze`, {
    method: "POST",
    body: JSON.stringify({ title: title ?? null }),
  });
}

export async function fetchThoughts(): Promise<Thought[]> {
  try {
    return await apiRequest<Thought[]>("/api/thoughts");
  } catch {
    const assets = await apiRequest<Asset[]>("/api/assets");
    return assets.map((asset) => ({
      id: asset.id,
      title: asset.title,
      topic: "",
      summary: asset.source_text.slice(0, 120),
      status: "frozen",
      version: 1,
      conversation_id: null,
      variants: asset.variants,
      keywords: asset.keywords,
      patterns: asset.patterns,
      frozen_at: asset.created_at,
      created_at: asset.created_at,
    }));
  }
}

export async function fetchThought(id: string): Promise<Thought> {
  try {
    return await apiRequest<Thought>(`/api/thoughts/${id}`);
  } catch {
    const asset = await apiRequest<Asset>(`/api/assets/${id}`);
    return {
      id: asset.id,
      title: asset.title,
      topic: "",
      summary: asset.source_text.slice(0, 120),
      status: "frozen",
      version: 1,
      conversation_id: null,
      final_content_native: asset.source_text,
      variants: asset.variants,
      keywords: asset.keywords,
      patterns: asset.patterns,
      frozen_at: asset.created_at,
      created_at: asset.created_at,
    };
  }
}

const MOCK_VOCAB: VocabItem[] = [
  {
    id: "mock-v1",
    word: "stability",
    translation: "稳定性",
    mastery_status: "seen",
    mastery_score: 35,
    examples: ["Long-term stability matters more than short-term gain."],
    topic: "life choices",
  },
  {
    id: "mock-v2",
    word: "trade-off",
    translation: "权衡 / 取舍",
    mastery_status: "understood",
    mastery_score: 55,
    examples: ["Every decision involves a trade-off."],
    topic: "decision making",
  },
  {
    id: "mock-v3",
    word: "perspective",
    translation: "视角 / 观点",
    mastery_status: "usable",
    mastery_score: 72,
    examples: ["From my perspective, this is a long-term value."],
    topic: "expression",
  },
];

function masteryToVocab(item: MasteryItem): VocabItem {
  const examples = item.examples || [];
  return {
    id: item.id,
    word: item.title,
    translation: examples[1] ?? "",
    mastery_status: item.status,
    mastery_score: item.mastery_score,
    examples: examples.slice(0, 2),
  };
}

export async function fetchVocabulary(): Promise<VocabItem[]> {
  try {
    return await apiRequest<VocabItem[]>("/api/vocabulary/today");
  } catch {
    try {
      const queue = await apiRequest<MasteryItem[]>("/api/grammar/queue");
      const vocab = queue.filter((q) => q.item_type === "vocabulary").map(masteryToVocab);
      if (vocab.length > 0) return vocab;
    } catch { /* ignore */ }
    return MOCK_VOCAB;
  }
}

export async function practiceVocabulary(id: string): Promise<PracticeResult | VocabItem> {
  try {
    return await apiRequest(`/api/vocabulary/${id}/practice`, { method: "POST" });
  } catch {
    return apiRequest<PracticeResult>(`/api/grammar/${id}/practice`, { method: "POST" });
  }
}

export async function markVocabMastered(id: string): Promise<PracticeResult | VocabItem> {
  try {
    return await apiRequest(`/api/vocabulary/${id}/mark-mastered`, { method: "POST" });
  } catch {
    return apiRequest<PracticeResult>(`/api/grammar/${id}/mark-mastered`, { method: "POST" });
  }
}

export async function ignoreVocabulary(id: string): Promise<PracticeResult | VocabItem> {
  try {
    return await apiRequest(`/api/vocabulary/${id}/ignore`, { method: "POST" });
  } catch {
    return apiRequest<PracticeResult>(`/api/grammar/${id}/ignore`, { method: "POST" });
  }
}

export async function fetchUserStats(): Promise<UserStats> {
  const [conversations, assets, queue, mastery] = await Promise.all([
    apiRequest<Conversation[]>("/api/conversations").catch(() => [] as Conversation[]),
    apiRequest<Asset[]>("/api/assets").catch(() => [] as Asset[]),
    apiRequest<MasteryItem[]>("/api/grammar/queue").catch(() => [] as MasteryItem[]),
    apiRequest<MasteryItem[]>("/api/grammar/mastery").catch(() => [] as MasteryItem[]),
  ]);
  const vocabItems = queue.filter((q) => q.item_type === "vocabulary");
  const patternItems = queue.filter((q) => q.item_type === "pattern");
  const mastered = mastery.filter((m) => m.status === "mastered").length;
  return {
    conversation_count: conversations.length,
    asset_count: assets.length,
    pattern_count: patternItems.length,
    vocab_count: vocabItems.length,
    mastered_count: mastered,
  };
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  return apiRequest("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
}

export async function resetPassword(token: string, new_password: string): Promise<{ message: string }> {
  return apiRequest("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ token, new_password }) });
}

export async function explainWord(
  assetId: string,
  word: string,
  sentence: string,
  language = "en"
): Promise<Record<string, unknown>> {
  return apiRequest(`/api/assets/${assetId}/explain-word`, {
    method: "POST",
    body: JSON.stringify({ word, sentence, language }),
  });
}

export async function explainSentence(
  assetId: string,
  sentence: string,
  language = "en"
): Promise<Record<string, unknown>> {
  return apiRequest(`/api/assets/${assetId}/explain-sentence`, {
    method: "POST",
    body: JSON.stringify({ sentence, language }),
  });
}

export async function generateSimilar(
  assetId: string,
  sentence: string,
  count = 3,
  language = "en"
): Promise<Record<string, unknown>> {
  return apiRequest(`/api/assets/${assetId}/generate-similar`, {
    method: "POST",
    body: JSON.stringify({ sentence, count, language }),
  });
}

export async function generateOpposite(
  assetId: string,
  sentence: string,
  language = "en"
): Promise<Record<string, unknown>> {
  return apiRequest(`/api/assets/${assetId}/generate-opposite`, {
    method: "POST",
    body: JSON.stringify({ sentence, language }),
  });
}
