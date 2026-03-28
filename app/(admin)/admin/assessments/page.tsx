'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Search, Plus, ClipboardCheck, FileQuestion,
  ChevronLeft, ChevronRight, Clock, CheckCircle, AlertCircle, Edit3, Copy, Trash2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

interface AssessmentItem {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  programme_id: string;
  module_id: string | null;
  batch_id: string | null;
  duration_minutes: number | null;
  max_attempts: number;
  total_points: number;
  shuffle_questions: boolean;
  negative_marking: boolean;
  question_count: number;
  submission_count: number;
  programme_title: string;
  created_at: string;
}

interface BatchOption { id: string; name: string }

const statusConfig: Record<string, { color: string; icon: React.ComponentType<{ className?: string }> }> = {
  DRAFT: { color: 'bg-blue-100 text-blue-700 border border-blue-200', icon: Edit3 },
  ACTIVE: { color: 'bg-green-100 text-green-700 border border-green-200', icon: CheckCircle },
  CLOSED: { color: 'bg-yellow-100 text-yellow-700 border border-yellow-200', icon: Clock },
  GRADED: { color: 'bg-purple-100 text-purple-700 border border-purple-200', icon: ClipboardCheck },
};

const typeLabels: Record<string, string> = {
  QUIZ: 'Quiz',
  ASSIGNMENT: 'Assignment',
  EXAM: 'Exam',
  PRACTICE: 'Practice',
};

export default function AssessmentsPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Duplicate modal state
  const [dupItem, setDupItem] = useState<AssessmentItem | null>(null);
  const [dupTitle, setDupTitle] = useState('');
  const [dupBatchId, setDupBatchId] = useState('');
  const [dupBatches, setDupBatches] = useState<BatchOption[]>([]);
  const [dupModuleTitle, setDupModuleTitle] = useState('');
  const [dupShuffle, setDupShuffle] = useState(false);
  const [dupNegative, setDupNegative] = useState(false);
  const [dupFrom, setDupFrom] = useState('');
  const [dupUntil, setDupUntil] = useState('');
  const [dupSaving, setDupSaving] = useState(false);

  // Delete modal state
  const [delItem, setDelItem] = useState<AssessmentItem | null>(null);
  const [delConfirmText, setDelConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);

    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '20');
    if (search.trim()) params.set('search', search.trim());
    if (typeFilter !== 'all') params.set('type', typeFilter);
    if (statusFilter !== 'all') params.set('status', statusFilter);

    api
      .get<{ data: AssessmentItem[]; total: number; totalPages: number }>(`/api/v1/admin/assessments?${params}`, accessToken)
      .then((res) => {
        setAssessments(res.data);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accessToken, page, search, typeFilter, statusFilter, refreshKey]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Assessments</h1>
          <p className="text-sm text-gray-500">{total} assessments</p>
        </div>
        <Link href="/admin/assessments/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Assessment
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search assessments..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="all">All types</option>
          <option value="QUIZ">Quiz</option>
          <option value="ASSIGNMENT">Assignment</option>
          <option value="EXAM">Exam</option>
          <option value="PRACTICE">Practice</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="all">All status</option>
          <option value="DRAFT">Draft</option>
          <option value="ACTIVE">Active</option>
          <option value="CLOSED">Closed</option>
          <option value="GRADED">Graded</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      ) : assessments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <FileQuestion className="h-12 w-12 mb-3" />
          <p className="text-lg font-medium">No assessments found</p>
          <p className="text-sm">Create your first assessment to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assessments.map((item) => {
            const status = statusConfig[item.status] ?? statusConfig.DRAFT;
            const StatusIcon = status.icon;
            return (
              <Link key={item.id} href={`/admin/assessments/${item.id}/submissions`} className="block w-full">
                <Card className="cursor-pointer transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center justify-between p-4 gap-4">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="shrink-0 rounded-lg bg-blue-50 p-2.5">
                        <ClipboardCheck className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium truncate">{item.title}</h3>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 font-medium">{typeLabels[item.type] ?? item.type}</span>
                          <span className="truncate max-w-[150px]">{item.programme_title}</span>
                          <span>{item.question_count} questions</span>
                          <span>{item.total_points} pts</span>
                          {item.duration_minutes && <span>{item.duration_minutes} min</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right text-sm">
                        <p className="text-gray-500">{item.submission_count} submissions</p>
                        <p className="text-xs text-gray-400">
                          {new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium whitespace-nowrap ${status.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {item.status}
                      </span>
                      <button
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDupItem(item);
                          setDupTitle(`${item.title} (Copy)`);
                          setDupShuffle(item.shuffle_questions ?? false);
                          setDupNegative(item.negative_marking ?? false);
                          setDupFrom('');
                          setDupUntil('');
                          setDupBatchId('');
                          setDupModuleTitle('');
                          // Load batches and module info from programme
                          if (accessToken && item.programme_id) {
                            try {
                              const res = await api.get<{ modules: { id: string; title: string }[]; batches: BatchOption[] }>(
                                `/api/v1/admin/programmes/${item.programme_id}`, accessToken,
                              );
                              setDupBatches(res.batches ?? []);
                              if (item.module_id) {
                                const mod = (res.modules ?? []).find((m: any) => m.id === item.module_id);
                                setDupModuleTitle(mod?.title ?? '');
                              }
                            } catch {}
                          }
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Duplicate assessment"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDelItem(item);
                          setDelConfirmText('');
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Delete assessment"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      {/* Duplicate Modal */}
      {dupItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDupItem(null)}>
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-1">Duplicate Assessment</h3>
            <div className="mb-4 rounded-lg bg-gray-50 p-3 text-sm">
              <p className="text-gray-500">Original: <strong className="text-gray-700">{dupItem.title}</strong></p>
              <p className="text-gray-500">Programme: <strong className="text-gray-700">{dupItem.programme_title}</strong></p>
              {dupModuleTitle && <p className="text-gray-500">Module: <strong className="text-gray-700">{dupModuleTitle}</strong></p>}
            </div>
            <div className="space-y-4">
              <div>
                <Label>Title *</Label>
                <Input value={dupTitle} onChange={(e) => setDupTitle(e.target.value)} />
              </div>
              <div>
                <Label>Batch</Label>
                <select
                  value={dupBatchId}
                  onChange={(e) => setDupBatchId(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="">All batches (no specific batch)</option>
                  {dupBatches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Available From</Label>
                  <Input type="datetime-local" value={dupFrom} onChange={(e) => setDupFrom(e.target.value)} />
                </div>
                <div>
                  <Label>Available Until</Label>
                  <Input type="datetime-local" value={dupUntil} onChange={(e) => setDupUntil(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={dupShuffle} onChange={(e) => setDupShuffle(e.target.checked)} />
                  Shuffle Questions
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={dupNegative} onChange={(e) => setDupNegative(e.target.checked)} />
                  Negative Marking
                </label>
              </div>
              <p className="text-xs text-gray-400">
                {dupItem.question_count} questions will be copied. Type, duration, passing score, and points remain the same.
              </p>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDupItem(null)}>Cancel</Button>
              <Button
                disabled={dupSaving || !dupTitle.trim()}
                onClick={async () => {
                  if (!accessToken) return;
                  setDupSaving(true);
                  try {
                    await api.post(`/api/v1/admin/assessments/${dupItem.id}/duplicate`, {
                      title: dupTitle.trim(),
                      batch_id: dupBatchId || null,
                      shuffle_questions: dupShuffle,
                      negative_marking: dupNegative,
                      available_from: dupFrom || null,
                      available_until: dupUntil || null,
                    }, accessToken);
                    setDupItem(null);
                    setRefreshKey((k) => k + 1);
                  } catch {}
                  setDupSaving(false);
                }}
              >
                {dupSaving ? 'Creating...' : 'Create Copy'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {delItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDelItem(null)}>
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-red-600 mb-2">Delete Assessment</h3>
            <p className="text-sm text-gray-600 mb-4">
              This will permanently delete <strong>{delItem.title}</strong> and all its questions. This cannot be undone.
            </p>
            <div className="mb-4">
              <Label className="text-sm">Type the assessment title to confirm:</Label>
              <Input
                value={delConfirmText}
                onChange={(e) => setDelConfirmText(e.target.value)}
                placeholder={delItem.title}
                className="mt-1"
              />
              <p className="mt-1 text-xs text-gray-400">Expected: &quot;{delItem.title}&quot;</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDelItem(null)}>Cancel</Button>
              <Button
                variant="destructive"
                disabled={deleting || delConfirmText !== delItem.title}
                onClick={async () => {
                  if (!accessToken) return;
                  setDeleting(true);
                  try {
                    await api.delete(`/api/v1/admin/assessments/${delItem.id}`, accessToken);
                    setDelItem(null);
                    setRefreshKey((k) => k + 1);
                  } catch (err) {
                    alert(err instanceof Error ? err.message : 'Failed to delete');
                  }
                  setDeleting(false);
                }}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
