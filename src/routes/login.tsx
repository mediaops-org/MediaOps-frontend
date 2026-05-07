import { createFileRoute } from "@tanstack/react-router";
import { LoginView } from "@/components/LoginView";
import { AuthGuard } from "@/components/AuthGuards";

export const Route = createFileRoute("/login")({
  component: () => (
    <AuthGuard>
      <LoginView />
    </AuthGuard>
  ),
});
