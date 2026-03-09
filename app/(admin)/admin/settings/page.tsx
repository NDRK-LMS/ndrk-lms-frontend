'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuthStore } from '@/lib/auth-store';
import { api, ApiError } from '@/lib/api';
import { User, Mail, Phone, Image, FileText, Bell } from 'lucide-react';

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

export default function AdminSettingsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const setAuth = useAuthStore((s) => s.setAuth);

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const [fullName, setFullName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [avatarUrl, setAvatarUrl] = React.useState('');
  const [bio, setBio] = React.useState('');
  const [emailAnnouncements, setEmailAnnouncements] = React.useState(true);

  React.useEffect(() => {
    if (!user || !accessToken) return;
    setLoading(true);
    setError(null);
    api
      .get<MeResponse>('/api/v1/auth/me', accessToken)
      .then((data) => {
        setFullName(data.fullName ?? '');
        setPhone(data.phone ?? '');
        setAvatarUrl(data.avatarUrl ?? '');
        setBio(data.bio ?? '');
        const prefs = (data.notificationPrefs ?? {}) as Record<string, unknown>;
        setEmailAnnouncements((prefs.emailAnnouncements as boolean) ?? true);
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 401) {
          useAuthStore.getState().clearAuth();
          router.push('/auth/login');
          return;
        }
        setError('Failed to load profile. Please try again.');
      })
      .finally(() => setLoading(false));
  }, [user, accessToken, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !user || !refreshToken) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await api.patch<MeResponse>(
        '/api/v1/auth/me',
        {
          fullName,
          phone: phone || null,
          avatarUrl: avatarUrl || null,
          bio: bio || null,
          notificationPrefs: { emailAnnouncements },
        },
        accessToken
      );

      setSuccess('Profile updated successfully.');
      setAuth({
        user: {
          ...user,
          fullName,
          avatarUrl: avatarUrl || null,
        },
        accessToken,
        refreshToken,
      });
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 401) {
        useAuthStore.getState().clearAuth();
        router.push('/auth/login');
        return;
      }
      setError(e instanceof Error ? e.message : 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">
          Manage your profile, contact details, and notification preferences.
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile & account
          </CardTitle>
          <CardDescription>
            Update your personal information. Email and role are read-only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-gray-500">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              Loading profile...
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2 text-gray-700">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    value={user.email}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role" className="flex items-center gap-2 text-gray-700">
                    Role
                  </Label>
                  <Input
                    id="role"
                    value={user.role.replace('_', ' ')}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name *</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2 text-gray-700">
                    <Phone className="h-4 w-4" />
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatarUrl" className="flex items-center gap-2 text-gray-700">
                  <Image className="h-4 w-4" />
                  Avatar URL
                </Label>
                <Input
                  id="avatarUrl"
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                />
                <p className="text-xs text-gray-500">
                  Enter a direct image URL. Used in the header and user lists.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="flex items-center gap-2 text-gray-700">
                  <FileText className="h-4 w-4" />
                  Bio
                </Label>
                <textarea
                  id="bio"
                  className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us a bit about yourself..."
                />
              </div>

              <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                <span className="flex items-center gap-2 text-sm font-medium text-gray-800">
                  <Bell className="h-4 w-4" />
                  Notifications
                </span>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="emailAnnouncements"
                    checked={emailAnnouncements}
                    onCheckedChange={(checked) =>
                      setEmailAnnouncements(checked === true)
                    }
                  />
                  <Label
                    htmlFor="emailAnnouncements"
                    className="cursor-pointer text-sm font-normal text-gray-700"
                  >
                    Receive important updates and announcements by email
                  </Label>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
              {success && !error && (
                <p className="text-sm text-green-700">{success}</p>
              )}

              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  'Save changes'
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
