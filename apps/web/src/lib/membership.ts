import type { AuthUser } from "../api";

const VOICE_LEVELS = new Set(["vip", "pro"]);

const LEGACY_ALIASES: Record<string, string> = {
  premium: "pro",
  business: "pro",
  super_vip: "pro",
};

export function normalizeMembershipLevel(level: string | null | undefined): string {
  const normalized = (level || "free").toLowerCase();
  return LEGACY_ALIASES[normalized] ?? normalized;
}

export function hasVoiceCoachAccess(user: Pick<AuthUser, "membership_level" | "role" | "status"> | null | undefined): boolean {
  if (!user) return false;
  if (user.status === "disabled" || user.status === "expired") return false;
  if (user.role === "admin" || user.role === "super_admin") return true;
  const level = normalizeMembershipLevel(user.membership_level);
  return VOICE_LEVELS.has(level);
}

export function membershipDisplayName(level: string | null | undefined): string {
  const normalized = normalizeMembershipLevel(level);
  if (normalized === "free") return "普通用户";
  if (normalized === "vip") return "VIP";
  if (normalized === "pro") return "Pro";
  return normalized.toUpperCase();
}
