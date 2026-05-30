import { Play, Download, Share2 } from "lucide-react";
import type { Reel } from "@/lib/mock-data";
import ShadcnVideo from "./ShadcnVideo";
import { BASE } from "@/lib/api";

type Props = {
  reel: Reel;
  showCreator?: boolean;
  compact?: boolean;
};

export function ReelCard({ reel, showCreator, compact }: Props) {
  const thumbnailHue = typeof reel.thumbnailHue === 'string' ? parseInt(reel.thumbnailHue) : (reel.thumbnailHue ?? 220);
  const hue = Number.isFinite(thumbnailHue) ? thumbnailHue : 220;
  
  const creatorHue = reel.creator?.handle 
    ? (reel.creator.handle.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360) 
    : 200;

  const videoUrl = reel.videoUrl?.startsWith('http') 
    ? reel.videoUrl 
    : (reel.videoUrl ? `${BASE}/api/reels/${reel.id}/stream` : undefined);

  const hasPlayableVideo = Boolean(videoUrl);
  return (
    <div
      className="card-hover group relative overflow-hidden rounded-xl border border-border bg-card"
      style={{ background: "var(--gradient-card)" }}
    >
      {/* Video placeholder */}
      <div
        className="relative aspect-[9/16] w-full overflow-hidden"
        style={{
          background: `radial-gradient(circle at 30% 30%, oklch(0.45 0.18 ${hue}) 0%, oklch(0.18 0.04 ${hue + 20}) 60%, oklch(0.12 0.02 260) 100%)`,
        }}
      >
        {hasPlayableVideo && <ShadcnVideo src={videoUrl} poster={reel.thumbnailUrl ?? null} className="relative z-10" />}
        {!hasPlayableVideo && reel.thumbnailUrl && (
          <img
            className="absolute inset-0 h-full w-full object-cover opacity-90"
            src={reel.thumbnailUrl}
            alt={reel.title}
          />
        )}
        {/* Shimmer wash */}
        <div className="pointer-events-none absolute inset-0 opacity-40 mix-blend-overlay shimmer" />
        {/* Grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.08) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 rounded-md border border-white/10 bg-black/60 px-2 py-0.5 font-mono text-[10px] tracking-wider text-white/90 backdrop-blur">
          {reel.duration || "0:15"}
        </div>
      </div>

      {/* Body */}
      <div className={compact ? "p-3" : "p-4"}>
        <h3 className="line-clamp-1 text-sm font-medium text-foreground">{reel.title}</h3>

        {showCreator && reel.creator && (
          <div className="mt-2 flex items-center gap-2">
            {reel.creator.avatarUrl ? (
              <img src={reel.creator.avatarUrl} className="h-5 w-5 rounded-full ring-1 ring-border object-cover" alt={reel.creator.name} />
            ) : (
              <div
                className="h-5 w-5 rounded-full ring-1 ring-border"
                style={{ background: `linear-gradient(135deg, oklch(0.7 0.15 ${creatorHue}), oklch(0.4 0.12 ${creatorHue + 40}))` }}
              />
            )}
            <span className="font-mono text-[11px] text-muted-foreground">@{reel.creator.handle}</span>
          </div>
        )}

        {!compact && (
          <div className="mt-3 flex items-center gap-2">
            <button className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/60 px-2.5 py-1 font-mono text-[11px] text-foreground transition-colors hover:border-primary/40 hover:text-primary">
              <Download className="h-3 w-3" />
              {reel.videoUrl ? "Open video" : "Download"}
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
