import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/auth-types";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function ForgotPasswordView() {
  const { forgotPassword } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setIsLoading(true);
    setError(null);
    try {
      await forgotPassword(data.email);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
        <Card className="w-full max-w-md border-white/10 bg-black/40 backdrop-blur-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-white">Check your inbox</CardTitle>
            <CardDescription className="text-zinc-400 mt-2">
              If an account exists for that email, we've sent instructions to reset your password.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center pt-6 text-sm">
            <Link to="/login" className="text-white hover:underline flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md border-white/10 bg-black/40 backdrop-blur-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight text-white">Reset password</CardTitle>
          <CardDescription className="text-zinc-400">
            Enter your email address and we'll send you a link to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {error && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive border border-destructive/20">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-zinc-300">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600 focus-visible:ring-zinc-700"
                {...register("email")}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>
            <Button className="w-full bg-white text-black hover:bg-zinc-200" type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Reset Link
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center pt-6 text-sm">
          <Link to="/login" className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
