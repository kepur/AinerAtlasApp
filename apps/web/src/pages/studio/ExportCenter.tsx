import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest, getToken } from "../../api";

type Thought = { id: string; title: string; status: string };

type ExportFormat = {
  key: string;
  label: string;
  ext: string;
  icon: string;
  desc: string;
};

const FORMATS: ExportFormat[] = [
  { key: "markdown", label: "Markdown", ext: "md", icon: "article", desc: "适合 Notion / Obsidian" },
  { key: "text", label: "纯文本", ext: "txt", icon: "text_snippet", desc: "纯 .txt 文件" },
  { key: "pdf", label: "PDF", ext: "pdf", icon: "picture_as_pdf", desc: "可直接打印或分享" },
  { key: "docx", label: "Word (.docx)", ext: "docx", icon: "description", desc: "Microsoft Word 格式" },
];

export default function ExportCenter() {
  const navigate = useNavigate();
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<Thought[]>("/api/thoughts")
      .then((data) => {
        setThoughts(data);
        if (data.length > 0) setSelected(data[0].id);
      })
      .catch(() => {});
  }, []);

  async function exportThought(fmt: ExportFormat) {
    if (!selected || exporting) return;
    setExporting(fmt.key);
    try {
      const token = getToken();
      const url = `/api/thoughts/${selected}/export?format=${fmt.key}`;
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${token ?? ""}` } });
      if (!resp.ok) throw new Error("export failed");
      const blob = await resp.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      const title = thoughts.find((t) => t.id === selected)?.title ?? "thought";
      a.download = `${title}.${fmt.ext}`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      /* silently ignore */
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="premium studio-layout">
      <aside className="studio-sidebar">
        <button className="back-link" onClick={() => navigate("/studio")}>← 返回</button>
        <h3>导出中心</h3>
        <p className="text-[12px] text-on-surface-variant mt-2">将思想资产导出为多种格式</p>
      </aside>

      <main className="studio-main space-y-6">
        <section>
          <h2 className="font-bold text-[18px] text-on-surface mb-4">选择思想资产</h2>
          {thoughts.length === 0 ? (
            <p className="text-[14px] text-on-surface-variant">暂无冻结的思想资产，先完成一次对话并 Freeze。</p>
          ) : (
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-[14px] text-on-surface outline-none focus:ring-2 focus:ring-primary/30"
            >
              {thoughts.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          )}
        </section>

        <section>
          <h2 className="font-bold text-[18px] text-on-surface mb-4">导出格式</h2>
          <div className="grid grid-cols-2 gap-3">
            {FORMATS.map((fmt) => (
              <button
                key={fmt.key}
                disabled={!selected || exporting !== null}
                onClick={() => void exportThought(fmt)}
                className="glass-card premium-shadow rounded-2xl p-4 text-left flex flex-col gap-2 active:scale-95 transition-all disabled:opacity-50 hover:border-primary/30 border border-transparent"
              >
                <div className="flex items-center gap-2">
                  {exporting === fmt.key ? (
                    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-[24px] text-primary">{fmt.icon}</span>
                  )}
                  <span className="font-bold text-[14px] text-on-surface">{fmt.label}</span>
                </div>
                <p className="text-[12px] text-on-surface-variant">{fmt.desc}</p>
                <span className="text-[11px] text-primary font-mono">.{fmt.ext}</span>
              </button>
            ))}
          </div>
        </section>
      </main>

      <aside className="studio-panel">
        <h4 className="font-bold text-[14px] text-on-surface mb-3">格式说明</h4>
        <ul className="space-y-2 text-[12px] text-on-surface-variant">
          <li><strong>Markdown</strong> — 包含标题、中英文版本、关键词、句型</li>
          <li><strong>纯文本</strong> — 简洁纯文字，无格式符号</li>
          <li><strong>PDF</strong> — 排版好的 A4 文档</li>
          <li><strong>DOCX</strong> — 可在 Word/WPS 中继续编辑</li>
        </ul>
      </aside>
    </div>
  );
}
