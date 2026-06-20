import type { ReactNode } from "react";
import "./PresenceAvatar.css";

type PresenceAvatarProps = {
  name?: string;
  initial?: string;
  isOnline?: boolean;
  size?: "sm" | "md" | "lg";
  shape?: "circle" | "rounded";
  showDot?: boolean;
  offlineMuted?: boolean;
  className?: string;
  faceClassName?: string;
  children?: ReactNode;
};

export default function PresenceAvatar({
  name,
  initial,
  isOnline = false,
  size = "md",
  shape = "circle",
  showDot = true,
  offlineMuted = true,
  className = "",
  faceClassName = "",
  children,
}: PresenceAvatarProps) {
  const letter = (initial || name || "?").charAt(0).toUpperCase();
  const stateClass = isOnline ? "presence-avatar--online" : offlineMuted ? "presence-avatar--offline" : "";

  return (
    <div className={`presence-avatar presence-avatar--${size} presence-avatar--${shape} ${stateClass} ${className}`.trim()}>
      <div className={`presence-avatar__face ${faceClassName}`.trim()} aria-hidden={!!children}>
        {children ?? letter}
      </div>
      {showDot && (
        <span
          className={`presence-avatar__dot ${isOnline ? "presence-avatar__dot--online" : "presence-avatar__dot--offline"}`}
          aria-label={isOnline ? "在线" : "离线"}
          title={isOnline ? "在线" : "离线"}
        />
      )}
    </div>
  );
}
