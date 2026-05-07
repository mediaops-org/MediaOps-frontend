import { useMemo, useState } from "react";
import { Plus, Zap, X, Calendar, Repeat, Hash, Activity } from "lucide-react";
import type {
  AutopilotJob,
  AutopilotTopic,
  ScrapingFrequency,
  GenerationFrequency,
} from "@/lib/types";
import { SCRAPING_RANK, GENERATION_RANK } from "@/lib/types";

type Props = {
  jobs: AutopilotJob[];
  onCreate: (job: AutopilotJob) => void;
  onToggle: (id: string) => void;
};

const TOPICS: AutopilotTopic[] = ["Sport", "News", "Tech", "Fashion", "Food"];
const SCRAPE: ScrapingFrequency[] = ["Hourly", "Daily", "Weekly"];
const GEN: GenerationFrequency[] = ["Daily", "Weekly", "Monthly"];

function timeAgo(t: number) {
  const diff = Date.now() - t;
  const h = Math.floor(diff / 36e5);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// Compare scrape vs gen — gen cannot be faster than scrape.
// Map both to a hours-per-cycle approximation.
const SCRAPE_HOURS: Record<ScrapingFrequency, number> = { Hourly: 1, Daily: 24, Weekly: 168 };
const GEN_HOURS: Record<GenerationFrequency, number> = { Daily: 24, Weekly: 168, Monthly: 720 };

function genFasterThanScrape(scrape: ScrapingFrequency, gen: GenerationFrequency) {
  return GEN_HOURS[gen] < SCRAPE_HOURS[scrape];
}

export function AutopilotView({ jobs, onCreate, onToggle }: Props) {
  const [open, setOpen] = useState(false);
  const sorted = useMemo(() => [...jobs].sort((a, b) => b.createdAt - a.createdAt), [jobs]);

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-6">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            Autopilot Jobs
            <span className="rounded-md border border-primary/40 bg-primary/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary">
              Pro
            </span>
          </h1>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            scheduled reel generation · {jobs.filter((j) => j.active).length}/{jobs.length} active
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 font-mono text-[11px] uppercase tracking-widest text-primary-foreground shadow-[0_4px_20px_-4px_var(--glow)] transition-transform hover:scale-105"
        >
          <Plus className="h-4 w-4" />
          New Job
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-5xl">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/30">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold">No jobs yet</h2>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Schedule recurring reel generation around topics you care about. Reels land in your Library tagged as Autopilot.
              </p>
              <button
                onClick={() => setOpen(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-primary hover:bg-primary/20"
              >
                <Plus className="h-3.5 w-3.5" />
                Create your first job
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {sorted.map((j) => (
                <div
                  key={j.id}
                  className="card-hover fade-in flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary">
                          <Zap className="h-2.5 w-2.5" />
                          {j.topic}
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          {timeAgo(j.createdAt)}
                        </span>
                      </div>
                      <h3 className="mt-2 truncate text-sm font-medium">{j.topic} digest</h3>
                    </div>

                    {/* Active toggle */}
                    <button
                      onClick={() => onToggle(j.id)}
                      className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
                        j.active
                          ? "border-primary/60 bg-primary/30"
                          : "border-border bg-secondary"
                      }`}
                      aria-label={j.active ? "Deactivate" : "Activate"}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full transition-all ${
                          j.active
                            ? "left-[22px] bg-primary shadow-[0_0_10px_var(--glow)]"
                            : "left-0.5 bg-muted-foreground"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <Stat icon={<Repeat className="h-3 w-3" />} label="scrape" value={j.scrapingFrequency} />
                    <Stat icon={<Calendar className="h-3 w-3" />} label="generate" value={j.generationFrequency} />
                    <Stat icon={<Hash className="h-3 w-3" />} label="reels/cycle" value={String(j.reelsPerCycle)} />
                    <Stat
                      icon={<Activity className="h-3 w-3" />}
                      label="status"
                      value={j.active ? "Active" : "Inactive"}
                      accent={j.active}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {open && <CreateJobModal onClose={() => setOpen(false)} onCreate={onCreate} />}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
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
      <span className={`font-mono text-[11px] ${accent ? "text-primary" : "text-foreground"}`}>{value}</span>
    </div>
  );
}

function CreateJobModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (j: AutopilotJob) => void;
}) {
  const [topic, setTopic] = useState<AutopilotTopic>("Tech");
  const [scrape, setScrape] = useState<ScrapingFrequency>("Daily");
  const [gen, setGen] = useState<GenerationFrequency>("Daily");
  const [count, setCount] = useState(3);

  const freqError = genFasterThanScrape(scrape, gen)
    ? "Generation frequency cannot be faster than scraping frequency."
    : null;
  const countError =
    count < 1 || count > 20 || !Number.isFinite(count) ? "Must be between 1 and 20." : null;
  const valid = !freqError && !countError;

  const submit = () => {
    if (!valid) return;
    onCreate({
      id: "ap-job-" + Math.random().toString(36).slice(2, 9),
      topic,
      scrapingFrequency: scrape,
      generationFrequency: gen,
      reelsPerCycle: count,
      active: true,
      createdAt: Date.now(),
    });
    onClose();
  };

  return (
    <div
      className="fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">New Autopilot Job</h2>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              schedule recurring reels
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          <Field label="Topic">
            <Pills
              options={TOPICS}
              value={topic}
              onChange={(v) => setTopic(v as AutopilotTopic)}
            />
          </Field>

          <Field label="Scraping frequency">
            <Pills options={SCRAPE} value={scrape} onChange={(v) => setScrape(v as ScrapingFrequency)} />
          </Field>

          <Field label="Generation frequency" error={freqError}>
            <Pills options={GEN} value={gen} onChange={(v) => setGen(v as GenerationFrequency)} />
          </Field>

          <Field label="Reels per cycle" error={countError}>
            <input
              type="number"
              min={1}
              max={20}
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value || "0", 10))}
              className="w-28 rounded-md border border-border bg-secondary/60 px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
            />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border bg-background/40 px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!valid}
            className="rounded-md bg-primary px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest text-primary-foreground shadow-[0_4px_20px_-4px_var(--glow)] transition-all hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100"
          >
            Save Job
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      {children}
      {error && (
        <div className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-1.5 font-mono text-[10px] text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}

function Pills({
  options,
  value,
  onChange,
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`rounded-md border px-2.5 py-1.5 font-mono text-[11px] transition-all ${
            value === o
              ? "border-primary/60 bg-primary/15 text-primary shadow-[0_0_0_1px_var(--glow)]"
              : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
