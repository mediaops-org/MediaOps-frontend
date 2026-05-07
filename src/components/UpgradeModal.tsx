import React, { createContext, useContext, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Loader2 } from "lucide-react";

interface UpgradeModalContextType {
  open: () => void;
  close: () => void;
}

const UpgradeModalContext = createContext<UpgradeModalContextType | undefined>(
  undefined
);

export function UpgradeModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/billing/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "pro" }),
      });
      const data = await response.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (error) {
      console.error("Failed to initiate checkout:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <UpgradeModalContext.Provider value={{ open, close }}>
      {children}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md border-white/10 bg-black/60 backdrop-blur-2xl text-white">
          <DialogHeader className="flex flex-col items-center gap-4 text-center">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-500 ring-1 ring-amber-500/50">
              <Sparkles className="h-8 w-8 animate-pulse" />
              <div className="absolute inset-0 rounded-2xl bg-amber-500/20 blur-xl" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-2xl font-bold tracking-tight text-white">
                Unlock AI Autopilot
              </DialogTitle>
              <DialogDescription className="text-zinc-400 text-sm">
                Transform your ideas into cinematic reels instantly with our AI-powered autopilot. Available on Pro.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <ul className="space-y-3">
              {[
                "Unlimited AI Autopilot Reels",
                "Priority Rendering Engines",
                "Advanced AI Cinematic Models",
                "Commercial Usage Rights",
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-sm text-zinc-300">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
                    <Check className="h-3 w-3" />
                  </div>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Button
              className="w-full bg-amber-500 text-black hover:bg-amber-400 font-semibold shadow-[0_0_20px_rgba(245,158,11,0.3)]"
              onClick={handleUpgrade}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Upgrade to Pro →"
              )}
            </Button>
            <Button
              variant="ghost"
              className="text-zinc-400 hover:text-white hover:bg-white/5"
              onClick={close}
            >
              Maybe later
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </UpgradeModalContext.Provider>
  );
}

export function useUpgradeModal() {
  const context = useContext(UpgradeModalContext);
  if (context === undefined) {
    throw new Error("useUpgradeModal must be used within an UpgradeModalProvider");
  }
  return context;
}
