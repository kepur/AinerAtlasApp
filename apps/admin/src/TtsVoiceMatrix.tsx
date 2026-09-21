import { useEffect, useState } from "react";

type VoiceOption = { value: string; label: string; gender: string; locale?: string };
type LanguageRow = {
  language: string;
  name: string;
  native_name: string;
  default_female: string;
  default_male: string;
  rate: number;
  note: string;
};
type VoiceOptions = {
  provider: string;
  per_language: boolean;
  languages: LanguageRow[];
  voices: Record<string, VoiceOption[]>;
};

type Props = {
  provider: string;
  overrides: Record<string, Record<string, string>>;
  onChange: (next: Record<string, Record<string, string>>) => void;
  token: string;
};

/**
 * Per-language voice picker.
 *
 * Voices are namespaced by provider because each names them differently
 * ("ja-JP-KeitaNeural" vs "Cherry"), so switching provider never carries the
 * wrong names over. An empty pick means "use the built-in default for that
 * language", which is what most rows should stay at.
 */
export default function TtsVoiceMatrix({ provider, overrides, onChange, token }: Props) {
  const [options, setOptions] = useState<VoiceOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch(`/api/admin/tts/voice-options?provider=${encodeURIComponent(provider)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: VoiceOptions) => { if (!cancelled) setOptions(data); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "加载失败"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [provider, token]);

  const group = overrides[provider] || {};

  function setVoice(language: string, voice: string) {
    const nextGroup = { ...group };
    if (voice) nextGroup[language] = voice;
    else delete nextGroup[language];
    const next = { ...overrides };
    if (Object.keys(nextGroup).length) next[provider] = nextGroup;
    else delete next[provider];
    onChange(next);
  }

  /** Pin every language to its female (or male) default in one click. */
  function applyGender(gender: "female" | "male") {
    if (!options) return;
    const nextGroup: Record<string, string> = {};
    for (const row of options.languages) {
      nextGroup[row.language] = gender === "female" ? row.default_female : row.default_male;
    }
    onChange({ ...overrides, [provider]: nextGroup });
  }

  async function playSample(language: string, voice: string) {
    const samples: Record<string, string> = {
      zh: "你好，很高兴见到你。", en: "Hello, nice to meet you.",
      ja: "こんにちは、はじめまして。", ko: "안녕하세요, 반갑습니다.",
      sr: "Dobar dan, drago mi je.", es: "Hola, mucho gusto.",
      fr: "Bonjour, enchanté.", de: "Guten Tag, freut mich.",
      it: "Ciao, piacere.", pt: "Olá, prazer.",
      ru: "Здравствуйте, очень приятно.", ar: "مرحبا، تشرفنا.",
      hi: "नमस्ते, आपसे मिलकर खुशी हुई।", bn: "নমস্কার, আপনার সাথে দেখা হয়ে ভালো লাগল।",
    };
    setPreview(language);
    try {
      const resp = await fetch(`/api/voice/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: samples[language] || "Hello.", language, voice, speed: 0.9 }),
      });
      const data = await resp.json();
      const src = data.audio_url || (data.audio_base64 ? `data:audio/mpeg;base64,${data.audio_base64}` : "");
      if (src) await new Audio(src).play();
    } catch {
      /* preview is best-effort */
    } finally {
      setPreview("");
    }
  }

  if (loading) return <p style={{ fontSize: 12, color: "#94a3b8" }}>正在加载音色列表…</p>;
  if (error) return <p style={{ fontSize: 12, color: "#f87171" }}>音色列表加载失败：{error}</p>;
  if (!options) return null;

  if (!options.per_language) {
    return (
      <p style={{ fontSize: 12, color: "#94a3b8" }}>
        {provider} 的音色不区分语言，请在上方「默认音色」中选择。
      </p>
    );
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <strong style={{ fontSize: 13 }}>分语言音色（{provider}）</strong>
        <button type="button" onClick={() => applyGender("female")}>全部女声</button>
        <button type="button" onClick={() => applyGender("male")}>全部男声</button>
        <button type="button" onClick={() => { const n = { ...overrides }; delete n[provider]; onChange(n); }}>
          全部恢复默认
        </button>
      </div>
      <p style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8 }}>
        留空 = 使用该语言的内置默认音色。语速由各语言的内置修正系数决定，再乘上方的全局语速。
      </p>
      <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", color: "#94a3b8" }}>
            <th style={{ padding: "4px 6px" }}>语言</th>
            <th style={{ padding: "4px 6px" }}>音色</th>
            <th style={{ padding: "4px 6px" }}>语速</th>
            <th style={{ padding: "4px 6px" }}>试听</th>
          </tr>
        </thead>
        <tbody>
          {options.languages.map((row) => {
            const picked = group[row.language] || "";
            const voices = options.voices[row.language] || [];
            return (
              <tr key={row.language} style={{ borderTop: "1px solid rgba(148,163,184,0.15)" }}>
                <td style={{ padding: "4px 6px", whiteSpace: "nowrap" }}>
                  {row.native_name}
                  <span style={{ color: "#64748b", marginLeft: 4 }}>{row.language}</span>
                </td>
                <td style={{ padding: "4px 6px" }}>
                  <select
                    value={picked}
                    onChange={(e) => setVoice(row.language, e.target.value)}
                    style={{ width: "100%", maxWidth: 300 }}
                  >
                    <option value="">默认（{row.default_female.split("-").pop()?.replace("Neural", "")}·女）</option>
                    {voices.map((v) => (
                      <option key={v.value} value={v.value}>
                        {v.label} · {v.gender === "male" ? "男" : v.gender === "female" ? "女" : "—"} ({v.locale})
                      </option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: "4px 6px", color: "#94a3b8" }} title={row.note}>
                  ×{row.rate.toFixed(2)}
                </td>
                <td style={{ padding: "4px 6px" }}>
                  <button
                    type="button"
                    disabled={preview === row.language}
                    onClick={() => void playSample(row.language, picked)}
                  >
                    {preview === row.language ? "…" : "▶"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
