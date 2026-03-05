'use client';

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/lib/auth-store";
import { Avatar } from "@/components/ui/avatar";

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
};

export default function ProfilePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [profile, setProfile] = React.useState<MeResponse | null>(null);

  React.useEffect(() => {
    if (!user || !accessToken) {
      return;
    }

    fetch(`${API_BASE}/api/v1/auth/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
      .then((r) => r.json() as Promise<MeResponse>)
      .then((data) => {
        setProfile(data);
      })
      .catch(() => {
        setError("Failed to load profile. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [user, accessToken, router]);

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-[calc(100vh-56px)] justify-center bg-slate-50 px-4 py-8">
      <Card className="w-full max-w-3xl">
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar src={profile?.avatarUrl ?? user.avatarUrl ?? undefined} fallback={user.fullName} className="h-12 w-12" />
          <div>
            <CardTitle>Hi, {profile?.fullName ?? user.fullName}!</CardTitle>
            <CardDescription>{profile?.bio || "Here's a quick view of your profile and activity."}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && <p className="text-sm text-gray-600">Loading profile...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {profile && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border bg-white p-4 shadow-sm">
                  <div className="text-xs font-medium text-gray-500">Email</div>
                  <div className="mt-1 text-sm text-gray-900">{profile.email}</div>
                </div>
                <div className="rounded-lg border bg-white p-4 shadow-sm">
                  <div className="text-xs font-medium text-gray-500">Role</div>
                  <div className="mt-1 text-sm text-gray-900">{profile.role}</div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border bg-white p-4 shadow-sm">
                  <div className="text-xs font-medium text-gray-500">Phone</div>
                  <div className="mt-1 text-sm text-gray-900">
                    {profile.phone || "Add your phone number in Account Settings."}
                  </div>
                </div>
                <div className="rounded-lg border bg-white p-4 shadow-sm">
                  <div className="text-xs font-medium text-gray-500">Last login</div>
                  <div className="mt-1 text-sm text-gray-900">
                    {profile.lastLoginAt
                      ? new Date(profile.lastLoginAt).toLocaleString()
                      : "Not available"}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border bg-white p-4 shadow-sm">
                <div className="text-xs font-medium text-gray-500">About you</div>
                <p className="mt-1 text-sm text-gray-900">
                  {profile.bio || "You haven't added a bio yet. Update it in Account Settings."}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

