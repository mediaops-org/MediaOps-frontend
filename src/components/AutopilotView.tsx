import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Activity, Calendar, Check, ChevronRight, Clock3, Loader2, Lock, Pause, Play, Plus, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useUpgradeModal } from "@/components/UpgradeModal";
import apiFetch, { BASE } from "@/lib/api";

const PRESET_TOPICS = ["Tech", "News", "Sport", "Fashion", "Food"] as const;

interface PlannerJobRecord {
  id: string;
  kind?: string;
  status?: string;
  serviceName?: string;
  plannerJobId?: string | null;
  serviceJobId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  nextRunAt?: string | null;
  artifactPath?: string | null;
  artifactPaths?: string[];
  videoUrl?: string | null;
  workerCompletionMetadata?: Record<string, unknown>;
  plannerJobMetadata?: Record<string, unknown>;
  requestPayload?: {
    topics?: string[];
    sources?: string;
    top?: number;
    rank?: boolean;
    use_cache?: boolean;
    save?: boolean;
    output_dir?: string;
    execute_worker?: boolean;
    worker_url?: string;
    schedule_cron?: string;
  };
  responsePayload?: Record<string, unknown>;
  errorMessage?: string | null;
  isEnabled?: boolean;
}

function normalizeJobs(payload: any): PlannerJobRecord[] {
  const raw = payload?.data ?? payload ?? [];
  return Array.isArray(raw) ? raw : [];
}

function getJobTitle(job: PlannerJobRecord) {
  const topics = job.requestPayload?.topics?.filter(Boolean) ?? [];
  if (topics.length > 0) return topics.join(", ");
  return job.plannerJobId || job.serviceJobId || job.id;
}

function readStringFromRecord(record: Record<string, unknown> | undefined, keys: string[]): string | null {
  if (!record) return null;

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested: string | null = readStringFromRecord(value as Record<string, unknown>, keys);
      if (nested) return nested;
    }
  }

  return null;
}

function getJobArtifactSource(job: PlannerJobRecord) {
  const nestedMetadata = job.workerCompletionMetadata ?? job.plannerJobMetadata;
  return (
    job.artifactPath?.trim() ||
    job.artifactPaths?.find((value) => Boolean(value?.trim()))?.trim() ||
    job.videoUrl?.trim() ||
    readStringFromRecord(job.responsePayload, [
      "artifactPath",
      "artifact_path",
      "videoUrl",
      "video_url",
      "downloadUrl",
      "download_url",
      "final_video_path",
      "captioned_video_path",
      "planner_job_metadata",
    ]) ||
    readStringFromRecord(nestedMetadata, [
      "artifactPath",
      "artifact_path",
      "videoUrl",
      "video_url",
      "downloadUrl",
      "download_url",
      "final_video_path",
      "captioned_video_path",
    ]) ||
    null
  );
}

function getAllJobVideos(job: PlannerJobRecord): string[] {
  const response = job.responsePayload ?? {};
  const plannerMetadata = (response.planner_job_metadata as Record<string, unknown> | undefined) ?? job.plannerJobMetadata ?? {};
  
  const rawPaths = [
    ...(job.artifactPaths || []),
    job.artifactPath,
    job.videoUrl,
    String(plannerMetadata.artifactPath ?? plannerMetadata.artifact_path ?? ""),
    String(plannerMetadata.final_video_path ?? ""),
    String(plannerMetadata.captioned_video_path ?? ""),
    String(plannerMetadata.videoUrl ?? plannerMetadata.video_url ?? ""),
    String(response.videoUrl ?? response.video_url ?? ""),
    String(response.artifactPath ?? response.artifact_path ?? ""),
  ].filter(Boolean) as string[];

  // Deduplicate and normalize
  const unique = Array.from(new Set(rawPaths.map(p => p.trim()))).filter(Boolean);

  return unique.map(path => {
    if (path.startsWith("http") || path.startsWith("/api/")) return path;
    // Local path needs streaming
    return `${BASE}/api/generation/jobs/${job.id}/stream?path=${encodeURIComponent(path)}`;
  });
}

function getJobVideoSource(job: PlannerJobRecord) {
  const videos = getAllJobVideos(job);
  return videos.length > 0 ? videos[0] : null;
}

function isPlayableUrl(value: string) {
  return /^https?:\/\//i.test(value) || value.startsWith("/");
}


function formatDate(value?: string) {
  if (!value) return "just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "just now";
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function AutopilotView() {
  const { isProUser } = useAuth();
  const { open: openUpgrade } = useUpgradeModal();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<PlannerJobRecord[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [topicsText, setTopicsText] = useState("Tech, News");
  const [top, setTop] = useState(5);
  const [rank, setRank] = useState(true);
  const [useCache, setUseCache] = useState(true);
  const [scheduleType, setScheduleType] = useState<"daily" | "weekly" | "monthly" | "custom">("daily");
  const [timeOfDay, setTimeOfDay] = useState("09:00");
  const [weeklyDay, setWeeklyDay] = useState<number>(1); // 0=Sun,1=Mon...
  const [monthlyDay, setMonthlyDay] = useState<number>(1);
  const [customCron, setCustomCron] = useState("0 9 * * *");

  const activeJobs = useMemo(() => jobs.filter((job) => job.status !== "failed"), [jobs]);

  const schedulePreview = useMemo(() => {
    const [hhStr, mmStr] = (timeOfDay || "09:00").split(":");
    const hh = Number(hhStr || 9) || 9;
    const mm = Number(mmStr || 0) || 0;
    const timeStr = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    if (scheduleType === "custom") return `Custom cron: ${customCron}`;
    if (scheduleType === "daily") return `Every day at ${timeStr} (cron: ${mm} ${hh} * * *)`;
    if (scheduleType === "weekly") return `Every ${days[weeklyDay]} at ${timeStr} (cron: ${mm} ${hh} * * ${weeklyDay})`;
    if (scheduleType === "monthly") return `Every month on day ${monthlyDay} at ${timeStr} (cron: ${mm} ${hh} ${monthlyDay} * *)`;
    return "";
  }, [scheduleType, timeOfDay, weeklyDay, monthlyDay, customCron]);

  const fetchJobs = async () => {
    try {
      const response = await apiFetch("/api/generation/jobs?kind=planner");
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || `Failed to load planner jobs (${response.status})`);
      }
      const body = await response.json();
      setJobs(normalizeJobs(body));
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "Failed to load planner jobs";
      setError(message);
    }
  };

  useEffect(() => {
    let mounted = true;
    void (async () => {
      setLoading(true);
      await fetchJobs();
      if (mounted) setLoading(false);
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      await fetchJobs();
    } finally {
      setRefreshing(false);
    }
  };

  const toggleJob = async (id: string) => {
    try {
      const response = await apiFetch(`/api/generation/jobs/${id}/toggle`, {
        method: "PATCH",
      });
      if (!response.ok) throw new Error("Failed to toggle job");
      await fetchJobs();
    } catch (err: any) {
      setError(err.message || "Failed to toggle job");
    }
  };

  const deleteJob = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this planned job?")) return;
    try {
      const response = await apiFetch(`/api/generation/jobs/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete job");
      await fetchJobs();
    } catch (err: any) {
      setError(err.message || "Failed to delete job");
    }
  };

  const submitPlan = async () => {
    const topics = topicsText
      .split(/[\n,]/g)
      .map((topic) => topic.trim())
      .filter(Boolean);

    if (topics.length === 0 || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const computeCron = () => {
        const pad = (n: number) => String(n).padStart(2, "0");
        const [hhStr, mmStr] = (timeOfDay || "09:00").split(":");
        const hh = Number(hhStr || 9) || 9;
        const mm = Number(mmStr || 0) || 0;

        if (scheduleType === "custom") return (customCron || "").trim() || undefined;
        if (scheduleType === "daily") return `${mm} ${hh} * * *`;
        if (scheduleType === "weekly") return `${mm} ${hh} * * ${weeklyDay}`;
        if (scheduleType === "monthly") return `${mm} ${hh} ${monthlyDay} * *`;
        return undefined;
      };

      const schedule_cron = computeCron();

      const response = await apiFetch("/api/generation/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topics,
          top,
          rank,
          use_cache: useCache,
          // defaults applied server-side; include explicit booleans for clarity
          save: true,
          execute_worker: true,
          schedule_cron,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || `Planner request failed (${response.status})`);
      }

      setIsFormOpen(false);
      await fetchJobs();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Planner request failed";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isProUser) {
    return (
      <div className="relative flex h-full flex-col">
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/10 p-6 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-amber-500/20 bg-black/60 p-8 text-center backdrop-blur-2xl shadow-[0_0_50px_rgba(245,158,11,0.1)]">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/50">
              <Lock className="h-8 w-8 animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-white">Unlock Planner</h2>
            <p className="mt-3 text-sm text-zinc-400">
              Plan recurring video generation, connect sources, and schedule the worker from one place. This page is available on Pro.
            </p>
            <div className="mt-8 space-y-3">
              <ul className="mb-6 space-y-2 text-left">
                {[
                  "Plan video topics in batches",
                  "Set sources and scheduling",
                  "Launch worker execution automatically",
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-[13px] text-zinc-300">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                onClick={openUpgrade}
                className="w-full rounded-lg bg-amber-500 py-3 font-semibold text-black transition-all hover:scale-[1.02] hover:bg-amber-400 active:scale-[0.98]"
              >
                Upgrade to Pro
              </button>
            </div>
          </div>
        </div>

        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-6">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              Planner
              <span className="rounded-md border border-primary/40 bg-primary/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary">
                Pro
              </span>
            </h1>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              plan video creation · locked for free users
            </p>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-6">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            Planner
            <span className="rounded-md border border-primary/40 bg-primary/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary">
              Pro
            </span>
          </h1>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            plan video creation · {activeJobs.length}/{jobs.length} active
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </button>
          <button
            onClick={() => setIsFormOpen((current) => !current)}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 font-mono text-[11px] uppercase tracking-widest text-primary-foreground shadow-[0_4px_20px_-4px_var(--glow)] transition-transform hover:scale-105"
          >
            <Plus className="h-4 w-4" />
            New Plan
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <section className="rounded-2xl border border-border bg-card/80 p-5 shadow-[0_24px_70px_-40px_rgba(0,0,0,0.6)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold">Planner workflow</h2>
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  how planner jobs move from idea to library
                </p>
              </div>
              <div className="rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-primary">
                Full width
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-border bg-background/50 p-4">
                <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-primary">01</div>
                <p className="text-sm text-muted-foreground">Collect topics and source hints.</p>
              </div>
              <div className="rounded-xl border border-border bg-background/50 p-4">
                <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-primary">02</div>
                <p className="text-sm text-muted-foreground">Send them to the planner agent.</p>
              </div>
              <div className="rounded-xl border border-border bg-background/50 p-4">
                <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-primary">03</div>
                <p className="text-sm text-muted-foreground">Planner dispatches the worker and stores the result in Library.</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card/80 p-5 shadow-[0_24px_70px_-40px_rgba(0,0,0,0.6)]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">Planner jobs</h2>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    backend-generated plans for future video creation
                  </p>
                </div>
                <div className="rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-primary">
                  Planner Agent
                </div>
              </div>

              {loading ? (
                <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-border bg-background/40">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    Loading planner jobs...
                  </div>
                </div>
              ) : jobs.length === 0 ? (
                <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background/40 text-center">
                  <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/30">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">No planner jobs yet</h3>
                  <p className="mt-2 max-w-md text-sm text-muted-foreground">
                    Create your first plan to tell the planner what topics to track, where to fetch them from, and when to run the worker.
                  </p>
                  <button
                    onClick={() => setIsFormOpen(true)}
                    className="mt-5 inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-primary hover:bg-primary/20"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create plan
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {jobs.map((job) => {
                    const title = getJobTitle(job);
                    const videos = getAllJobVideos(job);

                    return (
                      <article
                        key={job.id}
                        className={`rounded-xl border border-border bg-background/50 p-6 transition-all hover:shadow-[0_20px_40px_-30px_rgba(0,0,0,0.8)] ${
                          !job.isEnabled ? "opacity-60 saturate-50" : ""
                        }`}
                      >
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest ${
                                  job.status === "failed"
                                    ? "border-destructive/30 bg-destructive/10 text-destructive"
                                    : "border-primary/30 bg-primary/10 text-primary"
                                }`}
                              >
                                {job.status === "failed" ? <Activity className="h-2.5 w-2.5" /> : <Sparkles className="h-2.5 w-2.5" />}
                                {job.status || "pending"}
                              </span>
                              {!job.isEnabled && (
                                <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-amber-500">
                                  Paused
                                </span>
                              )}
                              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                                {formatDate(job.createdAt)}
                              </span>
                              
                              <div className="ml-auto flex items-center gap-1.5">
                                <button
                                  onClick={() => toggleJob(job.id)}
                                  title={job.isEnabled ? "Pause job" : "Resume job"}
                                  className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-colors ${
                                    job.isEnabled
                                      ? "border-border bg-card text-muted-foreground hover:border-amber-500/40 hover:text-amber-500"
                                      : "border-amber-500/40 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                                  }`}
                                >
                                  {job.isEnabled ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                                </button>
                                <button
                                  onClick={() => deleteJob(job.id)}
                                  title="Delete job"
                                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            <h3 className={`mt-2 text-lg font-semibold whitespace-pre-wrap transition-colors ${job.isEnabled ? "text-white" : "text-zinc-500"}`}>
                              {title}
                            </h3>
                            
                            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px]">
                              <Detail icon={<Activity className="h-3 w-3" />} label="planner id" value={job.plannerJobId || job.id} />
                              <Detail icon={<Clock3 className="h-3 w-3" />} label="worker" value={job.serviceJobId || "waiting"} />
                              <Detail icon={<Calendar className="h-3 w-3" />} label="cron" value={job.requestPayload?.schedule_cron || "not set"} />
                              <Detail icon={<Calendar className="h-3 w-3" />} label="next exec" value={job.nextRunAt ? formatDate(job.nextRunAt) : "not scheduled"} accent={Boolean(job.nextRunAt)} />
                              <Detail icon={<Check className="h-3 w-3" />} label="save" value={job.requestPayload?.save ? "yes" : "no"} accent={Boolean(job.requestPayload?.save)} />
                            </div>

                            <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                              <span>{job.requestPayload?.execute_worker ? "worker enabled" : "worker skipped"}</span>
                              <button
                                onClick={() => setIsFormOpen(true)}
                                className="inline-flex items-center gap-1 text-primary transition-colors hover:text-primary/80"
                              >
                                New plan
                                <ChevronRight className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            {job.errorMessage && (
                              <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                                {job.errorMessage}
                              </div>
                            )}
                          </div>

                          <div className="lg:w-1/2">
                            <div className="mb-2 flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                              <span>realized videos ({videos.length})</span>
                              <span>{videos.length > 0 ? "available" : "missing"}</span>
                            </div>
                            
                            {videos.length > 0 ? (
                              <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin scrollbar-track-border/20 scrollbar-thumb-primary/20">
                                {videos.map((src, idx) => (
                                  <div key={idx} className="relative w-[160px] flex-shrink-0">
                                    <video
                                      src={src}
                                      controls
                                      preload="metadata"
                                      playsInline
                                      className="aspect-[9/16] w-full rounded-xl border border-border bg-black object-cover shadow-lg"
                                    />
                                    <div className="absolute top-2 left-2 rounded-md bg-black/60 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-widest text-white backdrop-blur">
                                      #{idx + 1}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex h-[157px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background/40 px-3 text-center">
                                <div className="mb-2 h-8 w-8 rounded-full bg-border/50 flex items-center justify-center">
                                  <Clock3 className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Realized videos will appear here once the job produces artifacts.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
        </div>
      </div>

      {isFormOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 backdrop-blur-md"
          onClick={() => setIsFormOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-border bg-card p-5 shadow-[0_30px_100px_-40px_rgba(0,0,0,0.85)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Plan a new batch</h2>
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  create a planner job for video generation
                </p>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="rounded-md border border-border px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:border-primary/40 hover:text-foreground"
              >
                Close
              </button>
            </div>

            <div className="mt-4 max-h-[75vh] overflow-y-auto pr-1 space-y-4">
              <Field label="Topics">
                <textarea
                  value={topicsText}
                  onChange={(event) => setTopicsText(event.target.value)}
                  rows={3}
                  placeholder="Tech, News, Sport"
                  className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {PRESET_TOPICS.map((topic) => (
                    <button
                      key={topic}
                      onClick={() => setTopicsText(topic)}
                      className="rounded-md border border-border bg-card px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </Field>

              {/* Sources removed from UI; defaults applied in request */}

              <div className="grid grid-cols-2 gap-3">
                <Field label="Top">
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={top}
                    onChange={(event) => setTop(Math.max(1, Number(event.target.value) || 1))}
                    className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
                  />
                </Field>
                <Field label="Schedule">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-2">
                        <input type="radio" name="schedule" checked={scheduleType === "daily"} onChange={() => setScheduleType("daily")} />
                        <span className="ml-1">Daily</span>
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input type="radio" name="schedule" checked={scheduleType === "weekly"} onChange={() => setScheduleType("weekly")} />
                        <span className="ml-1">Weekly</span>
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input type="radio" name="schedule" checked={scheduleType === "monthly"} onChange={() => setScheduleType("monthly")} />
                        <span className="ml-1">Monthly</span>
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input type="radio" name="schedule" checked={scheduleType === "custom"} onChange={() => setScheduleType("custom")} />
                        <span className="ml-1">Advanced</span>
                      </label>
                    </div>

                    <div>
                      {scheduleType === "daily" && (
                        <div className="flex items-center gap-2">
                          <input type="time" value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value)} className="rounded-xl border border-border bg-background/60 px-3 py-2 text-sm" />
                          <span className="text-sm text-muted-foreground">every day at local time</span>
                        </div>
                      )}

                      {scheduleType === "weekly" && (
                        <div className="flex items-center gap-2">
                          <select value={weeklyDay} onChange={(e) => setWeeklyDay(Number(e.target.value))} className="rounded-xl border border-border bg-background/60 px-3 py-2 text-sm">
                            <option value={0}>Sunday</option>
                            <option value={1}>Monday</option>
                            <option value={2}>Tuesday</option>
                            <option value={3}>Wednesday</option>
                            <option value={4}>Thursday</option>
                            <option value={5}>Friday</option>
                            <option value={6}>Saturday</option>
                          </select>
                          <input type="time" value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value)} className="rounded-xl border border-border bg-background/60 px-3 py-2 text-sm" />
                          <span className="text-sm text-muted-foreground">every week</span>
                        </div>
                      )}

                      {scheduleType === "monthly" && (
                        <div className="flex items-center gap-2">
                          <input type="number" min={1} max={28} value={monthlyDay} onChange={(e) => setMonthlyDay(Number(e.target.value || 1))} className="w-20 rounded-xl border border-border bg-background/60 px-3 py-2 text-sm" />
                          <input type="time" value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value)} className="rounded-xl border border-border bg-background/60 px-3 py-2 text-sm" />
                          <span className="text-sm text-muted-foreground">day of month</span>
                        </div>
                      )}

                      {scheduleType === "custom" && (
                        <input value={customCron} onChange={(e) => setCustomCron(e.target.value)} placeholder="0 9 * * *" className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm outline-none transition-colors focus:border-primary" />
                      )}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">{schedulePreview}</div>
                    <div className="mt-1 text-sm text-muted-foreground">Choose a simple schedule or pick Advanced to enter a cron expression.</div>
                  </div>
                </Field>
              </div>

              <ToggleRow label="Rank results" value={rank} onChange={setRank} />
              <ToggleRow label="Use cache" value={useCache} onChange={setUseCache} />

              {/* Output dir and Worker URL removed from UI; using defaults in request */}

              {error && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={submitPlan}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-primary-foreground shadow-[0_4px_20px_-4px_var(--glow)] transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Create planner job
                </button>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex w-full items-center justify-between rounded-xl border border-border bg-background/40 px-3 py-2.5 text-left transition-colors hover:border-primary/40"
    >
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className={`text-sm ${value ? "text-primary" : "text-muted-foreground"}`}>{value ? "On" : "Off"}</span>
    </button>
  );
}

function Detail({
  icon,
  label,
  value,
  accent,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border/70 bg-secondary/40 px-2.5 py-1.5">
      <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className={`truncate font-mono text-[11px] ${accent ? "text-primary" : "text-foreground"}`}>{value}</span>
    </div>
  );
}
