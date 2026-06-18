export type Paginated<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

export type UserBrief = { id: string; email: string; username: string };

export const PAGE_SIZE = 20;

export async function apiGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, token: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export async function apiPut<T>(path: string, token: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export async function apiDelete<T>(path: string, token: string): Promise<T> {
  const res = await fetch(path, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export function fmtUser(u: UserBrief | undefined | null): string {
  if (!u) return "-";
  return u.username || u.email || u.id.slice(0, 8) + "…";
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("zh-CN", { hour12: false });
}
