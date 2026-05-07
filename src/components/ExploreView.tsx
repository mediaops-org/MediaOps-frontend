import { useMemo, useState } from "react";
import { ReelCard } from "./ReelCard";
import { exploreReels } from "@/lib/mock-data";

const filters = ["All", "Trending", "Recent"] as const;
type Filter = (typeof filters)[number];

export function ExploreView() {
  const [filter, setFilter] = useState<Filter>("All");
  const [tag, setTag] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    exploreReels.forEach((r) => r.tags?.forEach((t) => s.add(t)));
    return Array.from(s);
  }, []);

  const reels = useMemo(() => {
    let r = [...exploreReels];
    if (filter === "Trending") r = r.slice().reverse();
    if (filter === "Recent") r = r.slice(0, 6);
    if (tag) r = r.filter((x) => x.tags?.includes(tag));
    return r;
  }, [filter, tag]);

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

          {/* Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {reels.map((r) => (
              <div key={r.id} className="fade-in">
                <ReelCard reel={r} showCreator />
              </div>
            ))}
          </div>

          {reels.length === 0 && (
            <div className="py-20 text-center font-mono text-sm text-muted-foreground">
              no reels match this filter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
