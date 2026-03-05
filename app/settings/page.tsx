'use client';

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth-store";

const API_BASE = "http://localhost:3001";

type MeResponse = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  avatarUrl?: string | null;
  mfaEnabled?: boolean;
  lastLoginAt?: string | null;
  phone?: string | null;
  bio?: string | null;
  notificationPrefs?: Record<string, unknown> | null;
};

export default function SettingsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const [fullName, setFullName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [avatarUrl, setAvatarUrl] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [emailAnnouncements, setEmailAnnouncements] = React.useState(true);

  React.useEffect(() => {
    if (!user || !accessToken) {
      return;
    }

    setLoading(true);
    fetch(`${API_BASE}/api/v1/auth/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
      .then((r) => r.json() as Promise<MeResponse>)
      .then((data) => {
        setFullName(data.fullName ?? "");
        setPhone(data.phone ?? "");
        setAvatarUrl(data.avatarUrl ?? "");
        setBio(data.bio ?? "");
        const prefs = (data.notificationPrefs ?? {}) as Record<string, unknown>;
        setEmailAnnouncements((prefs.emailAnnouncements as boolean) ?? true);
      })
      .catch(() => {
        setError("Failed to load profile. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [user, accessToken, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          fullName,
          phone,
          avatarUrl: avatarUrl || null,
          bio,
          notificationPrefs: {
            emailAnnouncements,
          },
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message || "Failed to update profile.");
        return;
      }

      setSuccess("Profile updated successfully.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-[calc(100vh-56px)] justify-center bg-slate-50 px-4 py-8">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Profile settings</CardTitle>
          <CardDescription>Manage your personal details and notification preferences.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-gray-600">Loading profile...</p>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={user.email} disabled />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Input id="role" value={user.role} disabled />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91-XXXXXXXXXX"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="avatarUrl">Avatar URL</Label>
                <Input
                  id="avatarUrl"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <textarea
                  id="bio"
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us a bit about yourself..."
                />
              </div>

              <div className="space-y-2 rounded-md border bg-slate-50 p-3">
                <span className="text-sm font-medium text-gray-800">Notifications</span>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300"
                    checked={emailAnnouncements}
                    onChange={(e) => setEmailAnnouncements(e.target.checked)}
                  />
                  <span>Receive important updates and announcements by email</span>
                </label>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
              {success && !error && <p className="text-sm text-green-700">{success}</p>}

              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

