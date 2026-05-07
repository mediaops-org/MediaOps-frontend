import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { CreateView } from "@/components/CreateView";
import { ExploreView } from "@/components/ExploreView";
import { LibraryView } from "@/components/LibraryView";
import { AutopilotView } from "@/components/AutopilotView";
import { ProtectedRoute } from "@/components/AuthGuards";
import {
  initialSessions,
  initialAutopilotJobs,
  newSession,
  type Reel,
  type Session,
} from "@/lib/mock-data";
import type { AutopilotJob, View } from "@/lib/types";

export const Route = createFileRoute("/")({
  component: App,
});

function App() {
  const [view, setView] = useState<View>("create");
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [activeId, setActiveId] = useState<string>(initialSessions[initialSessions.length - 1].id);
  const [jobs, setJobs] = useState<AutopilotJob[]>(initialAutopilotJobs);

  const active = useMemo(
    () => sessions.find((s) => s.id === activeId) ?? sessions[0],
    [sessions, activeId]
  );

  const updateSession = (s: Session) => {
    setSessions((prev) => prev.map((x) => (x.id === s.id ? s : x)));
  };

  const handleNewSession = () => {
    const s = newSession();
    setSessions((prev) => [...prev, s]);
    setActiveId(s.id);
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

  const createJob = (j: AutopilotJob) => setJobs((prev) => [j, ...prev]);
  const toggleJob = (id: string) =>
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, active: !j.active } : j)));

  return (
    <ProtectedRoute>
      <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
        <Sidebar active={view} onChange={setView} onNewSession={handleNewSession} />
        <main key={view} className="fade-in min-w-0 flex-1">
          {view === "create" && <CreateView session={active} onUpdate={updateSession} />}
          {view === "explore" && <ExploreView />}
          {view === "library" && (
            <LibraryView sessions={sessions} onOpen={openSession} onUpdateReel={updateReel} />
          )}
          {view === "autopilot" && (
            <AutopilotView jobs={jobs} onCreate={createJob} onToggle={toggleJob} />
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
