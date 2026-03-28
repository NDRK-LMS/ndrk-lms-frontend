'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  UsersRound,
  Calendar,
  Filter,
  Search,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

type ProgrammeStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

interface AdminProgramme {
  id: string;
  title: string;
  description?: string | null;
  status: ProgrammeStatus;
  category?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  selfEnrollment: boolean;
  maxCapacity?: number | null;
  totalBatches: number;
  totalEnrollments: number;
  createdAt: string;
  updatedAt: string;
}

interface ProgrammesResponse {
  programmes: AdminProgramme[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
}

export default function AdminProgrammesPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [items, setItems] = useState<AdminProgramme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProgrammeStatus>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!accessToken) return;
    void fetchProgrammes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, page, statusFilter, search]);

  async function fetchProgrammes() {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '12');
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const data = await api.get<ProgrammesResponse>(
        `/api/v1/admin/programmes?${params.toString()}`,
        accessToken,
      );
      setItems(data.programmes);
      setTotalPages(data.totalPages || 1);
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 401) {
        useAuthStore.getState().clearAuth();
        router.push('/auth/login');
        return;
      }
      setError(e instanceof Error ? e.message : 'Failed to load programmes');
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr?: string | null) {
    if (!dateStr) return 'Not set';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return 'Not set';
    return d.toLocaleDateString();
  }

  function getStatusBadge(status: ProgrammeStatus) {
    const base = 'px-2 py-1 text-xs rounded-full border';
    if (status === 'ACTIVE') {
      return (
        <span className={`${base} border-green-200 bg-green-50 text-green-700`}>
          Active
        </span>
      );
    }
    if (status === 'DRAFT') {
      return (
        <span className={`${base} border-gray-200 bg-gray-50 text-gray-700`}>
          Draft
        </span>
      );
    }
    if (status === 'ARCHIVED') {
      return (
        <span className={`${base} border-gray-200 bg-gray-100 text-gray-500`}>
          Archived
        </span>
      );
    }
    return (
      <span className={`${base} border-yellow-200 bg-yellow-50 text-yellow-700`}>
        Inactive
      </span>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Programmes</h1>
          <p className="text-gray-500">
            Manage learning programmes, structure, and enrolments.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => router.push('/admin/programmes/create')}
          >
            <BookOpen className="h-4 w-4" />
            Create Programme
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by title or description..."
            className="pl-10"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v as typeof statusFilter);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-3 text-sm text-red-700">
            {error}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Card key={idx} className="animate-pulse">
              <CardContent className="space-y-3 p-6">
                <div className="h-4 w-2/3 rounded bg-gray-200" />
                <div className="h-3 w-1/2 rounded bg-gray-100" />
                <div className="h-3 w-full rounded bg-gray-100" />
                <div className="flex gap-2">
                  <div className="h-3 w-20 rounded bg-gray-100" />
                  <div className="h-3 w-16 rounded bg-gray-100" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="py-16 text-center text-gray-500">
          <CardContent className="space-y-2">
            <BookOpen className="mx-auto h-10 w-10 text-gray-300" />
            <p>No programmes found</p>
            <Button
              variant="outline"
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setPage(1);
                void fetchProgrammes();
              }}
            >
              Clear filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((p) => (
              <Card
                key={p.id}
                className="flex cursor-pointer flex-col justify-between transition-shadow hover:shadow-md"
                onClick={() => router.push(`/admin/programmes/${p.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="line-clamp-2 text-base">
                        {p.title}
                      </CardTitle>
                      {p.category && (
                        <p className="mt-1 text-xs text-gray-500">
                          {p.category}
                        </p>
                      )}
                    </div>
                    {getStatusBadge(p.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pb-4">
                  <p className="line-clamp-2 text-xs text-gray-600">
                    {p.description || 'No description provided.'}
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                    <span className="inline-flex items-center gap-1">
                      <UsersRound className="h-3 w-3" />
                      {p.totalEnrollments} learners
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {p.totalBatches} batches
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(p.startDate)} – {formatDate(p.endDate)}
                    </span>
                    {p.selfEnrollment && (
                      <Badge variant="outline" className="text-[10px]">
                        Self-enrollment
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 text-xs text-gray-600">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


