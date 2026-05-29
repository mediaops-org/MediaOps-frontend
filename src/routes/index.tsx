import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { CreateView } from "@/components/CreateView";
import { ExploreView } from "@/components/ExploreView";
import { LibraryView } from "@/components/LibraryView";
import { AutopilotView } from "@/components/AutopilotView";
import { YoutubeShortsView } from "@/components/YoutubeShortsView";
import { ProtectedRoute } from "@/components/AuthGuards";
import apiFetch from "@/lib/api";
import {
  initialSessions,
  newSession,
  type Message,
  type Reel,
  type Session,
} from "@/lib/mock-data";
import type { View } from "@/lib/types";

export const Route = createFileRoute("/")({
  component: App,
});

function App() {
  const [view, setView] = useState<View>("create");
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [activeId, setActiveId] = useState<string>(initialSessions[initialSessions.length - 1].id);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);

  const loadSessions = useCallback(async () => {
    try {
      const response = await apiFetch("/api/sessions");
      if (!response.ok) return;

      const body = await response.json();
      const rawSessions = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [];
      if (rawSessions.length === 0) return;

      const nextSessions = rawSessions.map(normalizeSession);
      setSessions(nextSessions);
      setActiveId((current) => nextSessions.find((session: Session) => session.id === current)?.id ?? nextSessions[0].id);
    } catch (error) {
      console.error("Failed to load sessions:", error);
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const active = useMemo(
    () => sessions.find((s) => s.id === activeId) ?? sessions[0],
    [sessions, activeId]
  );

  const updateSession = (next: Session | ((current: Session) => Session)) => {
    setSessions((prev) =>
      prev.map((current) => {
        const resolved = typeof next === "function" ? next(current) : next;
        return current.id === resolved.id ? resolved : current;
      })
    );
  };

  const createSession = async () => {
    const draft = newSession();

    setSessions((prev) => [...prev, draft]);
    setActiveId(draft.id);
    setView("create");

    try {
      const response = await apiFetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: draft.title }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create session (${response.status})`);
      }

      const body = await response.json();
      const session = normalizeSession(body?.data ?? body ?? draft);
      setSessions((prev) => prev.map((current) => (current.id === draft.id ? session : current)));
      setActiveId(session.id);
    } catch (error) {
      console.error("Failed to create session:", error);
    }
  };

  const openSession = (id: string) => {
    setActiveId(id);
    setView("create");
  };

  const updateReel = (sessionId: string, reel: Reel) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id !== sessionId
          ? s
          : {
              ...s,
              messages: s.messages.map((m) =>
                m.role === "ai" && m.reel.id === reel.id ? { ...m, reel } : m
              ),
            }
      )
    );
  };

  const appendMessage = async (sessionId: string, message: Message) => {
    try {
      await apiFetch(`/api/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message.role === "user" ? { role: "user", text: message.text } : { role: "ai", text: "", reelId: message.reel.id }),
      });
    } catch (error) {
      console.error("Failed to persist message:", error);
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
        <Sidebar
          active={view}
          activeSessionId={active?.id}
          sessions={sessions}
          onChange={setView}
          onNewSession={createSession}
          onOpenSession={openSession}
        />
        <main key={view} className="fade-in min-w-0 flex-1">
          {view === "create" && active && (
            <CreateView
              session={active}
              onUpdate={updateSession}
              onPersistMessage={appendMessage}
            />
          )}
          {view === "explore" && <ExploreView />}
          {view === "library" && (
            <LibraryView sessions={sessions} onOpen={openSession} onUpdateReel={updateReel} />
          )}
          {view === "youtube" && <YoutubeShortsView />}
          {view === "autopilot" && <AutopilotView />}
          {isLoadingSessions && view === "create" && !active && null}
        </main>
      </div>
    </ProtectedRoute>
  );
}

function normalizeSession(raw: any): Session {
  const messages = Array.isArray(raw.messages)
    ? raw.messages.map((message: any) => normalizeMessage(message))
    : [];

  return {
    id: raw.id,
    title: raw.title ?? "Untitled Reel",
    createdAt: toMillis(raw.createdAt),
    messages,
  };
}

function normalizeMessage(raw: any): Message {
  const base = {
    id: raw.id,
    createdAt: toMillis(raw.createdAt),
  } as const;

  if (raw.role === "ai") {
    const reel = raw.reel ?? {
      id: raw.reelId ?? `reel-${raw.id}`,
      title: raw.text ?? "Generated Reel",
      duration: "0:15",
      thumbnailHue: 220,
      origin: "prompt",
      published: false,
    };

    return {
      ...base,
      role: "ai",
      reel: {
        id: reel.id,
        title: reel.title ?? "Generated Reel",
        duration: reel.duration ?? "0:15",
        thumbnailHue: Number.isFinite(reel.thumbnailHue) ? reel.thumbnailHue : 220,
        videoUrl:
          typeof reel.videoUrl === "string" && reel.videoUrl.trim()
            ? (/^https?:\/\//i.test(reel.videoUrl) ? reel.videoUrl : `/api/reels/${reel.id}/stream`)
            : reel.id && (reel.artifactPath || reel.sourceService || reel.origin)
              ? `/api/reels/${reel.id}/stream`
              : undefined,
        artifactPath: reel.artifactPath ?? null,
        thumbnailUrl: reel.thumbnailUrl ?? null,
        creator: reel.creator,
        tags: reel.tags,
        published: Boolean(reel.published),
        origin: reel.origin ?? "prompt",
      },
    };
  }

  return {
    ...base,
    role: "user",
    text: raw.text ?? "",
  };
}

function toMillis(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return Date.now();
}
