import { useEffect, useRef, useState } from "react";
import { ArrowUp, Pencil } from "lucide-react";
import { ReelCard } from "./ReelCard";
import apiFetch from "@/lib/api";
import { type Message, type Reel, type Session } from "@/lib/mock-data";

type Props = {
  session: Session;
  onUpdate: (s: Session) => void;
  onPersistMessage: (sessionId: string, message: Message) => Promise<void>;
};

export function CreateView({ session, onUpdate, onPersistMessage }: Props) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(session.title);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => setTitleDraft(session.title), [session.id, session.title]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [session.messages.length, loading]);

  const submit = () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: Message = { id: "u" + Date.now(), role: "user", text, createdAt: Date.now() };
    const next: Session = { ...session, messages: [...session.messages, userMsg] };
    onUpdate(next);
    setInput("");
    setLoading(true);
    setError(null);
 
    void (async () => {
      try {
        await onPersistMessage(session.id, userMsg);
        const response = await apiFetch("/api/generation/prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: text,
            sessionId: session.id,
            limit: 1,
            generate_video: true,
            save_to_disk: true,
          }),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.message || `Generation failed with status ${response.status}`);
        }

        const body = await response.json();
        const reel = normalizeGeneratedReel(text, body);
        const aiMsg: Message = { id: "a" + Date.now(), role: "ai", reel, createdAt: Date.now() };
        onUpdate({ ...next, messages: [...next.messages, aiMsg] });
        await onPersistMessage(session.id, aiMsg);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Generation failed";
        setError(message);
        onUpdate(next);
      } finally {
        setLoading(false);
      }
    })();
  };

  const commitTitle = () => {
    setEditingTitle(false);
    const t = titleDraft.trim() || session.title;
    if (t !== session.title) onUpdate({ ...session, title: t });
  };

  const isEmpty = session.messages.length === 0 && !loading;

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-6">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">session</span>
          {editingTitle ? (
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => e.key === "Enter" && commitTitle()}
              className="rounded-md border border-primary/40 bg-secondary/60 px-2 py-1 text-sm outline-none focus:border-primary"
            />
          ) : (
            <button
              onClick={() => setEditingTitle(true)}
              className="group flex items-center gap-2 rounded-md px-2 py-1 text-sm font-medium hover:bg-secondary/60"
            >
              {session.title}
              <Pencil className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          )}
        </div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {session.messages.filter((m) => m.role === "ai").length} reels generated
        </div>
      </header>

      {/* Thread */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          {isEmpty && (
            <div className="fade-in flex flex-col items-center justify-center pt-16 text-center">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/30">
                <span className="text-2xl">✨</span>
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-balance">What are we creating today?</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground text-balance">
                Describe the reel you want — vibe, length, references. The model takes it from there.
              </p>
              <div className="mt-6 grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
                {[
                  "15s product teaser, neon, cyberpunk",
                  "Travel diary, handheld, lo-fi",
                  "Brand intro, minimal, white space",
                  "Tutorial opener, dark, energetic",
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="rounded-lg border border-border bg-card/60 px-3 py-2.5 text-left text-xs text-muted-foreground transition-all hover:border-primary/40 hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {session.messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="fade-in flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-[0_8px_30px_-10px_var(--glow)]">
                  {m.text}
                </div>
              </div>
            ) : (
              <div key={m.id} className="fade-in flex max-w-[80%] flex-col gap-2">
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--glow)]" />
                  MediaOps generated
                </div>
                <div className="w-full max-w-md">
                  <ReelCard reel={m.reel} />
                </div>
              </div>
            )
          )}

          {loading && (
            <div className="fade-in flex max-w-[80%] flex-col gap-2">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--glow)]" />
                generating
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-4">
                <span className="pulse-dot inline-block h-2 w-2 rounded-full bg-primary" />
                <span className="pulse-dot inline-block h-2 w-2 rounded-full bg-primary" style={{ animationDelay: "0.15s" }} />
                <span className="pulse-dot inline-block h-2 w-2 rounded-full bg-primary" style={{ animationDelay: "0.3s" }} />
                <span className="ml-2 font-mono text-xs text-muted-foreground">rendering frames...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border bg-background/60 px-6 py-4 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl">
          {error && (
            <div className="mb-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="group relative rounded-2xl border border-border bg-card transition-colors focus-within:border-primary/60 focus-within:shadow-[0_0_0_4px_color-mix(in_oklab,var(--glow)_15%,transparent)]">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="Describe your reel idea..."
              rows={2}
              className="w-full resize-none bg-transparent px-4 py-3.5 pr-14 text-sm placeholder:text-muted-foreground focus:outline-none"
            />
            <button
              onClick={submit}
              disabled={!input.trim() || loading}
              className="absolute bottom-2.5 right-2.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100"
              aria-label="Send"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>shift + enter for newline</span>
            <span>·  preview model: cinetic-v2</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function normalizeGeneratedReel(prompt: string, payload: any): Reel {
  const generated = payload?.data?.reel ?? payload?.reel ?? payload?.job?.reel ?? payload ?? {};
  const response = payload?.data?.response ?? payload?.response ?? payload?.data?.job?.responsePayload ?? {};
  const title = typeof generated.title === "string" && generated.title.trim() ? generated.title : prompt;
  const duration = formatDuration(
    generated.duration ?? generated.durationSeconds ?? generated.runtime ?? response?.duration ?? 15
  );
  const hue =
    typeof generated.thumbnailHue === "number"
      ? generated.thumbnailHue
      : hashToHue(
          title ||
            prompt ||
            generated.artifactPath ||
            response?.captioned_video_path ||
            response?.final_video_path ||
            generated.videoUrl ||
            "generated-reel"
        );
  const streamUrl = generated.id ? `/api/reels/${generated.id}/stream` : undefined;
  const videoUrl =
    streamUrl ??
    generated.videoUrl ??
    generated.captionedVideoPath ??
    response?.captioned_video_path ??
    generated.finalVideoPath ??
    response?.final_video_path;
  const artifactPath =
    generated.artifactPath ?? generated.captionedVideoPath ?? response?.captioned_video_path ?? generated.finalVideoPath ?? response?.final_video_path ?? null;

  return {
    id: generated.id ?? `r${Date.now()}`,
    title: title.length > 0 ? title : "Generated Reel",
    duration,
    thumbnailHue: hue,
    videoUrl: typeof videoUrl === "string" && videoUrl.trim() ? (/^https?:\/\//i.test(videoUrl) ? videoUrl : streamUrl) : streamUrl,
    artifactPath,
    thumbnailUrl: generated.thumbnailUrl ?? null,
    published: Boolean(generated.published),
    origin: generated.origin ?? "prompt",
  };
}

function formatDuration(value: unknown) {
  if (typeof value === "string" && value.includes(":")) return value;
  const seconds = typeof value === "number" ? Math.max(1, Math.floor(value)) : 15;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function hashToHue(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 360;
  }
  return Math.abs(hash);
}
