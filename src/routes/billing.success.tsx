import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ProtectedRoute } from "@/components/AuthGuards";

export const Route = createFileRoute("/billing/success")({
  component: () => (
    <ProtectedRoute>
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md border-white/10 bg-black/40 backdrop-blur-xl text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="h-16 w-16 text-primary animate-bounce" />
            </div>
            <CardTitle className="text-3xl font-bold text-white">Upgrade Successful!</CardTitle>
            <CardDescription className="text-zinc-400 mt-2">
              Welcome to MediaOps Pro. Your advanced cinematic tools are now unlocked.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center pt-6">
            <Button asChild className="w-full bg-primary text-primary-foreground font-bold">
              <Link to="/">Back to app</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </ProtectedRoute>
  ),
});
