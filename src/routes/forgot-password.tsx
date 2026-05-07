import { createFileRoute } from "@tanstack/react-router";
import { ForgotPasswordView } from "@/components/ForgotPasswordView";
import { AuthGuard } from "@/components/AuthGuards";

export const Route = createFileRoute("/forgot-password")({
  component: () => (
    <AuthGuard>
      <ForgotPasswordView />
    </AuthGuard>
  ),
});
