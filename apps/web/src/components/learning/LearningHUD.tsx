import { useState, type ReactNode } from "react";
import {
  Flame,
  GraduationCap,
  Lightbulb,
  Loader,
  MessageSquare,
  Sparkles,
  Volume2,
} from "lucide-react";
import type { ChatV2AgentItem, ChatV2PatternItem, ChatV2WhyItem } from "../../api";
import type { HudData } from "../../stores/chatStore";
import { CrushPatternRow } from "./CrushPatternRow";
import "./LearningHUD.css";

type Props = {
  hud: HudData;
  streamPhase?: "replying" | "analyzing" | null;
  speak: (text: string, lang?: string) => void;
  onTokenClick: (token: string, context: string) => void;
  className?: string;
  /** Caption above the cards, e.g. "本轮学习要点（实时）". */
  hintText?: string;
  /**
   * "scroll" is the horizontal card rail used by Chat and most games.
   * "split" is the two-column board Turtle Soup uses, where the expression sits
   * beside the grammar note instead of scrolling past it.
   */
  layout?: "scroll" | "split";
  /** Game progress (clues found, questions asked) rendered under the caption. */
  statsSlot?: ReactNode;
};

export function LearningHUD({
  hud,
  streamPhase = null,
  speak,
  onTokenClick,
  className = "",
  hintText,
  layout = "scroll",
  statsSlot,
}: Props) {
  const [variantTab, setVariantTab] = useState("natural_spoken");

  const caption = (hintText || statsSlot) && (
    <div className="hud-caption">
      {hintText && <span className="hud-caption-text">{hintText}</span>}
      {statsSlot}
    </div>
  );

  if (streamPhase === "analyzing") {
    return (
      <div className={`learning-hud ${className}`.trim()}>
        {caption}
        <div className="hud-status">
          <Loader size={14} className="spin hud-status-icon" />
          <span>AI 正在分析学习要点...</span>
        </div>
      </div>
    );
  }

  // An analysis the backend could not run must not render as blank cards.
  if (hud && (hud as Record<string, unknown>).analysis_status === "pending") {
    return (
      <div className={`learning-hud ${className}`.trim()}>
        {caption}
        <div className="hud-status">
          <Loader size={14} className="spin hud-status-icon" />
          <span>AI 正在分析学习要点...</span>
        </div>
      </div>
    );
  }

  // An analysis that could not run renders nothing rather than empty cards.
  if (hud && (hud as Record<string, unknown>).analysis_status === "failed") return null;

  if (!hud || !hud.main_expression) {
    if (streamPhase === "replying") return null;
    return (
      <div className={`learning-hud ${className}`.trim()}>
        <div className="hud-status hud-empty">
          <Sparkles size={14} className="hud-status-icon" />
          <span>发送消息后，学习要点会显示在这里</span>
        </div>
      </div>
    );
  }

  const variants: Record<string, string> = hud.variants || hud.expression_versions || {};
  const variantKeys = ["natural_spoken", "basic", "written", "advanced"].filter((k) => variants[k]);
  const mainExpr = variants[variantTab] || hud.main_expression;
  const whyItems: ChatV2WhyItem[] = Array.isArray(hud.why_this_expression) ? hud.why_this_expression : [];
  const vocab: string[] = Array.isArray(hud.vocabulary) ? hud.vocabulary : [];
  const patternsV2: ChatV2PatternItem[] = Array.isArray(hud.patterns_v2) ? hud.patterns_v2 : [];
  const agents: ChatV2AgentItem[] = Array.isArray(hud.agents) ? hud.agents : [];

  return (
    <div className={`learning-hud ${className}`.trim()}>
      {caption}
      <div className={layout === "split" ? "hud-split" : "hud-scroll"}>
        <div className="hud-card">
          <div className="hud-card-title">
            <Sparkles size={12} /> 自然表达
          </div>
          {variantKeys.length > 1 && (
            <div className="hud-variant-tabs">
              {variantKeys.map((k) => (
                <button
                  key={k}
                  className={`hud-variant-tab ${variantTab === k ? "active" : ""}`}
                  onClick={() => setVariantTab(k)}
                >
                  {k === "natural_spoken" ? "自然" : k === "basic" ? "口语" : k === "written" ? "书面" : "高级"}
                </button>
              ))}
            </div>
          )}
          <div className="hud-expression-rows">
            <div className="hud-expression-row">
              <p className="hud-expression-text">{mainExpr}</p>
              <button className="tts-btn" onClick={() => speak(mainExpr)}>
                <Volume2 size={16} />
              </button>
            </div>
          </div>
          {hud.meaning_native && <p className="hud-native">{hud.meaning_native}</p>}
        </div>

        {whyItems.length > 0 && (
          <div className="hud-card">
            <div className="hud-card-title">
              <Lightbulb size={12} /> 为什么这么写
            </div>
            <ul className="hud-why-list">
              {whyItems.map((item, i) => (
                <li key={i} onClick={() => onTokenClick(item.point, mainExpr)}>
                  <strong>{item.point}</strong> — {item.explanation}
                </li>
              ))}
            </ul>
          </div>
        )}

        {(vocab.length > 0 || patternsV2.length > 0) && (
          <div className="hud-card">
            <div className="hud-card-title">
              <GraduationCap size={12} /> 本句重点
            </div>
            <div className="hud-pills">
              {vocab.slice(0, 5).map((v, i) => (
                <span key={`v-${i}`} className="pill" onClick={() => onTokenClick(v, mainExpr)}>
                  {v}
                </span>
              ))}
              {patternsV2.map((p, i) => (
                <span
                  key={`p-${i}`}
                  className="pill pill-crush"
                  onClick={() => onTokenClick(p.pattern, p.example || mainExpr)}
                >
                  <Flame size={10} /> {p.pattern}
                </span>
              ))}
            </div>
          </div>
        )}

        {agents.length > 0 && (
          <div className="hud-card">
            <div className="hud-card-title">
              <MessageSquare size={12} /> 多智能体解析
            </div>
            <div className="hud-agents">
              {agents.map((a, i) => (
                <div key={i} className="hud-agent-row">
                  <span className="hud-agent-name">{a.agent}</span>
                  <span className="hud-agent-result">{a.result}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {patternsV2.length > 0 && (
          <div className="hud-card hud-card-crush">
            <div className="hud-card-title">
              <Flame size={12} /> 句型消消乐
            </div>
            {patternsV2.map((p, i) => (
              <CrushPatternRow key={i} pattern={p} speak={speak} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
