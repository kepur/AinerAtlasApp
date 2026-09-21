import { useState } from "react";
export default function RecallAnswer({ busy, onSubmit }: {busy: boolean; onSubmit: (answer: string) => void}) {
  const [value, setValue] = useState("");
  return <form className="space-y-2" onSubmit={e => { e.preventDefault(); if (value.trim()) onSubmit(value.trim()); }}>
    <input aria-label="输入完整原文" placeholder="输入完整原文" value={value} onChange={e => setValue(e.target.value)} disabled={busy} className="w-full rounded-xl border border-outline/30 bg-surface p-3 text-sm" />
    <button disabled={busy || !value.trim()} className="w-full rounded-xl bg-primary text-white p-3 text-sm disabled:opacity-40">检查答案</button>
  </form>;
}
