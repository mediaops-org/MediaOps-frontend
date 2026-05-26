import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth-context";
import { UpgradeModalProvider } from "@/components/UpgradeModal";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="fade-in flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16">
      {/* Film frame icon */}
      <div className="relative mb-8 flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 ring-1 ring-primary/20 shadow-[0_0_40px_-8px_var(--glow)]">
        <div className="absolute inset-0 rounded-2xl bg-primary/5 blur-xl" />
        <svg className="relative h-9 w-9 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="2" width="20" height="20" rx="2.5" />
          <rect x="2" y="6" width="20" height="0" strokeWidth="0.5" />
          <rect x="2" y="18" width="20" height="0" strokeWidth="0.5" />
          <line x1="6" y1="2" x2="6" y2="6" strokeWidth="1.5" />
          <line x1="10" y1="2" x2="10" y2="6" strokeWidth="1.5" />
          <line x1="14" y1="2" x2="14" y2="6" strokeWidth="1.5" />
          <line x1="18" y1="2" x2="18" y2="6" strokeWidth="1.5" />
          <line x1="6" y1="18" x2="6" y2="22" strokeWidth="1.5" />
          <line x1="10" y1="18" x2="10" y2="22" strokeWidth="1.5" />
          <line x1="14" y1="18" x2="14" y2="22" strokeWidth="1.5" />
          <line x1="18" y1="18" x2="18" y2="22" strokeWidth="1.5" />
          <path d="M9.5 9.5l5 2.5-5 2.5V9.5z" fill="currentColor" stroke="none" />
        </svg>
      </div>

      {/* Status label */}
      <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-primary">
        render error · frame not found
      </div>

      {/* 404 */}
      <h1
        className="font-mono text-[9rem] font-bold leading-none tracking-tighter text-foreground"
        style={{ textShadow: "0 0 60px color-mix(in oklab, var(--glow) 50%, transparent)" }}
      >
        404
      </h1>

      <p className="mt-2 text-base font-medium text-foreground">This reel doesn't exist.</p>
      <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
        The frame you requested was never rendered, got lost on export, or was cut from the timeline.
      </p>

      {/* Fake terminal block */}
      <div className="mt-8 w-full max-w-sm rounded-xl border border-border bg-card px-4 py-3 text-left font-mono text-xs">
        <div className="mb-1 text-muted-foreground">$ mediaops render --frame 404</div>
        <div className="text-destructive">✗ ERROR: frame not found in timeline</div>
        <div className="mt-1 space-y-0.5 text-muted-foreground/60">
          <div>  session_id   <span className="text-muted-foreground">null</span></div>
          <div>  render_time  <span className="text-muted-foreground">∞ ms</span></div>
          <div>  frames_out   <span className="text-muted-foreground">0 / 0</span></div>
          <div>  status       <span className="text-destructive">FAILED</span></div>
        </div>
      </div>

      {/* CTA */}
      <Link
        to="/"
        className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-mono text-[12px] uppercase tracking-widest text-primary-foreground shadow-[0_4px_20px_-4px_var(--glow)] transition-transform hover:scale-105"
      >
        ← back to studio
      </Link>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "MediaOps — AI-powered reel creation" },
      { name: "description", content: "Create cinematic reels with AI. Chat your idea, get a finished reel in seconds." },
      { name: "author", content: "MediaOps" },
      { property: "og:title", content: "MediaOps — AI-powered reel creation" },
      { property: "og:description", content: "Create cinematic reels with AI. Chat your idea, get a finished reel in seconds." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@MediaOps" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <UpgradeModalProvider>
        <Outlet />
      </UpgradeModalProvider>
    </AuthProvider>
  );
}
