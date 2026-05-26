import { useAuth } from "@/lib/auth-context";
import { useUpgradeModal } from "@/components/UpgradeModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Loader2 } from "lucide-react";
import { useState } from "react";

export function PricingView() {
  const { user, isProUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
          const { default: apiFetch } = await import('../lib/api');
          const response = await apiFetch('/api/billing/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan: "pro" }),
          });
      const body = await response.json();
      const checkoutUrl = body.data?.checkoutUrl ?? body.checkoutUrl;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      }
    } catch (error) {
      console.error("Failed to initiate checkout:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const plans = [
    {
      name: "Free",
      price: "$0",
      description: "Perfect for testing the waters",
      features: [
        { name: "Reel Creation", included: true },
        { name: "Content Library", included: true },
        { name: "Media Exploration", included: true },
        { name: "Community Templates", included: true },
        { name: "Autopilot", included: false },
      ],
      current: !isProUser,
      cta: "Current Plan",
      variant: "secondary" as const,
    },
    {
      name: "Pro",
      price: "$19",
      period: "/mo",
      description: "Complete cinematic toolkit",
      features: [
        { name: "Reel Creation", included: true },
        { name: "Content Library", included: true },
        { name: "AI Autopilot", included: true },
        { name: "Priority Rendering", included: true },
        { name: "Advanced AI Models", included: true },
        { name: "Unlimited Projects", included: true },
      ],
      current: isProUser,
      cta: isProUser ? "Current Plan" : "Upgrade to Pro",
      variant: "default" as const,
      highlight: true,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-20 overflow-auto">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">Simple, cinematic pricing</h1>
        <p className="mt-4 text-zinc-400">Choose the plan that's right for your creative workflow.</p>
      </div>

      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-2">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`relative flex flex-col border-white/10 bg-black/40 backdrop-blur-xl transition-all duration-300 ${
              plan.highlight ? "ring-2 ring-amber-500/50 shadow-[0_0_40px_rgba(245,158,11,0.1)]" : ""
            }`}
          >
            {plan.current && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground border-none">Current Plan</Badge>
              </div>
            )}
            
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl text-white">{plan.name}</CardTitle>
                {plan.highlight && (
                  <Badge variant="outline" className="border-amber-500/50 text-amber-500 bg-amber-500/5">Most Popular</Badge>
                )}
              </div>
              <div className="mt-4 flex items-baseline text-white">
                <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                {plan.period && <span className="ml-1 text-zinc-400">{plan.period}</span>}
              </div>
              <CardDescription className="text-zinc-500">{plan.description}</CardDescription>
            </CardHeader>

            <CardContent className="flex-1">
              <ul className="space-y-4">
                {plan.features.map((feature) => (
                  <li key={feature.name} className="flex items-center gap-3 text-sm">
                    {feature.included ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <X className="h-4 w-4 text-zinc-600" />
                    )}
                    <span className={feature.included ? "text-zinc-300" : "text-zinc-600"}>
                      {feature.name}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter className="pt-6">
              <Button
                className={`w-full font-bold ${
                  plan.highlight 
                    ? "bg-amber-500 text-black hover:bg-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]" 
                    : "bg-white/5 text-white hover:bg-white/10 border border-white/10"
                }`}
                disabled={plan.current || isLoading}
                onClick={plan.name === "Pro" ? handleUpgrade : undefined}
              >
                {isLoading && plan.name === "Pro" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {plan.cta}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
