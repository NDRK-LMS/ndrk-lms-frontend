'use client';

import { useSearchParams, useRouter } from "next/navigation";
import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth-store";

const API_BASE = "http://localhost:3001";

export default function MfaSetupPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const tempToken = searchParams.get("temp") ?? "";
  const [otpauthUrl, setOtpauthUrl] = React.useState<string | null>(null);
  const [code, setCode] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!tempToken) return;
    // Fetch otpauth url to configure authenticator app
    fetch(`${API_BASE}/api/v1/auth/mfa/setup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tempToken }),
    })
      .then((r) => r.json())
      .then((d) => setOtpauthUrl(d.otpauthUrl))
      .catch(() => setError("Failed to start MFA setup. Please try again."));
  }, [tempToken]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/mfa/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tempToken, code }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message || "Invalid code. Please try again.");
        return;
      }

      const data = await res.json();
      setAuth({
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        message: data.message,
      });

      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!tempToken) {
    return <div className="flex min-h-screen items-center justify-center">Missing MFA session.</div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Set up MFA</CardTitle>
          <CardDescription>
            Scan the secret into Google Authenticator (or similar), then enter the 6‑digit code.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {otpauthUrl && (
            <div className="mb-4 rounded-md bg-slate-100 p-3 text-xs break-all">
              {otpauthUrl}
            </div>
          )}
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <Label htmlFor="code">6‑digit code</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Verifying..." : "Verify & Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

