import type { Profile } from "../api";

export type DailyResonanceContent = {
  quoteTarget: string;
  quoteNative: string;
  promptTarget: string;
  promptNative: string;
  targetLabel: string;
  nativeLabel: string;
};

const LANG_LABELS: Record<string, string> = {
  zh: "中文",
  en: "English",
  ja: "日本語",
  ko: "한국어",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
};

const QUOTE_BY_LANG: Record<string, string> = {
  en: "The art of silence is as expressive as the choice of words.",
  zh: "沉默的艺术，与措辞的选择同样富有表现力。",
  ja: "沈黙の芸術は、言葉の選択と同じくらい豊かに意味を伝える。",
  ko: "침묵의 예술은 말의 선택만큼이나 풍부하게 의미를 전달한다.",
  fr: "L'art du silence est aussi expressif que le choix des mots.",
  de: "Die Kunst der Stille ist so ausdrucksstark wie die Wahl der Worte.",
  es: "El arte del silencio es tan expresivo como la elección de las palabras.",
};

const PROMPT_BY_LANG: Record<string, string> = {
  en: "How would you translate today's sentiment into your target language's formal register?",
  zh: "尝试用目标语言的正式语体，表达今日金句所蕴含的情感。",
  ja: "今日の一文を、学習中の言語のフォーマルな文体でどう表現しますか？",
  ko: "오늘의 문장을 목표 언어의 격식 있는 문체로 어떻게 표현하시겠어요?",
  fr: "Comment traduiriez-vous le sentiment du jour dans un registre formel de votre langue cible ?",
  de: "Wie würden Sie die heutige Sentiment in der formalen Register Ihrer Zielsprache ausdrücken?",
  es: "¿Cómo expresarías el sentimiento de hoy en el registro formal de tu lengua meta?",
};

function langLabel(code: string): string {
  return LANG_LABELS[code] || code.toUpperCase();
}

function textForLang(map: Record<string, string>, code: string, fallback: string): string {
  return map[code] || map[fallback] || Object.values(map)[0];
}

/** Bilingual Daily Resonance copy from user profile languages. */
export function buildDailyResonance(profile: Profile | null): DailyResonanceContent {
  const native = profile?.native_language || "zh";
  const target =
    profile?.primary_target_language || profile?.target_languages?.[0] || "en";

  return {
    quoteTarget: textForLang(QUOTE_BY_LANG, target, "en"),
    quoteNative: textForLang(QUOTE_BY_LANG, native, "zh"),
    promptTarget: textForLang(PROMPT_BY_LANG, target, "en"),
    promptNative: textForLang(PROMPT_BY_LANG, native, "zh"),
    targetLabel: langLabel(target),
    nativeLabel: langLabel(native),
  };
}
