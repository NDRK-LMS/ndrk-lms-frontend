'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Calendar, Users, ArrowRight } from 'lucide-react';

type BatchStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

interface BatchListItem {
  id: string;
  name: string;
  status: BatchStatus;
  startDate?: string | null;
  endDate?: string | null;
  capacity?: number | null;
  programme: {
    id: string;
    title: string;
  };
  totalEnrollments: number;
}

interface BatchListResponse {
  batches: BatchListItem[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
}

export default function AdminBatchesPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [data, setData] = React.useState<BatchListResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState<string>('all');

  React.useEffect(() => {
    if (!accessToken) return;
    void load(1, search, status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  async function load(page: number, searchValue: string, statusValue: string) {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (searchValue.trim()) params.set('search', searchValue.trim());
      if (statusValue && statusValue !== 'all') params.set('status', statusValue);

      const res = await api.get<BatchListResponse>(
        `/api/v1/admin/programmes/batches?${params.toString()}`,
        accessToken,
      );
      setData(res);
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 401) {
        useAuthStore.getState().clearAuth();
        router.push('/auth/login');
        return;
      }
      setError(e instanceof Error ? e.message : 'Failed to load batches.');
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    void load(1, search, status);
  }

  if (!accessToken) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Batches</h1>
          <p className="text-sm text-gray-500">
            Global view of all batches across programmes.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSearchSubmit}
        className="flex flex-wrap items-center gap-3 rounded-lg border bg-white p-3 text-sm"
      >
        <Input
          placeholder="Search by batch or programme..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={status} onValueChange={(v) => setStatus(v)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" size="sm">
          Apply
        </Button>
      </form>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-3 text-sm text-red-700">{error}</CardContent>
        </Card>
      )}

      {loading ? (
        <Card>
          <CardContent className="flex items-center gap-2 py-8 text-sm text-gray-500">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            Loading batches...
          </CardContent>
        </Card>
      ) : !data || data.batches.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-gray-500">
            No batches found.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              All batches <span className="text-xs text-gray-400">({data.total})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.batches.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium text-gray-900">{b.name}</p>
                  <p className="text-xs text-gray-500">Programme: {b.programme.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-600">
                    <Badge
                      variant={b.status === 'ACTIVE' ? 'default' : 'secondary'}
                      className="uppercase"
                    >
                      {b.status}
                    </Badge>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {b.startDate
                        ? new Date(b.startDate).toLocaleDateString()
                        : '—'}{' '}
                      –{' '}
                      {b.endDate
                        ? new Date(b.endDate).toLocaleDateString()
                        : '—'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {b.totalEnrollments}
                      {b.capacity != null ? ` / ${b.capacity}` : ''} learners
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    router.push(
                      `/admin/programmes/${b.programme.id}/batches/${b.id}`,
                    )
                  }
                >
                  Open
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

