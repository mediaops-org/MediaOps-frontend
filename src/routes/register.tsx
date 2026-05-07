import { createFileRoute } from "@tanstack/react-router";
import { RegisterView } from "@/components/RegisterView";
import { AuthGuard } from "@/components/AuthGuards";

export const Route = createFileRoute("/register")({
  component: () => (
    <AuthGuard>
      <RegisterView />
    </AuthGuard>
  ),
});
