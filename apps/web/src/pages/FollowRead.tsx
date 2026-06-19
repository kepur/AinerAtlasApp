import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api";

type EvalResult = {
  fluency_score: number;
  accuracy_score: number;
  completeness_score: number;
  transcript: string;
  pronunciation_score?: number;
  feedback?: string;
};

const SAMPLE_SENTENCES = [
  { id: 1, text: "The quick brown fox jumps over the lazy dog.", topic: "经典练习" },
  { id: 2, text: "I believe that consistent practice leads to meaningful improvement over time.", topic: "语言表达" },
  { id: 3, text: "Could you recommend a good restaurant near the city center?", topic: "日常对话" },
  { id: 4, text: "Innovation distinguishes between a leader and a follower.", topic: "观点表达" },
  { id: 5, text: "What fascinates me most about language learning is discovering how culture shapes meaning.", topic: "深度表达" },
];

export default function FollowRead() {
  const navigate = useNavigate();
  const [sentenceIdx, setSentenceIdx] = useState(0);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<EvalResult | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const sentence = SAMPLE_SENTENCES[sentenceIdx];

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = () => void handleSubmit(stream);
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
      setResult(null);
    } catch {
      alert("无法访问麦克风，请检查权限设置");
    }
  }

  function stopRecording() {
    mediaRef.current?.stop();
    setRecording(false);
    setProcessing(true);
  }

  async function handleSubmit(stream: MediaStream) {
    try {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const base64 = await blobToBase64(blob);
      const res = await apiRequest<EvalResult>("/api/voice/evaluate", {
        method: "POST",
        body: JSON.stringify({ audio_base64: base64, reference_text: sentence.text }),
      });
      setResult(res);
    } catch {
      setResult({ fluency_score: 0, accuracy_score: 0, completeness_score: 0, transcript: "评估失败，请重试" });
    } finally {
      stream.getTracks().forEach((t) => t.stop());
      setProcessing(false);
    }
  }

  function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        resolve(dataUrl.split(",")[1] ?? "");
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function nextSentence() {
    setSentenceIdx((i) => (i + 1) % SAMPLE_SENTENCES.length);
    setResult(null);
  }

  const overallScore = result
    ? Math.round((result.fluency_score + result.accuracy_score + result.completeness_score) / 3)
    : 0;

  function scoreColor(s: number) {
    if (s >= 80) return "text-green-600";
    if (s >= 60) return "text-primary";
    return "text-error";
  }

  return (
    <div className="premium min-h-full bg-surface text-on-surface">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-primary/8 blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-white/20 px-margin-mobile h-touch-target-min flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="material-symbols-outlined text-primary">arrow_back</button>
        <div>
          <h1 className="font-bold text-[16px] text-on-surface">跟读练习</h1>
          <p className="text-[11px] text-on-surface-variant">朗读句子 · AI 评分</p>
        </div>
      </header>

      <main className="px-margin-mobile pt-6 pb-32 space-y-5">
        {/* Sentence card */}
        <section className="glass-card premium-shadow rounded-2xl p-6 text-center space-y-3">
          <span className="px-3 py-1 bg-primary/10 text-primary text-[11px] font-bold rounded-full">{sentence.topic}</span>
          <p className="font-bold text-[18px] text-on-surface leading-relaxed">{sentence.text}</p>
          <button
            onClick={nextSentence}
            className="flex items-center gap-1 text-[12px] text-on-surface-variant mx-auto active:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">shuffle</span>
            换一句
          </button>
        </section>

        {/* Recording control */}
        <section className="flex flex-col items-center gap-4 py-4">
          {!recording && !processing && !result && (
            <button
              onClick={() => void startRecording()}
              className="w-20 h-20 rounded-full bg-primary shadow-[0_8px_30px_rgba(99,14,212,0.3)] flex items-center justify-center text-white active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[36px]">mic</span>
            </button>
          )}
          {recording && (
            <button
              onClick={stopRecording}
              className="w-20 h-20 rounded-full bg-error shadow-[0_8px_30px_rgba(211,47,47,0.3)] flex items-center justify-center text-white active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[36px]">stop</span>
            </button>
          )}
          {processing && (
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}
          <p className="text-[13px] text-on-surface-variant">
            {recording ? "录音中... 点击停止" : processing ? "AI 分析中..." : result ? "再次朗读" : "点击开始朗读"}
          </p>
          {recording && (
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 bg-error rounded-full animate-pulse"
                  style={{ height: `${12 + Math.random() * 20}px`, animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
          )}
        </section>

        {/* Result card */}
        {result && (
          <section className="glass-card premium-shadow rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[16px] text-on-surface">评分结果</h3>
              <span className={`font-bold text-[28px] ${scoreColor(overallScore)}`}>{overallScore}</span>
            </div>

            {[
              { label: "流利度", val: result.fluency_score },
              { label: "准确度", val: result.accuracy_score },
              { label: "完整度", val: result.completeness_score },
            ].map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-[13px]">
                  <span className="text-on-surface-variant">{item.label}</span>
                  <span className={`font-bold ${scoreColor(Math.round(item.val))}`}>{Math.round(item.val)}</span>
                </div>
                <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-700"
                    style={{ width: `${item.val}%` }}
                  />
                </div>
              </div>
            ))}

            {result.transcript && (
              <div className="bg-surface-container-low rounded-xl p-3 border-l-4 border-primary/40">
                <p className="text-[11px] text-primary font-bold mb-1">识别文字</p>
                <p className="text-[13px] text-on-surface italic">"{result.transcript}"</p>
              </div>
            )}

            {result.feedback && (
              <p className="text-[12px] text-on-surface-variant bg-primary/5 rounded-lg px-3 py-2">
                {result.feedback}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => void startRecording()}
                className="flex-1 h-11 bg-primary text-white rounded-full text-[14px] font-bold active:scale-95 transition-all flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-[18px]">replay</span>
                再试一次
              </button>
              <button
                onClick={nextSentence}
                className="flex-1 h-11 bg-surface-container text-on-surface rounded-full text-[14px] font-bold active:scale-95 transition-all"
              >
                下一句
              </button>
            </div>
          </section>
        )}

        {/* Tips */}
        <section className="glass-card premium-shadow rounded-2xl p-4">
          <h4 className="font-bold text-[13px] text-on-surface mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">tips_and_updates</span>
            朗读建议
          </h4>
          <ul className="space-y-2 text-[12px] text-on-surface-variant">
            <li>• 保持语速均匀，不要过快或过慢</li>
            <li>• 注意单词重音和句子语调</li>
            <li>• 连读时保持自然流畅</li>
            <li>• 在安静环境中录音效果更好</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
