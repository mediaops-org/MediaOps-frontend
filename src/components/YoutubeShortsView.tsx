import { useEffect, useRef, useState } from "react";
import {
  YoutubeIcon,
  Play,
  Download,
  BookmarkPlus,
  RefreshCw,
  Plus,
  Trash2,
  AlertCircle,
  Clock,
} from "lucide-react";
import apiFetch from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Link } from "@tanstack/react-router";

const MOCK_MODE = import.meta.env.VITE_ENABLE_VIDEO_BACKEND !== "true";

export const DEFAULT_COUNT = 3;
export const DEFAULT_CLIP_DURATION = 15;
export const MAX_COUNT = 8;

type Mode = "split" | "teaser";
type StylePreset = "energetic" | "minimal" | "dramatic" | "chill";
type JobStatus = "queued" | "processing" | "completed" | "failed";

type GeneratedClip = {
  id: string;
  title: string;
  startSec: number;
  endSec: number;
  durationSec: number;
  thumbnailHue: number;
  downloadUrl?: string;
};

type Job = {
  jobId: string;
  estimatedSec: number;
  status: JobStatus;
  progress?: number;
  clips?: GeneratedClip[];
  error?: string;
};

type ManualTimestamp = {
  id: string;
  startSec: number | "";
  endSec: number | "";
};

function normalizeYouTubeUrl(raw: string): string | null {
  const s = raw.trim();
  const short = s.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (short) return `https://www.youtube.com/watch?v=${short[1]}`;
  const full = s.match(/youtube\.com\/(?:watch\?v=|shorts\/)([A-Za-z0-9_-]{11})/);
  if (full) return `https://www.youtube.com/watch?v=${full[1]}`;
  return null;
}

function fmtSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function jobStatusLabel(job: Job): string {
  switch (job.status) {
    case "queued":
      return "Queued";
    case "processing":
      return `Processing — ${job.progress ?? 0}%`;
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
  }
}

function mockClips(n: number): GeneratedClip[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `mock-${i}`,
    title: `Clip ${i + 1}`,
    startSec: i * 30,
    endSec: i * 30 + DEFAULT_CLIP_DURATION,
    durationSec: DEFAULT_CLIP_DURATION,
    thumbnailHue: (180 + i * 45) % 360,
  }));
}

export function YoutubeShortsView() {
  const { isAuthenticated, isLoading } = useAuth();

  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<Mode>("split");
  const [count, setCount] = useState(DEFAULT_COUNT);
  const [clipDurationSec, setClipDurationSec] = useState(DEFAULT_CLIP_DURATION);
  const [teaserDurationSec, setTeaserDurationSec] = useState(DEFAULT_CLIP_DURATION);
  const [autoHighlights, setAutoHighlights] = useState(true);
  const [stylePreset, setStylePreset] = useState<StylePreset | "">("");
  const [manualTimestamps, setManualTimestamps] = useState<ManualTimestamp[]>(() =>
    Array.from({ length: DEFAULT_COUNT }, (_, i) => ({ id: String(i), startSec: "", endSec: "" }))
  );

  const [job, setJob] = useState<Job | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [previewClip, setPreviewClip] = useState<GeneratedClip | null>(null);

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollJobIdRef = useRef<string | null>(null);
  const jobRef = useRef<Job | null>(null);

  // Keep jobRef in sync so the MOCK_MODE poller can read current state without stale closure
  useEffect(() => {
    jobRef.current = job;
  }, [job]);

  useEffect(
    () => () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    },
    []
  );

  function stopPolling() {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    pollTimerRef.current = null;
    pollJobIdRef.current = null;
  }

  function startPolling(jobId: string, delay = 2000) {
    stopPolling();
    pollJobIdRef.current = jobId;

    pollTimerRef.current = setTimeout(async () => {
      if (pollJobIdRef.current !== jobId) return;

      if (MOCK_MODE) {
        const current = jobRef.current;
        if (!current || current.jobId !== jobId) return;
        const progress = Math.min((current.progress ?? 0) + 30, 100);
        if (progress >= 100) {
          setJob({ ...current, status: "completed", progress: 100, clips: mockClips(current.estimatedSec) });
        } else {
          setJob({ ...current, status: "processing", progress });
          startPolling(jobId, Math.min(delay * 1.5, 10000));
        }
        return;
      }

      try {
        const res = await apiFetch(`/api/videos/jobs/${jobId}`);
        const data = await res.json();
        setJob((prev) => (prev ? { ...prev, ...data } : prev));
        if (data.status !== "completed" && data.status !== "failed") {
          startPolling(jobId, Math.min(delay * 1.5, 10000));
        }
      } catch {
        startPolling(jobId, Math.min(delay * 1.5, 10000));
      }
    }, delay);
  }

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};

    if (!normalizeYouTubeUrl(url)) {
      errs.url = "Enter a valid YouTube URL (youtube.com or youtu.be)";
    }

    if (mode === "split") {
      if (count < 1 || count > MAX_COUNT) {
        errs.count = `Count must be between 1 and ${MAX_COUNT}`;
      }
      if (clipDurationSec <= 0 || clipDurationSec > 600) {
        errs.clipDurationSec = "Clip duration must be between 1 and 600 seconds";
      }
      if (!autoHighlights) {
        manualTimestamps.forEach((ts, i) => {
          if (ts.startSec === "" || ts.endSec === "") {
            errs[`ts_${i}`] = "Fill in start and end";
          } else if ((ts.startSec as number) >= (ts.endSec as number)) {
            errs[`ts_${i}`] = "Start must be before end";
          }
        });
      }
    } else {
      if (teaserDurationSec <= 0 || teaserDurationSec > 300) {
        errs.teaserDurationSec = "Teaser duration must be between 1 and 300 seconds";
      }
    }

    return errs;
  }

  async function handleGenerate() {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const normalizedUrl = normalizeYouTubeUrl(url)!;
    setSubmitting(true);
    setJob(null);
    stopPolling();

    try {
      if (MOCK_MODE) {
        await new Promise((r) => setTimeout(r, 400));
        const mockJob: Job = {
          jobId: `mock-${Date.now()}`,
          estimatedSec: mode === "split" ? count * 5 : 10,
          status: "queued",
          progress: 0,
        };
        // Sync jobRef before polling so the first tick can read it
        jobRef.current = mockJob;
        setJob(mockJob);
        startPolling(mockJob.jobId);
        return;
      }

      const payload: Record<string, unknown> = {
        url: normalizedUrl,
        mode,
        autoHighlights,
        ...(stylePreset ? { stylePreset } : {}),
      };
      if (mode === "split") {
        payload.count = count;
        payload.clipDurationSec = clipDurationSec;
      } else {
        payload.teaserDurationSec = teaserDurationSec;
      }

      const res = await apiFetch("/api/videos/generate-clips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Request failed" }));
        setErrors({ submit: err.message || `Error ${res.status}` });
        return;
      }

      const { jobId, estimatedSec } = await res.json();
      setJob({ jobId, estimatedSec, status: "queued", progress: 0 });
      startPolling(jobId);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Network error";
      setErrors({ submit: msg });
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) return null;

  if (!isAuthenticated) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/30">
          <YoutubeIcon className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Sign in to generate Shorts</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Turn any YouTube video into bite-sized clips — sign in to get started.
        </p>
        <Button asChild className="mt-2">
          <Link to="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  const isProcessing = job != null && (job.status === "queued" || job.status === "processing");
  const showManualTimestamps = !autoHighlights && mode === "split";

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-6">
        <div className="flex items-center gap-3">
          <YoutubeIcon className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold tracking-tight">Generate Shorts from YouTube</span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {job?.status === "completed"
            ? `${job.clips?.length ?? 0} clips ready`
            : "youtube → shorts"}
        </span>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-3xl space-y-7">
          <p className="text-sm text-muted-foreground">
            Tip: paste a YouTube link and choose how many clips to create.
          </p>

          {/* URL */}
          <div className="space-y-2">
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              YouTube URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (errors.url) setErrors((p) => ({ ...p, url: "" }));
              }}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--glow)_15%,transparent)]"
            />
            {errors.url && (
              <p className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {errors.url}
              </p>
            )}
          </div>

          {/* Mode */}
          <div className="space-y-2">
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Mode
            </label>
            <div className="flex gap-2">
              {(["split", "teaser"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`rounded-lg border px-4 py-2 font-mono text-xs transition-all ${
                    mode === m
                      ? "border-primary/60 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {m === "split" ? "Split into reels" : "Generate teaser"}
                </button>
              ))}
            </div>
          </div>

          {/* Params */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {mode === "split" && (
              <div className="space-y-2">
                <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Number of clips (1–{MAX_COUNT})
                </label>
                <input
                  type="number"
                  min={1}
                  max={MAX_COUNT}
                  value={count}
                  onChange={(e) => {
                    setCount(Math.max(1, Math.min(MAX_COUNT, Number(e.target.value))));
                    if (errors.count) setErrors((p) => ({ ...p, count: "" }));
                  }}
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:border-primary/60 focus:outline-none"
                />
                {errors.count && (
                  <p className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {errors.count}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {mode === "split" ? "Clip duration (sec)" : "Teaser duration (sec)"}
              </label>
              <input
                type="number"
                min={1}
                value={mode === "split" ? clipDurationSec : teaserDurationSec}
                onChange={(e) => {
                  const v = Math.max(1, Number(e.target.value));
                  if (mode === "split") {
                    setClipDurationSec(v);
                    if (errors.clipDurationSec) setErrors((p) => ({ ...p, clipDurationSec: "" }));
                  } else {
                    setTeaserDurationSec(v);
                    if (errors.teaserDurationSec) setErrors((p) => ({ ...p, teaserDurationSec: "" }));
                  }
                }}
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:border-primary/60 focus:outline-none"
              />
              {(errors.clipDurationSec || errors.teaserDurationSec) && (
                <p className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {errors.clipDurationSec || errors.teaserDurationSec}
                </p>
              )}
            </div>
          </div>

          {/* Auto-highlights toggle */}
          <div className="flex items-center gap-3">
            <Switch
              id="auto-highlights"
              checked={autoHighlights}
              onCheckedChange={(v) => setAutoHighlights(v)}
            />
            <Label
              htmlFor="auto-highlights"
              className="cursor-pointer font-mono text-xs text-muted-foreground"
            >
              Auto-detect highlights
            </Label>
          </div>

          {/* Manual timestamps (shown when auto-highlights is off in split mode) */}
          {showManualTimestamps && (
            <div className="fade-in space-y-3">
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Manual timestamps
              </label>
              {manualTimestamps.map((ts, i) => (
                <div key={ts.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 shrink-0 text-right font-mono text-[10px] text-muted-foreground">
                      {i + 1}
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={ts.startSec}
                      onChange={(e) =>
                        setManualTimestamps((prev) =>
                          prev.map((t, j) => (j === i ? { ...t, startSec: Number(e.target.value) } : t))
                        )
                      }
                      placeholder="Start (s)"
                      className={`flex-1 rounded-lg border bg-card px-3 py-2 text-xs focus:border-primary/60 focus:outline-none ${
                        errors[`ts_${i}`] ? "border-destructive" : "border-border"
                      }`}
                    />
                    <span className="shrink-0 text-xs text-muted-foreground">→</span>
                    <input
                      type="number"
                      min={0}
                      value={ts.endSec}
                      onChange={(e) =>
                        setManualTimestamps((prev) =>
                          prev.map((t, j) => (j === i ? { ...t, endSec: Number(e.target.value) } : t))
                        )
                      }
                      placeholder="End (s)"
                      className={`flex-1 rounded-lg border bg-card px-3 py-2 text-xs focus:border-primary/60 focus:outline-none ${
                        errors[`ts_${i}`] ? "border-destructive" : "border-border"
                      }`}
                    />
                    <button
                      onClick={() => setManualTimestamps((prev) => prev.filter((_, j) => j !== i))}
                      disabled={manualTimestamps.length <= 1}
                      aria-label="Remove timestamp"
                      className="shrink-0 text-muted-foreground transition-colors hover:text-destructive disabled:opacity-30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {errors[`ts_${i}`] && (
                    <p className="ml-7 flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      {errors[`ts_${i}`]}
                    </p>
                  )}
                </div>
              ))}
              {manualTimestamps.length < MAX_COUNT && (
                <button
                  onClick={() =>
                    setManualTimestamps((prev) => [
                      ...prev,
                      { id: String(Date.now()), startSec: "", endSec: "" },
                    ])
                  }
                  className="ml-7 flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
                >
                  <Plus className="h-3 w-3" /> Add timestamp
                </button>
              )}
            </div>
          )}

          {/* Style preset */}
          <div className="space-y-2">
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Style preset{" "}
              <span className="font-normal normal-case text-muted-foreground/60">(optional)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {(["", "energetic", "minimal", "dramatic", "chill"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setStylePreset(p)}
                  className={`rounded-lg border px-3 py-1.5 font-mono text-[11px] capitalize transition-all ${
                    stylePreset === p
                      ? "border-primary/60 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {p === "" ? "None" : p}
                </button>
              ))}
            </div>
          </div>

          {/* Submit error */}
          {errors.submit && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="flex-1">{errors.submit}</span>
              <button
                onClick={() => setErrors((p) => ({ ...p, submit: "" }))}
                aria-label="Dismiss error"
                className="shrink-0 opacity-70 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          )}

          {/* Job status card */}
          {job && (
            <div
              className="fade-in space-y-3 rounded-xl border border-border bg-card p-4"
              aria-live="polite"
              aria-atomic="true"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      job.status === "queued"
                        ? "animate-pulse bg-amber-400"
                        : job.status === "processing"
                          ? "animate-pulse bg-primary shadow-[0_0_8px_var(--glow)]"
                          : job.status === "completed"
                            ? "bg-emerald-400"
                            : "bg-destructive"
                    }`}
                  />
                  <span className="font-mono text-xs font-medium text-foreground">
                    {jobStatusLabel(job)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                  <Clock className="h-3 w-3" />~{job.estimatedSec}s
                </div>
              </div>

              {job.status === "processing" && typeof job.progress === "number" && (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary shadow-[0_0_8px_var(--glow)] transition-all duration-500"
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
              )}

              {job.status === "failed" && (
                <div className="flex items-center gap-2">
                  <p className="flex-1 text-sm text-destructive">{job.error ?? "Generation failed."}</p>
                  <button
                    onClick={handleGenerate}
                    className="font-mono text-[10px] uppercase tracking-widest text-primary hover:underline"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Clips grid */}
          {job?.status === "completed" && job.clips && (
            <div className="fade-in space-y-4">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {job.clips.length} {job.clips.length === 1 ? "clip" : "clips"} ready
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {job.clips.map((clip) => (
                  <ClipCard
                    key={clip.id}
                    clip={clip}
                    onPlay={() => setPreviewClip(clip)}
                    onRegenerate={handleGenerate}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar with Generate button */}
      <div className="shrink-0 border-t border-border bg-background/60 px-6 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {mode === "split"
              ? `split · ${count} clips · ${clipDurationSec}s each`
              : `teaser · ${teaserDurationSec}s`}
          </span>
          <Button
            onClick={handleGenerate}
            disabled={submitting || isProcessing}
            className="px-8 font-mono text-xs uppercase tracking-widest"
          >
            {submitting || isProcessing ? (
              <span className="flex items-center gap-2">
                <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                Generating...
              </span>
            ) : (
              "Generate"
            )}
          </Button>
        </div>
      </div>

      {/* Clip preview modal */}
      <Dialog open={previewClip != null} onOpenChange={() => setPreviewClip(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">
              {previewClip?.title ?? "Preview"}
            </DialogTitle>
          </DialogHeader>
          {previewClip && (
            <div className="space-y-4">
              <div
                className="relative aspect-[9/16] w-full overflow-hidden rounded-lg"
                style={{
                  background: `radial-gradient(circle at 30% 30%, oklch(0.45 0.18 ${previewClip.thumbnailHue}) 0%, oklch(0.18 0.04 ${previewClip.thumbnailHue + 20}) 60%, oklch(0.12 0.02 260) 100%)`,
                }}
              >
                <div className="absolute inset-0 opacity-40 mix-blend-overlay shimmer" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-black/40 backdrop-blur-md">
                    <Play className="h-5 w-5 translate-x-0.5 fill-white text-white" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 rounded-xl bg-secondary/40 p-4 text-center font-mono text-[11px]">
                <div>
                  <div className="mb-0.5 text-muted-foreground">Start</div>
                  <div className="text-foreground">{fmtSec(previewClip.startSec)}</div>
                </div>
                <div>
                  <div className="mb-0.5 text-muted-foreground">End</div>
                  <div className="text-foreground">{fmtSec(previewClip.endSec)}</div>
                </div>
                <div>
                  <div className="mb-0.5 text-muted-foreground">Duration</div>
                  <div className="text-foreground">{previewClip.durationSec}s</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

type ClipCardProps = {
  clip: GeneratedClip;
  onPlay: () => void;
  onRegenerate: () => void;
};

function ClipCard({ clip, onPlay, onRegenerate }: ClipCardProps) {
  const hue = clip.thumbnailHue;
  return (
    <div
      className="card-hover group relative overflow-hidden rounded-xl border border-border bg-card"
      style={{ background: "var(--gradient-card)" }}
    >
      {/* Thumbnail */}
      <div
        className="relative aspect-[9/16] w-full overflow-hidden"
        style={{
          background: `radial-gradient(circle at 30% 30%, oklch(0.45 0.18 ${hue}) 0%, oklch(0.18 0.04 ${hue + 20}) 60%, oklch(0.12 0.02 260) 100%)`,
        }}
      >
        <div className="absolute inset-0 opacity-40 mix-blend-overlay shimmer" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.08) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={onPlay}
            aria-label="Play preview"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/40 backdrop-blur-md transition-all group-hover:scale-110 group-hover:border-primary group-hover:bg-primary/20"
          >
            <Play className="h-4 w-4 translate-x-0.5 fill-white text-white transition-colors group-hover:fill-primary group-hover:text-primary" />
          </button>
        </div>
        <div className="absolute bottom-2 right-2 rounded-md border border-white/10 bg-black/60 px-2 py-0.5 font-mono text-[10px] tracking-wider text-white/90 backdrop-blur">
          {clip.durationSec}s
        </div>
        <div className="absolute bottom-2 left-2 rounded-md border border-white/10 bg-black/60 px-2 py-0.5 font-mono text-[10px] tracking-wider text-white/70 backdrop-blur">
          {fmtSec(clip.startSec)} → {fmtSec(clip.endSec)}
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        <h3 className="line-clamp-1 text-sm font-medium text-foreground">{clip.title}</h3>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/60 px-2.5 py-1 font-mono text-[11px] text-foreground transition-colors hover:border-primary/40 hover:text-primary">
            <Download className="h-3 w-3" />
            Download
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/60 px-2.5 py-1 font-mono text-[11px] text-foreground transition-colors hover:border-primary/40 hover:text-primary">
            <BookmarkPlus className="h-3 w-3" />
            Add to Library
          </button>
          <button
            onClick={onRegenerate}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/60 px-2.5 py-1 font-mono text-[11px] text-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            <RefreshCw className="h-3 w-3" />
            Regenerate
          </button>
        </div>
      </div>
    </div>
  );
}
