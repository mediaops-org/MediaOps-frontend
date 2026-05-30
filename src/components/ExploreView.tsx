import { useEffect, useMemo, useState } from "react";
import { ReelCard } from "./ReelCard";
import { apiFetch } from "@/lib/api";
import type { Reel } from "@/lib/mock-data";

const filters = ["All", "Trending", "Recent"] as const;
type Filter = (typeof filters)[number];

export function ExploreView() {
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("All");
  const [tag, setTag] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await apiFetch("/api/reels?limit=50");
        if (res.ok) {
          const json = await res.json();
          // The backend wraps the response in a "data" field via an interceptor
          const items = json.data?.items || json.items || [];
          setReels(items);
        }
      } catch (err) {
        console.error("Failed to fetch explore reels:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    reels.forEach((r) => r.tags?.forEach((t) => s.add(t)));
    return Array.from(s);
  }, [reels]);

  const displayReels = useMemo(() => {
    let r = [...reels];
    if (filter === "Trending") {
      // Logic: show random selection or based on some heuristic
      // For now, let's just shuffle them slightly to feel "dynamic"
      r = [...r].sort((a, b) => (a.id > b.id ? 1 : -1)).reverse();
    }
    if (filter === "Recent") {
      // Backend already sorts by DESC, so we just take the top 8
      r = r.slice(0, 8);
    }
    if (tag) r = r.filter((x) => x.tags?.includes(tag));
    return r;
  }, [reels, filter, tag]);

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-16 shrink-0 items-center border-b border-border px-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Explore</h1>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            public reels from the community
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-7xl">
          {/* Filters */}
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
              {filters.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-md px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest transition-all ${
                    filter === f
                      ? "bg-primary text-primary-foreground shadow-[0_4px_20px_-4px_var(--glow)]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="ml-2 hidden h-6 w-px bg-border sm:block" />

            <div className="flex flex-wrap items-center gap-1.5">
              {allTags.map((t) => (
                <button
                  key={t}
                  onClick={() => setTag(tag === t ? null : t)}
                  className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest transition-all ${
                    tag === t
                      ? "border-primary/60 bg-primary/15 text-primary"
                      : "border-border bg-card/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  #{t}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <>
              {/* Grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {displayReels.map((r) => (
                  <div key={r.id} className="fade-in">
                    <ReelCard reel={r} showCreator />
                  </div>
                ))}
              </div>

              {displayReels.length === 0 && (
                <div className="py-20 text-center font-mono text-sm text-muted-foreground">
                  no reels found.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
