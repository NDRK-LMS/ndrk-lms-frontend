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
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [accountType, setAccountType] = React.useState<AccountType>("LEARNER");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [googleLoading, setGoogleLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function handleAuthSuccess(data: any, options?: { fromGoogle?: boolean }) {
    const normalizedRole = (data.user?.role ?? "").toString().trim().toUpperCase();
    const isAdminUser =
      normalizedRole === UserRole.SUPER_ADMIN || normalizedRole === UserRole.PROGRAMME_ADMIN;

    // MFA flow for admins (backend already guarantees this is an admin role)
    if (data.requiresMfa) {
      if (!options?.fromGoogle && accountType === "LEARNER") {
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

    if (accountType === "ADMIN" && !isAdminUser) {
      setError("This account is not an admin. Please choose Learner or use an admin account.");
      return;
    }

    if (accountType === "LEARNER" && isAdminUser) {
      setError("This account is an admin. Please choose Admin as account type.");
      return;
    }

    setAuth({
      user: data.user,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      message: data.message,
    });

    router.push("/dashboard");
  }

  async function handleGoogleCredential(credential: string) {
    setGoogleLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: credential }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message || "Google login failed. Please try again.");
        return;
      }

      const data = await res.json();
      await handleAuthSuccess(data, { fromGoogle: true });
    } catch {
      setError("Something went wrong with Google login. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  }

  React.useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      return;
    }

    const scriptId = "google-oauth-script";
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;

    const initializeGoogle = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any;
      if (!w.google?.accounts?.id) return;

      w.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response: { credential?: string }) => {
          if (response.credential) {
            void handleGoogleCredential(response.credential);
          }
        },
      });

      const buttonContainer = document.getElementById("google-signin-button");
      if (buttonContainer) {
        w.google.accounts.id.renderButton(buttonContainer, {
          theme: "outline",
          size: "large",
          width: "100%",
          shape: "pill",
        });
      }
    };

    if (existingScript) {
      if ((existingScript as HTMLScriptElement).dataset.loaded === "true") {
        initializeGoogle();
      } else {
        existingScript.addEventListener("load", () => {
          (existingScript as HTMLScriptElement).dataset.loaded = "true";
          initializeGoogle();
        });
      }
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      initializeGoogle();
    };
    document.body.appendChild(script);
  }, []);

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
      await handleAuthSuccess(data);
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
          {GOOGLE_CLIENT_ID && (
            <div className="mt-4">
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div id="google-signin-button" className="flex justify-center" />
                {googleLoading && (
                  <p className="text-xs text-muted-foreground text-center">
                    Connecting to Google...
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-1">
          <span>
            New here?{" "}
            <Link href="/register" className="text-blue-600 hover:underline">
              Create an account
            </Link>
          </span>
        </CardFooter>
      </Card>
    </div>
  );
}

