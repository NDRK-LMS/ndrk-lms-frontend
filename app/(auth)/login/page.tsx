'use client';

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuthStore } from "@/lib/auth-store";
import { AccountTypeSelector, type AccountType } from "@/components/auth/account-type-selector";
import { loginSchema, UserRole } from "@ndrk/shared";

const API_BASE = "http://localhost:3001";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [accountType, setAccountType] = React.useState<AccountType>("LEARNER");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? "Invalid credentials.";
      setError(firstError);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message || "Login failed. Please check your credentials.");
        return;
      }

      const data = await res.json();
      // MFA flow for admins
      if (data.requiresMfa) {
        // Backend only sets requiresMfa for admin roles
        if (accountType === "LEARNER") {
          setError("This account is an admin account. Please choose Admin as account type.");
          return;
        }

        if (data.mfaEnabled) {
          router.push(`/mfa-challenge?temp=${encodeURIComponent(data.tempToken)}`);
        } else {
          router.push(`/mfa-setup?temp=${encodeURIComponent(data.tempToken)}`);
        }
        return;
      }

      setMessage(data.message || "Welcome!");

      // validate that chosen account type matches user role
      const isAdminUser =
        data.user?.role === UserRole.SUPER_ADMIN ||
        data.user?.role === UserRole.PROGRAMME_ADMIN;

      if (accountType === "ADMIN" && !isAdminUser) {
        setError("This account is not an admin. Please choose Learner or use an admin account.");
        return;
      }

      if (accountType === "LEARNER" && isAdminUser) {
        setError("This account is an admin. Please choose Admin as account type.");
        return;
      }

      // store auth globally
      setAuth({
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        message: data.message,
      });

      router.push("/dashboard"); // redirect to dashboard
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Access your NDRK LMS account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <AccountTypeSelector value={accountType} onChange={setAccountType} />
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">
                {error}
              </p>
            )}
            {message && !error && (
              <p className="text-sm text-green-700">
                {message}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-1">
          <span>
            New here?{" "}
            <Link href="/(auth)/register" className="text-blue-600 hover:underline">
              Create an account
            </Link>
          </span>
        </CardFooter>
      </Card>
    </div>
  );
}

