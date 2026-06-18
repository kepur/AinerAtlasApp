import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest, type Asset } from "../api";

type AssetStatus = "Frozen" | "Draft" | "Collected";

type LibraryItem = {
  id: string;
  title: string;
  summary: string;
  status: AssetStatus;
  date: string;
  words: number;
  target: string;
};

const FILTERS = ["All", "Drafts", "Frozen", "Published"] as const;
type Filter = (typeof FILTERS)[number];


function toLibraryItem(asset: Asset): LibraryItem {
  const variants = Object.keys(asset.variants ?? {}).length;
  const words = asset.source_text ? asset.source_text.trim().split(/\s+/).filter(Boolean).length : 0;
  return {
    id: asset.id,
    title: asset.title,
    summary: asset.source_text?.slice(0, 160) ?? "",
    status: variants > 0 ? "Frozen" : "Draft",
    date: asset.created_at ? new Date(asset.created_at).toLocaleDateString() : "",
    words,
    target: asset.target_language?.toUpperCase() ?? "EN"
  };
}

const STATUS_STYLES: Record<AssetStatus, string> = {
  Frozen: "bg-tertiary-container/10 text-tertiary",
  Draft: "bg-surface-container-highest text-on-surface-variant",
  Collected: "bg-secondary-container/10 text-secondary"
};

export default function Assets() {
  const navigate = useNavigate();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");

  useEffect(() => {
    apiRequest<Asset[]>("/api/assets")
      .then((data) => setItems(data && data.length > 0 ? data.map(toLibraryItem) : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      const matchQuery = !query || it.title.toLowerCase().includes(query.toLowerCase());
      const matchFilter =
        filter === "All" ||
        (filter === "Drafts" && it.status === "Draft") ||
        (filter === "Frozen" && it.status === "Frozen") ||
        (filter === "Published" && it.status === "Collected");
      return matchQuery && matchFilter;
    });
  }, [items, query, filter]);

  const featured = filtered[0];
  const rest = filtered.slice(1);
  const isMock = (id: string) => id.startsWith("mock-");

  function open(item: LibraryItem) {
    if (isMock(item.id)) return;
    navigate(`/assets/${item.id}`);
  }

  return (
    <div className="premium min-h-full bg-surface text-on-surface">
      {/* Top App Bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-margin-mobile h-14 bg-surface/80 backdrop-blur-xl shadow-sm">
        <h1 className="font-headline-md text-headline-md font-bold text-primary">Asset Library</h1>
        <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-primary/10 transition-colors active:scale-95">
          <span className="material-symbols-outlined text-primary">more_vert</span>
        </button>
      </header>

      <main className="px-margin-mobile pb-8">
        {/* Search */}
        <section className="mt-6">
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">
              search
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-12 pl-12 pr-4 bg-surface-container-low rounded-xl focus:ring-2 focus:ring-primary/20 text-body-md placeholder:text-on-surface-variant/60 transition-all outline-none"
              placeholder="Search your thoughts..."
              type="text"
            />
          </div>
        </section>

        {/* Category Tabs */}
        <section className="mt-6 -mx-margin-mobile overflow-x-auto hide-scrollbar flex items-center px-margin-mobile gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={
                filter === f
                  ? "px-6 py-2 rounded-full bg-primary-container text-on-primary-container font-label-sm text-label-sm shadow-md transition-all active:scale-95 whitespace-nowrap"
                  : "px-6 py-2 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm hover:bg-primary/10 transition-all active:scale-95 whitespace-nowrap"
              }
            >
              {f}
            </button>
          ))}
        </section>

        {/* View Controls */}
        <section className="mt-8 flex justify-between items-center">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
            {loading ? "Loading…" : `${filtered.length} Thoughts Saved`}
          </span>
          <div className="flex gap-1 bg-surface-container-low p-1 rounded-lg">
            <button className="p-1.5 rounded-md bg-white shadow-sm text-primary">
              <span className="material-symbols-outlined text-[20px]">grid_view</span>
            </button>
            <button className="p-1.5 rounded-md text-on-surface-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[20px]">view_list</span>
            </button>
          </div>
        </section>

        {/* Asset Grid */}
        <div className="mt-6 grid grid-cols-1 gap-5">
          {featured && (
            <div
              onClick={() => open(featured)}
              className="asset-card-shadow bg-white rounded-2xl p-6 relative overflow-hidden group cursor-pointer active:scale-[0.98] transition-transform"
            >
              <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
              <div className="flex justify-between items-start mb-4">
                <span className={`px-3 py-1 rounded-full font-label-sm text-[10px] uppercase tracking-wider font-bold ${STATUS_STYLES[featured.status]}`}>
                  {featured.status}
                </span>
                <span className="font-label-sm text-[12px] text-on-surface-variant/60">{featured.date}</span>
              </div>
              <h3 className="font-headline-md text-headline-md text-on-surface mb-2 group-hover:text-primary transition-colors">{featured.title}</h3>
              {featured.summary && <p className="text-body-md text-on-surface-variant line-clamp-2 mb-6">{featured.summary}</p>}
              <div className="flex items-center justify-between">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-primary-fixed flex items-center justify-center text-[10px] font-bold text-primary">AI</div>
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-secondary-fixed flex items-center justify-center text-[10px] font-bold text-secondary">{featured.target}</div>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">arrow_forward_ios</span>
              </div>
            </div>
          )}

          {rest.map((item) => (
            <div
              key={item.id}
              onClick={() => open(item)}
              className="asset-card-shadow bg-white rounded-2xl p-5 relative group cursor-pointer active:scale-[0.98] transition-transform"
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-headline-md text-[18px] text-on-surface group-hover:text-primary transition-colors">{item.title}</h3>
                <span className={`px-2 py-0.5 rounded-md font-label-sm text-[10px] uppercase ${STATUS_STYLES[item.status]}`}>{item.status}</span>
              </div>
              <div className="flex items-center gap-4 text-on-surface-variant/60">
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                  <span className="text-[12px]">{item.date || "—"}</span>
                </div>
                {item.words > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">edit_note</span>
                    <span className="text-[12px]">{item.words >= 1000 ? `${(item.words / 1000).toFixed(1)}k` : item.words} words</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* AI Synthesis / Archive tiles */}
          <div className="grid grid-cols-2 gap-4">
            <div
              onClick={() => navigate("/thoughts")}
              className="asset-card-shadow bg-surface-container-low rounded-2xl p-4 flex flex-col justify-between h-32 active:scale-95 transition-transform cursor-pointer"
            >
              <span className="material-symbols-outlined text-primary text-[28px]">auto_awesome</span>
              <div>
                <h4 className="font-headline-md text-[14px] text-on-surface">AI Synthesis</h4>
                <span className="text-[10px] text-on-surface-variant">{items.length} New Insights</span>
              </div>
            </div>
            <div className="asset-card-shadow bg-white rounded-2xl p-4 flex flex-col justify-between h-32 active:scale-95 transition-transform cursor-pointer">
              <span className="material-symbols-outlined text-tertiary text-[28px]">folder_zip</span>
              <div>
                <h4 className="font-headline-md text-[14px] text-on-surface">Archive</h4>
                <span className="text-[10px] text-on-surface-variant">{items.length} Items</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Action Button */}
      <button
        onClick={() => navigate("/chat")}
        className="fixed bottom-[88px] left-1/2 translate-x-[135px] w-14 h-14 bg-primary text-on-primary rounded-full shadow-[0_8px_25px_rgba(99,14,212,0.4)] flex items-center justify-center active:scale-90 transition-transform z-50"
      >
        <span className="material-symbols-outlined text-[32px]">add</span>
      </button>
    </div>
  );
}
