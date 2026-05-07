import { Play, Download, Share2 } from "lucide-react";
import type { Reel } from "@/lib/mock-data";

type Props = {
  reel: Reel;
  showCreator?: boolean;
  compact?: boolean;
};

export function ReelCard({ reel, showCreator, compact }: Props) {
  const hue = reel.thumbnailHue;
  return (
    <div
      className="card-hover group relative overflow-hidden rounded-xl border border-border bg-card"
      style={{ background: "var(--gradient-card)" }}
    >
      {/* Video placeholder */}
      <div
        className="relative aspect-video w-full overflow-hidden"
        style={{
          background: `radial-gradient(circle at 30% 30%, oklch(0.45 0.18 ${hue}) 0%, oklch(0.18 0.04 ${hue + 20}) 60%, oklch(0.12 0.02 260) 100%)`,
        }}
      >
        {/* Shimmer wash */}
        <div className="absolute inset-0 opacity-40 mix-blend-overlay shimmer" />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.08) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-black/40 backdrop-blur-md transition-all group-hover:scale-110 group-hover:border-primary group-hover:bg-primary/20"
            aria-label="Play preview"
          >
            <Play className="h-5 w-5 translate-x-0.5 fill-white text-white transition-colors group-hover:fill-primary group-hover:text-primary" />
          </button>
        </div>
        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 rounded-md border border-white/10 bg-black/60 px-2 py-0.5 font-mono text-[10px] tracking-wider text-white/90 backdrop-blur">
          {reel.duration}
        </div>
      </div>

      {/* Body */}
      <div className={compact ? "p-3" : "p-4"}>
        <h3 className="line-clamp-1 text-sm font-medium text-foreground">{reel.title}</h3>

        {showCreator && reel.creator && (
          <div className="mt-2 flex items-center gap-2">
            <div
              className="h-5 w-5 rounded-full ring-1 ring-border"
              style={{ background: `linear-gradient(135deg, oklch(0.7 0.15 ${reel.creator.avatarHue}), oklch(0.4 0.12 ${reel.creator.avatarHue + 40}))` }}
            />
            <span className="font-mono text-[11px] text-muted-foreground">@{reel.creator.handle}</span>
          </div>
        )}

        {!compact && (
          <div className="mt-3 flex items-center gap-2">
            <button className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/60 px-2.5 py-1 font-mono text-[11px] text-foreground transition-colors hover:border-primary/40 hover:text-primary">
              <Download className="h-3 w-3" />
              Download
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/60 px-2.5 py-1 font-mono text-[11px] text-foreground transition-colors hover:border-primary/40 hover:text-primary">
              <Share2 className="h-3 w-3" />
              Share
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
