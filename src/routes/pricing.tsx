import { createFileRoute } from "@tanstack/react-router";
import { PricingView } from "@/components/PricingView";
import { ProtectedRoute } from "@/components/AuthGuards";

export const Route = createFileRoute("/pricing")({
  component: () => (
    <ProtectedRoute>
      <PricingView />
    </ProtectedRoute>
  ),
});
