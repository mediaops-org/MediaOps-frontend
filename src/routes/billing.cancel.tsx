import { createFileRoute, Link } from "@tanstack/react-router";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ProtectedRoute } from "@/components/AuthGuards";

export const Route = createFileRoute("/billing/cancel")({
  component: () => (
    <ProtectedRoute>
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md border-white/10 bg-black/40 backdrop-blur-xl text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <XCircle className="h-16 w-16 text-destructive" />
            </div>
            <CardTitle className="text-3xl font-bold text-white">Payment Cancelled</CardTitle>
            <CardDescription className="text-zinc-400 mt-2">
              No changes were made to your account. You can try again whenever you're ready.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center pt-6">
            <Button variant="outline" asChild className="w-full border-white/10 bg-white/5 text-white">
              <Link to="/pricing">Back to pricing</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </ProtectedRoute>
  ),
});
