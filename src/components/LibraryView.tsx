import { useMemo, useState } from "react";
import { Play, Globe, Lock, Zap, MessageSquare } from "lucide-react";
import type { Session, Reel } from "@/lib/mock-data";

type Props = {
  sessions: Session[];
  onOpen: (id: string) => void;
  onUpdateReel: (sessionId: string, reel: Reel) => void;
};

type StatusFilter = "all" | "published" | "unpublished";
type OriginFilter = "all" | "prompt" | "autopilot";

function timeAgo(t: number) {
  const diff = Date.now() - t;
  const h = Math.floor(diff / 36e5);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

type FlatReel = { reel: Reel; sessionId: string; sessionTitle: string; createdAt: number };

export function LibraryView({ sessions, onOpen, onUpdateReel }: Props) {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [origin, setOrigin] = useState<OriginFilter>("all");

  const flatReels: FlatReel[] = useMemo(() => {
    const list: FlatReel[] = [];
    sessions.forEach((s) => {
      s.messages.forEach((m) => {
        if (m.role === "ai") {
          list.push({ reel: m.reel, sessionId: s.id, sessionTitle: s.title, createdAt: m.createdAt });
        }
      });
    });
    return list.sort((a, b) => b.createdAt - a.createdAt);
  }, [sessions]);

  const filtered = useMemo(() => {
    return flatReels.filter((f) => {
      if (status === "published" && !f.reel.published) return false;
      if (status === "unpublished" && f.reel.published) return false;
      const o = f.reel.origin ?? "prompt";
      if (origin !== "all" && o !== origin) return false;
      return true;
    });
  }, [flatReels, status, origin]);

  const togglePublish = (f: FlatReel) => {
    onUpdateReel(f.sessionId, { ...f.reel, published: !f.reel.published });
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-16 shrink-0 items-center border-b border-border px-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Library</h1>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {flatReels.length} reels · {flatReels.filter((f) => f.reel.published).length} published
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-6xl">
          {/* Filter bar */}
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <FilterGroup
              label="status"
              value={status}
              onChange={(v) => setStatus(v as StatusFilter)}
              options={[
                { v: "all", l: "All" },
                { v: "published", l: "Published" },
                { v: "unpublished", l: "Unpublished" },
              ]}
            />
            <div className="hidden h-6 w-px bg-border sm:block" />
            <FilterGroup
              label="origin"
              value={origin}
              onChange={(v) => setOrigin(v as OriginFilter)}
              options={[
                { v: "all", l: "All" },
                { v: "prompt", l: "From Prompt" },
                { v: "autopilot", l: "From Autopilot" },
              ]}
            />
            <div className="ml-auto font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {filtered.length} match
            </div>
          </div>

          {/* Reel grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((f) => {
              const r = f.reel;
              const o = r.origin ?? "prompt";
              return (
                <div
                  key={r.id}
                  className="card-hover fade-in group flex flex-col overflow-hidden rounded-xl border border-border bg-card"
                >
                  {/* Thumbnail */}
                  <button
                    onClick={() => onOpen(f.sessionId)}
                    className="relative aspect-video w-full overflow-hidden text-left"
                    style={{
                      background: `radial-gradient(circle at 30% 30%, oklch(0.45 0.18 ${r.thumbnailHue}) 0%, oklch(0.18 0.04 ${r.thumbnailHue + 20}) 60%, oklch(0.12 0.02 260) 100%)`,
                    }}
                  >
                    <div className="absolute inset-0 opacity-30 mix-blend-overlay shimmer" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/40 backdrop-blur-md transition-all group-hover:scale-110 group-hover:border-primary">
                        <Play className="h-4 w-4 translate-x-0.5 fill-white text-white" />
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2 rounded-md border border-white/10 bg-black/60 px-2 py-0.5 font-mono text-[10px] tracking-wider text-white/90 backdrop-blur">
                      {r.duration}
                    </div>
                    {/* Origin badge */}
                    <div className="absolute left-2 top-2">
                      {o === "autopilot" ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary backdrop-blur">
                          <Zap className="h-2.5 w-2.5" />
                          Autopilot
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-black/50 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-white/80 backdrop-blur">
                          <MessageSquare className="h-2.5 w-2.5" />
                          Prompt
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Body */}
                  <div className="flex flex-1 flex-col p-3">
                    <h3 className="line-clamp-1 text-sm font-medium">{r.title}</h3>
                    <div className="mt-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      <span>{timeAgo(f.createdAt)}</span>
                      <span className="h-1 w-1 rounded-full bg-border" />
                      <span className="truncate normal-case tracking-normal">{f.sessionTitle}</span>
                    </div>

                    {/* Publish toggle */}
                    <div className="mt-3 flex items-center justify-between">
                      <button
                        onClick={() => togglePublish(f)}
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[11px] transition-all ${
                          r.published
                            ? "border-primary/50 bg-primary/15 text-primary hover:bg-primary/25"
                            : "border-border bg-secondary/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        }`}
                      >
                        {r.published ? (
                          <>
                            <Globe className="h-3 w-3" />
                            Published
                          </>
                        ) : (
                          <>
                            <Lock className="h-3 w-3" />
                            Publish
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => onOpen(f.sessionId)}
                        className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
                      >
                        open →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="py-20 text-center font-mono text-sm text-muted-foreground">
              {flatReels.length === 0
                ? "no reels yet — head to Create to start one."
                : "no reels match these filters."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterGroup({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
        {options.map((o) => (
          <button
            key={o.v}
            onClick={() => onChange(o.v)}
            className={`rounded-md px-2.5 py-1 font-mono text-[11px] uppercase tracking-widest transition-all ${
              value === o.v
                ? "bg-primary text-primary-foreground shadow-[0_4px_20px_-4px_var(--glow)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {o.l}
          </button>
        ))}
      </div>
    </div>
  );
}
