type PaginationProps = {
  total: number;
  offset: number;
  pageSize: number;
  onPage: (offset: number) => void;
};

export function PaginationBar({ total, offset, pageSize, onPage }: PaginationProps) {
  const page = Math.floor(offset / pageSize) + 1;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;
  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);
  return (
    <div className="button-row" style={{ marginTop: 16, justifyContent: "center", flexWrap: "wrap", gap: 8 }}>
      <button className="preset" disabled={page <= 1} onClick={() => onPage((page - 2) * pageSize)}>
        上一页
      </button>
      {pages.map((p) => (
        <button
          key={p}
          className={page === p ? "preset active" : "preset"}
          onClick={() => onPage((p - 1) * pageSize)}
        >
          {p}
        </button>
      ))}
      <button className="preset" disabled={page >= totalPages} onClick={() => onPage(page * pageSize)}>
        下一页
      </button>
      <span style={{ opacity: 0.7, fontSize: "0.85rem" }}>
        共 {total} 条 · 第 {page}/{totalPages} 页
      </span>
    </div>
  );
}
