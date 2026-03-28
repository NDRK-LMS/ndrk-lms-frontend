'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

type ProgrammeStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

interface ProgrammeSummary {
  id: string;
  title: string;
  description?: string | null;
  status: ProgrammeStatus;
  category?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  totalBatches: number;
  totalEnrollments: number;
}

interface ProgrammeDetailResponse {
  programme: ProgrammeSummary;
}

export default function AdminProgrammeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const programmeId = params?.id as string;
  const accessToken = useAuthStore((s) => s.accessToken);

  const [data, setData] = React.useState<ProgrammeDetailResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

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
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 401) {
        useAuthStore.getState().clearAuth();
        router.push('/auth/login');
        return;
      }
      setError(e instanceof Error ? e.message : 'Failed to load programme.');
    } finally {
      setLoading(false);
    }
  }

  if (!programmeId) {
    return null;
  }

  const programme = data?.programme;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            type="button"
            className="mb-1 text-xs text-blue-600 hover:underline"
            onClick={() => router.push('/admin/programmes')}
          >
            ← Back to Programmes
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {programme?.title ?? 'Programme'}
          </h1>
          <p className="text-gray-500">
            Overview of this programme. Use the Structure step to manage modules and lessons.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/admin/programmes/${programmeId}/settings`)}
          >
            Settings
          </Button>
          <Button
            type="button"
            onClick={() => router.push(`/admin/programmes/${programmeId}/structure`)}
          >
            Structure
          </Button>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center gap-2 py-8 text-gray-500">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            Loading programme...
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-3 text-sm text-red-700">{error}</CardContent>
        </Card>
      ) : !programme ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-gray-500">
            Programme not found.
          </CardContent>
        </Card>
      ) : (
        <Card className="max-w-none">
          <CardHeader>
            <CardTitle className="text-base">Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-700">
            <p className="text-gray-600">{programme.description || 'No description provided.'}</p>
            <div className="flex flex-wrap gap-4 text-xs text-gray-600">
              <span>Status: {programme.status}</span>
              <span>Category: {programme.category ?? 'Not set'} </span>
              <span>
                Dates:{' '}
                {programme.startDate
                  ? new Date(programme.startDate).toLocaleDateString()
                  : 'Not set'}{' '}
                –{' '}
                {programme.endDate
                  ? new Date(programme.endDate).toLocaleDateString()
                  : 'Not set'}
              </span>
              <span> Batches: {programme.totalBatches}</span>
              <span>Learners: {programme.totalEnrollments}</span>
            </div>
            <div className="pt-2">
              <Button
                type="button"
                onClick={() => router.push(`/admin/programmes/${programmeId}/structure`)}
              >
                Continue to Step 2: Structure
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

