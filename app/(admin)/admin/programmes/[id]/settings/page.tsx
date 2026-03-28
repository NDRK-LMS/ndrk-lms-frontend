'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

type ProgrammeStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

interface ProgrammeSettings {
  id: string;
  title: string;
  description?: string | null;
  status: ProgrammeStatus;
  category?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  selfEnrollment: boolean;
  maxCapacity?: number | null;
  sequentialLessons: boolean;
  certMinAttendance?: number | null;
  certMinGrade?: number | null;
}

interface ProgrammeDetailResponse {
  programme: ProgrammeSettings;
}

export default function AdminProgrammeSettingsPage() {
  const router = useRouter();
  const params = useParams();
  const programmeId = params?.id as string;
  const accessToken = useAuthStore((s) => s.accessToken);

  const [data, setData] = React.useState<ProgrammeDetailResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [status, setStatus] = React.useState<ProgrammeStatus>('DRAFT');
  const [category, setCategory] = React.useState('');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [selfEnrollment, setSelfEnrollment] = React.useState(false);
  const [maxCapacity, setMaxCapacity] = React.useState('');
  const [sequentialLessons, setSequentialLessons] = React.useState(true);
  const [certMinAttendance, setCertMinAttendance] = React.useState('');
  const [certMinGrade, setCertMinGrade] = React.useState('');

  React.useEffect(() => {
    if (!programmeId || !accessToken) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programmeId, accessToken]);

  async function load() {
    if (!programmeId || !accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ProgrammeDetailResponse>(
        `/api/v1/admin/programmes/${programmeId}`,
        accessToken,
      );
      setData(res);
      const p = res.programme;
      setStatus(p.status);
      setCategory(p.category ?? '');
      setStartDate(p.startDate ? p.startDate.slice(0, 10) : '');
      setEndDate(p.endDate ? p.endDate.slice(0, 10) : '');
      setSelfEnrollment(p.selfEnrollment);
      setMaxCapacity(
        typeof p.maxCapacity === 'number' ? String(p.maxCapacity) : '',
      );
      setSequentialLessons(p.sequentialLessons);
      setCertMinAttendance(
        typeof p.certMinAttendance === 'number'
          ? String(p.certMinAttendance)
          : '',
      );
      setCertMinGrade(
        typeof p.certMinGrade === 'number' ? String(p.certMinGrade) : '',
      );
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 401) {
        useAuthStore.getState().clearAuth();
        router.push('/auth/login');
        return;
      }
      setError(e instanceof Error ? e.message : 'Failed to load programme settings.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!programmeId || !accessToken) return;
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        status,
        category: category || null,
        selfEnrollment,
        sequentialLessons,
      };
      if (startDate) body.startDate = startDate;
      if (endDate) body.endDate = endDate;
      if (maxCapacity) body.maxCapacity = Number(maxCapacity);
      if (certMinAttendance) body.certMinAttendance = Number(certMinAttendance);
      if (certMinGrade) body.certMinGrade = Number(certMinGrade);

      const updated = await api.patch<ProgrammeDetailResponse>(
        `/api/v1/admin/programmes/${programmeId}`,
        body,
        accessToken,
      );
      setData(updated);
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 401) {
        useAuthStore.getState().clearAuth();
        router.push('/auth/login');
        return;
      }
      setError(e instanceof Error ? e.message : 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  }

  if (!programmeId) return null;

  const programmeTitle = data?.programme.title ?? 'Programme settings';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            type="button"
            className="mb-1 text-xs text-blue-600 hover:underline"
            onClick={() => router.push(`/admin/programmes/${programmeId}`)}
          >
            ← Back to Overview
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {programmeTitle}
          </h1>
          <p className="text-gray-500">
            Step 3 of 3: Configure enrolment rules, capacity, and completion criteria.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/admin/programmes/${programmeId}/structure`)}
        >
          Structure
        </Button>
      </div>

      {loading ? (
        <Card className="max-w-none">
          <CardContent className="flex items-center gap-2 py-8 text-sm text-gray-500">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            Loading settings...
          </CardContent>
        </Card>
      ) : (
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle className="text-base">Programme settings</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={status}
                    onValueChange={(v) => setStatus(v as ProgrammeStatus)}
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="ARCHIVED">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Data Science"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxCapacity">Max capacity</Label>
                  <Input
                    id="maxCapacity"
                    type="number"
                    min={0}
                    value={maxCapacity}
                    onChange={(e) => setMaxCapacity(e.target.value)}
                    placeholder="Leave empty for unlimited"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={selfEnrollment}
                    onChange={(e) => setSelfEnrollment(e.target.checked)}
                  />
                  Allow self-enrollment for this programme
                </Label>
                <Label className="flex items-center gap-2 font-normal text-gray-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={sequentialLessons}
                    onChange={(e) => setSequentialLessons(e.target.checked)}
                  />
                  Learners must complete lessons sequentially
                </Label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="attendance">Minimum attendance (%) for certificate</Label>
                  <Input
                    id="attendance"
                    type="number"
                    min={0}
                    max={100}
                    value={certMinAttendance}
                    onChange={(e) => setCertMinAttendance(e.target.value)}
                    placeholder="e.g. 75"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grade">Minimum grade (%) for certificate</Label>
                  <Input
                    id="grade"
                    type="number"
                    min={0}
                    max={100}
                    value={certMinGrade}
                    onChange={(e) => setCertMinGrade(e.target.value)}
                    placeholder="e.g. 60"
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/admin/programmes/${programmeId}`)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save settings'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

