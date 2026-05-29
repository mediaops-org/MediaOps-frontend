import { Compass, Sparkles, FolderClosed, ChevronsLeft, ChevronsRight, Zap, LogOut, CreditCard, Tag, YoutubeIcon } from "lucide-react";
import { useState } from "react";
import type { View } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "@tanstack/react-router";
import type { Session } from "@/lib/mock-data";

type Props = {
  active: View;
  activeSessionId?: string;
  sessions: Session[];
  onChange: (v: View) => void;
  onNewSession: () => void;
  onOpenSession: (id: string) => void;
};

const items: { id: View; label: string; icon: typeof Compass; pro?: boolean }[] = [
  { id: "explore", label: "Explore", icon: Compass },
  { id: "create", label: "Create", icon: Sparkles },
  { id: "youtube", label: "YT Shorts", icon: YoutubeIcon },
  { id: "library", label: "Library", icon: FolderClosed },
  { id: "autopilot", label: "Autopilot", icon: Zap, pro: true },
];

export function Sidebar({ active, activeSessionId, sessions, onChange, onNewSession, onOpenSession }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, isProUser, logout } = useAuth();
  const navigate = useNavigate();
  const w = collapsed ? "w-[68px]" : "w-[220px]";
  const history = [...sessions].sort((a, b) => b.createdAt - a.createdAt);

  const handlePortalSession = async () => {
    try {
      const { default: apiFetch } = await import('../lib/api');
      const resp = await apiFetch('/api/billing/portal-session');
      const body = await resp.json();
      const portalUrl = body.data?.portalUrl ?? body.portalUrl;
      if (portalUrl) {
        window.location.href = portalUrl;
      }
    } catch (e) {
      console.error("Failed to open billing portal", e);
    }
  };

  return (
    <aside
      className={`${w} relative flex shrink-0 flex-col border-r border-border bg-surface/40 backdrop-blur-xl transition-[width] duration-300`}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 px-4">
        <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <div className="absolute inset-0 rounded-lg bg-primary opacity-50 blur-md" />
          <span className="relative font-mono text-sm font-bold">M</span>
        </div>
        {!collapsed && (
          <div className="fade-in">
            <div className="font-mono text-sm font-semibold tracking-tight">MediaOps</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">v0.1 · beta</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-2">
        {items.map((it) => {
          const Icon = it.icon;
          const isActive = active === it.id;
          return (
            <div key={it.id}>
              <button
                onClick={() => {
                  if (it.id === "create") onNewSession();
                  onChange(it.id);
                }}
                className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all ${
                  isActive
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                }`}
                title={collapsed ? it.label : undefined}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r bg-primary shadow-[0_0_10px_var(--glow)]" />
                )}
                <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? "text-primary" : ""}`} />
                {!collapsed && (
                  <span className="flex flex-1 items-center justify-between gap-2 font-mono text-[13px]">
                    {it.label}
                    {it.pro && (
                      <span className="rounded border border-primary/40 bg-primary/15 px-1 py-0 font-mono text-[8px] uppercase tracking-widest text-primary">
                        Pro
                      </span>
                    )}
                  </span>
                )}
                {collapsed && it.pro && (
                  <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_6px_var(--glow)]" />
                )}
              </button>

              {it.id === "create" && !collapsed && (
                <div className="mt-2 rounded-xl border border-border bg-card/40 p-2.5 shadow-[0_8px_24px_-18px_rgba(0,0,0,0.9)]">
                  <div className="mb-2 flex items-center justify-between px-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    <span>conv history</span>
                    <span>{history.length}</span>
                  </div>
                  <div className="sidebar-scroll max-h-56 space-y-1.5 overflow-y-auto pr-1.5">
                    {history.map((session) => {
                      const isActiveSession = session.id === activeSessionId;
                      const lastMessage = session.messages[session.messages.length - 1];
                      const preview =
                        lastMessage?.role === "user"
                          ? lastMessage.text
                          : lastMessage?.role === "ai"
                            ? lastMessage.reel.title
                            : "No messages yet";

                      return (
                        <button
                          key={session.id}
                          onClick={() => onOpenSession(session.id)}
                          className={`w-full rounded-xl border px-3 py-2.5 text-left transition-all ${
                            isActiveSession
                              ? "border-primary/50 bg-primary/10 text-foreground shadow-[0_0_0_1px_color-mix(in_oklab,var(--glow)_20%,transparent)]"
                              : "border-border bg-surface/40 text-muted-foreground hover:border-primary/30 hover:bg-surface/70 hover:text-foreground"
                          }`}
                        >
                          <div className="truncate font-mono text-[12px] uppercase tracking-wider">
                            {session.title}
                          </div>
                          <div className="mt-1 truncate text-[11px] normal-case tracking-normal text-muted-foreground/90">
                            {preview}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <Link
          to="/pricing"
          className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all text-muted-foreground hover:bg-secondary/50 hover:text-foreground`}
          title={collapsed ? "Pricing" : undefined}
        >
          <Tag className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span className="flex-1 font-mono text-[13px]">Pricing</span>}
        </Link>

        {isProUser && (
          <button
            onClick={handlePortalSession}
            className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all text-muted-foreground hover:bg-secondary/50 hover:text-foreground`}
            title={collapsed ? "Billing" : undefined}
          >
            <CreditCard className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span className="flex-1 font-mono text-[13px]">Billing</span>}
          </button>
        )}
      </nav>

      {!isProUser && !collapsed && (
        <div className="mx-3 mb-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="mb-2 text-[11px] font-medium text-amber-500/90 tracking-tight">Unlock Autopilot and priority rendering</p>
          <Button
            className="h-8 w-full bg-amber-500 text-[10px] font-bold uppercase tracking-widest text-black hover:bg-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
            onClick={() => navigate({ to: "/pricing" })}
          >
            Go Pro
          </Button>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="mx-3 mb-2 flex items-center justify-center gap-2 rounded-md border border-border/60 py-1.5 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
      >
        {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        {!collapsed && <span className="font-mono text-[10px] uppercase tracking-widest">collapse</span>}
      </button>

      {/* User */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-8 w-8 shrink-0 ring-2 ring-background">
            {user?.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-[10px] text-white">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="fade-in min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="truncate text-[13px] font-medium text-white">{user?.name}</div>
                <Badge 
                  className={`h-4 px-1 text-[8px] uppercase tracking-tighter ${
                    isProUser 
                      ? "bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.3)]" 
                      : "bg-zinc-800 text-zinc-400 border-none"
                  }`}
                >
                  {isProUser ? "Pro" : "Free"}
                </Badge>
              </div>
              <div className="truncate font-mono text-[10px] text-muted-foreground">{user?.email}</div>
            </div>
          )}
        </div>
        <button
          onClick={() => logout()}
          className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span className="font-mono text-[11px] uppercase tracking-widest">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
