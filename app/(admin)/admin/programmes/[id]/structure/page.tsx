'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  BookOpen,
  Layers,
  PlusCircle,
  Users,
  MoreVertical,
  Edit,
  Trash2,
  Calendar,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

type ProgrammeStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
type LessonType = 'VIDEO' | 'DOCUMENT' | 'LIVE_CLASS' | 'ASSESSMENT' | 'EXTERNAL_LINK';

interface LessonSummary {
  id: string;
  title: string;
  type: string;
  description?: string | null;
  durationMinutes?: number | null;
  sequence: number;
  isMandatory: boolean;
}

interface ModuleSummary {
  id: string;
  title: string;
  description?: string | null;
  sequence: number;
  isVisible: boolean;
  lessons: LessonSummary[];
}

interface BatchSummary {
  id: string;
  name: string;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
  capacity?: number | null;
}

interface ProgrammeDetailResponse {
  programme: {
    id: string;
    title: string;
    description?: string | null;
    status: ProgrammeStatus;
    category?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    totalBatches: number;
    totalEnrollments: number;
  };
  modules: ModuleSummary[];
  batches: BatchSummary[];
}

export default function AdminProgrammeStructurePage() {
  const router = useRouter();
  const params = useParams();
  const programmeId = params?.id as string;
  const accessToken = useAuthStore((s) => s.accessToken);

  const [data, setData] = React.useState<ProgrammeDetailResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState('structure');
  const [saving, setSaving] = React.useState(false);

  const [creatingModule, setCreatingModule] = React.useState(false);
  const [editingModule, setEditingModule] = React.useState<ModuleSummary | null>(null);
  const [moduleTitle, setModuleTitle] = React.useState('');
  const [moduleDescription, setModuleDescription] = React.useState('');
  const [deletingModule, setDeletingModule] = React.useState<ModuleSummary | null>(null);

  const [creatingLessonFor, setCreatingLessonFor] = React.useState<string | null>(null);
  const [editingLesson, setEditingLesson] = React.useState<LessonSummary | null>(null);
  const [lessonModuleId, setLessonModuleId] = React.useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = React.useState('');
  const [lessonType, setLessonType] = React.useState<LessonType>('VIDEO');
  const [lessonDuration, setLessonDuration] = React.useState('');
const [lessonExternalUrl, setLessonExternalUrl] = React.useState('');
  const [deletingLesson, setDeletingLesson] = React.useState<LessonSummary | null>(null);

  const [creatingBatch, setCreatingBatch] = React.useState(false);
  const [editingBatch, setEditingBatch] = React.useState<BatchSummary | null>(null);
  const [batchName, setBatchName] = React.useState('');
  const [batchStartDate, setBatchStartDate] = React.useState('');
  const [batchEndDate, setBatchEndDate] = React.useState('');
  const [batchCapacity, setBatchCapacity] = React.useState('');
  const [deletingBatch, setDeletingBatch] = React.useState<BatchSummary | null>(null);

  React.useEffect(() => {
    if (!programmeId || !accessToken) return;
    void refreshProgramme();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refreshProgramme is stable
  }, [programmeId, accessToken]);

  function handleApiError(e: unknown) {
    if (e instanceof ApiError && e.status === 401) {
      useAuthStore.getState().clearAuth();
      router.push('/auth/login');
      return;
    }
    setError(e instanceof Error ? e.message : 'An error occurred');
  }

  async function refreshProgramme() {
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
      handleApiError(e);
    } finally {
      setLoading(false);
    }
  }

  function openEditModule(m: ModuleSummary) {
    setEditingModule(m);
    setModuleTitle(m.title);
    setModuleDescription(m.description ?? '');
    setCreatingModule(true);
  }

  function closeModuleForm() {
    setCreatingModule(false);
    setEditingModule(null);
    setModuleTitle('');
    setModuleDescription('');
  }

  async function handleSaveModule() {
    if (!programmeId || !accessToken || !moduleTitle.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (editingModule) {
        const updated = await api.patch<ProgrammeDetailResponse>(
          `/api/v1/admin/programmes/${programmeId}/modules/${editingModule.id}`,
          { title: moduleTitle.trim(), description: moduleDescription.trim() || null },
          accessToken,
        );
        setData(updated);
      } else {
        const updated = await api.post<ProgrammeDetailResponse>(
          `/api/v1/admin/programmes/${programmeId}/modules`,
          { title: moduleTitle.trim(), description: moduleDescription.trim() || null },
          accessToken,
        );
        setData(updated);
      }
      closeModuleForm();
    } catch (e: unknown) {
      handleApiError(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteModule() {
    if (!deletingModule || !programmeId || !accessToken) return;
    setSaving(true);
    try {
      await api.delete(
        `/api/v1/admin/programmes/${programmeId}/modules/${deletingModule.id}`,
        accessToken,
      );
      await refreshProgramme();
      setDeletingModule(null);
    } catch (e: unknown) {
      handleApiError(e);
    } finally {
      setSaving(false);
    }
  }

  function openEditLesson(l: LessonSummary, moduleId: string) {
    setEditingLesson(l);
    setLessonModuleId(moduleId);
    setLessonTitle(l.title);
    setLessonType((l.type as LessonType) || 'VIDEO');
    setLessonDuration(l.durationMinutes?.toString() ?? '');
    setLessonExternalUrl(''); // existing response does not yet include URL
    setCreatingLessonFor(moduleId);
  }

  function closeLessonForm() {
    setCreatingLessonFor(null);
    setEditingLesson(null);
    setLessonModuleId(null);
    setLessonTitle('');
    setLessonType('VIDEO');
    setLessonDuration('');
    setLessonExternalUrl('');
  }

  async function handleSaveLesson() {
    const modId = editingLesson ? lessonModuleId : creatingLessonFor;
    if (!accessToken || !lessonTitle.trim() || !modId) return;
    setSaving(true);
    setError(null);
    try {
      if (editingLesson) {
        const updated = await api.patch<ProgrammeDetailResponse>(
          `/api/v1/admin/programmes/modules/${modId}/lessons/${editingLesson.id}`,
          {
            title: lessonTitle.trim(),
            type: lessonType,
            durationMinutes: lessonDuration ? Number(lessonDuration) : null,
            externalUrl:
              lessonType === 'EXTERNAL_LINK'
                ? lessonExternalUrl || null
                : null,
          },
          accessToken,
        );
        setData(updated);
      } else {
        const updated = await api.post<ProgrammeDetailResponse>(
          `/api/v1/admin/programmes/modules/${modId}/lessons`,
          {
            title: lessonTitle.trim(),
            type: lessonType,
            durationMinutes: lessonDuration ? Number(lessonDuration) : null,
            externalUrl:
              lessonType === 'EXTERNAL_LINK'
                ? lessonExternalUrl || null
                : null,
          },
          accessToken,
        );
        setData(updated);
      }
      closeLessonForm();
    } catch (e: unknown) {
      handleApiError(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteLesson() {
    if (!deletingLesson || !accessToken) return;
    const mod = data?.modules.find((m) => m.lessons.some((l) => l.id === deletingLesson.id));
    if (!mod) return;
    setSaving(true);
    try {
      await api.delete(
        `/api/v1/admin/programmes/modules/${mod.id}/lessons/${deletingLesson.id}`,
        accessToken,
      );
      await refreshProgramme();
      setDeletingLesson(null);
    } catch (e: unknown) {
      handleApiError(e);
    } finally {
      setSaving(false);
    }
  }

  function openEditBatch(b: BatchSummary) {
    setEditingBatch(b);
    setBatchName(b.name);
    setBatchStartDate(b.startDate ? String(b.startDate).slice(0, 10) : '');
    setBatchEndDate(b.endDate ? String(b.endDate).slice(0, 10) : '');
    setBatchCapacity(b.capacity != null ? String(b.capacity) : '');
    setCreatingBatch(true);
  }

  function closeBatchForm() {
    setCreatingBatch(false);
    setEditingBatch(null);
    setBatchName('');
    setBatchStartDate('');
    setBatchEndDate('');
    setBatchCapacity('');
  }

  async function handleSaveBatch() {
    if (!programmeId || !accessToken || !batchName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: batchName.trim(),
        startDate: batchStartDate || null,
        endDate: batchEndDate || null,
        capacity: batchCapacity ? Number(batchCapacity) : null,
      };
      if (editingBatch) {
        await api.patch(
          `/api/v1/admin/programmes/batches/${editingBatch.id}`,
          payload,
          accessToken,
        );
        await refreshProgramme();
      } else {
        const updated = await api.post<ProgrammeDetailResponse>(
          `/api/v1/admin/programmes/${programmeId}/batches`,
          payload,
          accessToken,
        );
        setData(updated);
      }
      closeBatchForm();
    } catch (e: unknown) {
      handleApiError(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteBatch() {
    if (!deletingBatch || !accessToken) return;
    setSaving(true);
    try {
      await api.delete(
        `/api/v1/admin/programmes/batches/${deletingBatch.id}`,
        accessToken,
      );
      await refreshProgramme();
      setDeletingBatch(null);
    } catch (e: unknown) {
      handleApiError(e);
    } finally {
      setSaving(false);
    }
  }

  if (!programmeId) return null;

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
            {data?.programme.title ?? 'Programme structure'}
          </h1>
          <p className="text-gray-500">
            Step 2 of 3: Define modules, lessons, and batches. Assign faculty from the batch
            detail page.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/admin/programmes/${programmeId}`)}
          >
            Overview
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/admin/programmes/${programmeId}/settings`)}
          >
            Settings
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-3 text-sm text-red-700">{error}</CardContent>
        </Card>
      )}

      {loading ? (
        <Card>
          <CardContent className="flex items-center gap-2 py-8 text-gray-500">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            Loading...
          </CardContent>
        </Card>
      ) : !data ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-gray-500">
            Programme not found.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="max-w-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="h-4 w-4" />
                Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4 text-xs text-gray-600">
              <Badge variant={data.programme.status === 'ACTIVE' ? 'default' : 'secondary'}>
                {data.programme.status}
              </Badge>
              <span>Category: {data.programme.category ?? 'Not set'}</span>
              <span>Modules: {data.modules.length}</span>
              <span>Lessons: {data.modules.reduce((a, m) => a + m.lessons.length, 0)}</span>
              <span>Batches: {data.batches.length}</span>
              <span>Learners: {data.programme.totalEnrollments}</span>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-[280px] grid-cols-2">
              <TabsTrigger value="structure">Structure</TabsTrigger>
              <TabsTrigger value="batches">Batches</TabsTrigger>
            </TabsList>

            <TabsContent value="structure" className="space-y-4">
          <Card className="max-w-none">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Layers className="h-4 w-4" />
                    Modules & lessons
                  </CardTitle>
                  <Button type="button" size="sm" onClick={() => setCreatingModule(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add module
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data.modules.length === 0 ? (
                    <div className="py-8 text-center text-sm text-gray-500">
                      <p className="mb-4">No modules yet.</p>
                      <Button type="button" onClick={() => setCreatingModule(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add first module
                      </Button>
                    </div>
                  ) : (
                    data.modules.map((m) => (
                      <div
                        key={m.id}
                        className="rounded-lg border border-gray-200 bg-white p-4"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {m.sequence + 1}. {m.title}
                            </p>
                            {m.description && (
                              <p className="text-xs text-gray-500 line-clamp-2">
                                {m.description}
                              </p>
                            )}
                            {!m.isVisible && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                Hidden
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setCreatingLessonFor(m.id)}
                            >
                              <PlusCircle className="mr-1 h-3 w-3" />
                              Lesson
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button type="button" variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditModule(m)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => setDeletingModule(m)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <div className="flex items-center gap-1 text-gray-500">
                              <button
                                type="button"
                                className="rounded border border-gray-200 p-1 hover:bg-gray-100 disabled:text-gray-300 disabled:border-gray-100"
                                disabled={m.sequence === 0}
                                onClick={async () => {
                                  if (!data || !accessToken) return;
                                  const modules = [...data.modules].sort(
                                    (a, b) => a.sequence - b.sequence,
                                  );
                                  const idx = modules.findIndex((mm) => mm.id === m.id);
                                  if (idx <= 0) return;
                                  [modules[idx - 1], modules[idx]] = [
                                    modules[idx],
                                    modules[idx - 1],
                                  ];
                                  const ids = modules.map((mm) => mm.id);
                                  try {
                                    const updated = await api.put<ProgrammeDetailResponse>(
                                      `/api/v1/admin/programmes/${programmeId}/modules/reorder`,
                                      { moduleIds: ids },
                                      accessToken,
                                    );
                                    setData(updated);
                                  } catch (e) {
                                    handleApiError(e);
                                  }
                                }}
                              >
                                <ArrowUp className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                className="rounded border border-gray-200 p-1 hover:bg-gray-100 disabled:text-gray-300 disabled:border-gray-100"
                                disabled={
                                  !data ||
                                  m.sequence ===
                                    Math.max(...data.modules.map((mm) => mm.sequence))
                                }
                                onClick={async () => {
                                  if (!data || !accessToken) return;
                                  const modules = [...data.modules].sort(
                                    (a, b) => a.sequence - b.sequence,
                                  );
                                  const idx = modules.findIndex((mm) => mm.id === m.id);
                                  if (idx === -1 || idx === modules.length - 1) return;
                                  [modules[idx], modules[idx + 1]] = [
                                    modules[idx + 1],
                                    modules[idx],
                                  ];
                                  const ids = modules.map((mm) => mm.id);
                                  try {
                                    const updated = await api.put<ProgrammeDetailResponse>(
                                      `/api/v1/admin/programmes/${programmeId}/modules/reorder`,
                                      { moduleIds: ids },
                                      accessToken,
                                    );
                                    setData(updated);
                                  } catch (e) {
                                    handleApiError(e);
                                  }
                                }}
                              >
                                <ArrowDown className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                        {m.lessons.length === 0 ? (
                          <p className="text-xs text-gray-500">No lessons in this module.</p>
                        ) : (
                          <ul className="mt-2 space-y-1 text-xs text-gray-700">
                            {m.lessons.map((l) => (
                              <li
                                key={l.id}
                                className="flex items-center justify-between rounded py-1 pr-1"
                              >
                                <span>
                                  {l.sequence + 1}. {l.title}{' '}
                                  <span className="text-gray-400">({l.type})</span>
                                  {l.durationMinutes != null && (
                                    <span className="ml-1 text-gray-400">
                                      {l.durationMinutes} min
                                    </span>
                                  )}
                                </span>
                                <div className="flex items-center gap-2">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button type="button" variant="ghost" size="sm">
                                        <MoreVertical className="h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => openEditLesson(l, m.id)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="text-red-600"
                                        onClick={() => setDeletingLesson(l)}
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                  <div className="flex items-center gap-1 text-gray-500">
                                    <button
                                      type="button"
                                      className="rounded border border-gray-200 p-1 hover:bg-gray-100 disabled:text-gray-300 disabled:border-gray-100"
                                      disabled={l.sequence === 0}
                                      onClick={async () => {
                                        if (!accessToken || !data) return;
                                        const mod = data.modules.find((mm) => mm.id === m.id);
                                        if (!mod) return;
                                        const lessons = [...mod.lessons].sort(
                                          (a, b) => a.sequence - b.sequence,
                                        );
                                        const idx = lessons.findIndex((ll) => ll.id === l.id);
                                        if (idx <= 0) return;
                                        [lessons[idx - 1], lessons[idx]] = [
                                          lessons[idx],
                                          lessons[idx - 1],
                                        ];
                                        const ids = lessons.map((ll) => ll.id);
                                        try {
                                          const updated = await api.put<ProgrammeDetailResponse>(
                                            `/api/v1/admin/programmes/modules/${m.id}/lessons/reorder`,
                                            { lessonIds: ids },
                                            accessToken,
                                          );
                                          setData(updated);
                                        } catch (e) {
                                          handleApiError(e);
                                        }
                                      }}
                                    >
                                      <ArrowUp className="h-3 w-3" />
                                    </button>
                                    <button
                                      type="button"
                                      className="rounded border border-gray-200 p-1 hover:bg-gray-100 disabled:text-gray-300 disabled:border-gray-100"
                                      onClick={async () => {
                                        if (!accessToken || !data) return;
                                        const mod = data.modules.find((mm) => mm.id === m.id);
                                        if (!mod) return;
                                        const lessons = [...mod.lessons].sort(
                                          (a, b) => a.sequence - b.sequence,
                                        );
                                        const idx = lessons.findIndex((ll) => ll.id === l.id);
                                        if (idx === -1 || idx === lessons.length - 1) return;
                                        [lessons[idx], lessons[idx + 1]] = [
                                          lessons[idx + 1],
                                          lessons[idx],
                                        ];
                                        const ids = lessons.map((ll) => ll.id);
                                        try {
                                          const updated = await api.put<ProgrammeDetailResponse>(
                                            `/api/v1/admin/programmes/modules/${m.id}/lessons/reorder`,
                                            { lessonIds: ids },
                                            accessToken,
                                          );
                                          setData(updated);
                                        } catch (e) {
                                          handleApiError(e);
                                        }
                                      }}
                                    >
                                      <ArrowDown className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="batches" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-4 w-4" />
                    Batches
                  </CardTitle>
                  <Button type="button" size="sm" onClick={() => setCreatingBatch(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create batch
                  </Button>
                </CardHeader>
                <CardContent>
                  {data.batches.length === 0 ? (
                    <div className="py-8 text-center text-sm text-gray-500">
                      <p className="mb-4">No batches yet.</p>
                      <Button type="button" onClick={() => setCreatingBatch(true)}>
                        Create first batch
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {data.batches.map((b) => (
                        <Card
                          key={b.id}
                          className="cursor-pointer transition-shadow hover:shadow-md"
                          onClick={() =>
                            router.push(
                              `/admin/programmes/${programmeId}/batches/${b.id}`,
                            )
                          }
                        >
                          <CardContent className="p-4">
                            <div className="mb-2 flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold text-gray-900">{b.name}</h3>
                                <Badge
                                  variant={b.status === 'ACTIVE' ? 'default' : 'secondary'}
                                  className="mt-1"
                                >
                                  {b.status}
                                </Badge>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(ev) => ev.stopPropagation()}>
                                  <Button type="button" variant="ghost" size="sm">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={(ev) => {
                                      ev.stopPropagation();
                                      router.push(
                                        `/admin/programmes/${programmeId}/batches/${b.id}`,
                                      );
                                    }}
                                  >
                                    View details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(ev) => {
                                      ev.stopPropagation();
                                      openEditBatch(b);
                                    }}
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={(ev) => {
                                      ev.stopPropagation();
                                      setDeletingBatch(b);
                                    }}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {b.startDate
                                  ? new Date(b.startDate).toLocaleDateString()
                                  : '—'}{' '}
                                –{' '}
                                {b.endDate
                                  ? new Date(b.endDate).toLocaleDateString()
                                  : '—'}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-gray-600">
                              <Users className="h-3 w-3" />
                              <span>Capacity: {b.capacity ?? 'Unlimited'}</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      <Dialog open={creatingModule} onOpenChange={(open) => !open && closeModuleForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingModule ? 'Edit module' : 'Add module'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="module-title">Module title *</Label>
              <Input
                id="module-title"
                value={moduleTitle}
                onChange={(e) => setModuleTitle(e.target.value)}
                placeholder="e.g. Introduction to ML"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="module-desc">Description</Label>
              <textarea
                id="module-desc"
                className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={moduleDescription}
                onChange={(e) => setModuleDescription(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeModuleForm}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSaveModule()}
              disabled={saving || !moduleTitle.trim()}
            >
              {saving ? 'Saving...' : editingModule ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={creatingLessonFor != null}
        onOpenChange={(open) => !open && closeLessonForm()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLesson ? 'Edit lesson' : 'Add lesson'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="lesson-title">Lesson title *</Label>
              <Input
                id="lesson-title"
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                placeholder="e.g. Lesson 1.1"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={lessonType}
                  onValueChange={(v) => setLessonType(v as LessonType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIDEO">Video</SelectItem>
                    <SelectItem value="DOCUMENT">Document</SelectItem>
                    <SelectItem value="LIVE_CLASS">Live class</SelectItem>
                    <SelectItem value="ASSESSMENT">Assessment</SelectItem>
                    <SelectItem value="EXTERNAL_LINK">External link</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lesson-duration">Duration (min)</Label>
                <Input
                  id="lesson-duration"
                  type="number"
                  min={0}
                  value={lessonDuration}
                  onChange={(e) => setLessonDuration(e.target.value)}
                  placeholder="25"
                />
              </div>
            </div>
            {lessonType === 'EXTERNAL_LINK' && (
              <div className="space-y-2">
                <Label htmlFor="lesson-url">External URL</Label>
                <Input
                  id="lesson-url"
                  type="url"
                  value={lessonExternalUrl}
                  onChange={(e) => setLessonExternalUrl(e.target.value)}
                  placeholder="https://example.com/resource"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeLessonForm}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSaveLesson()}
              disabled={saving || !lessonTitle.trim() || !(creatingLessonFor || lessonModuleId)}
            >
              {saving ? 'Saving...' : editingLesson ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={creatingBatch} onOpenChange={(open) => !open && closeBatchForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBatch ? 'Edit batch' : 'Create batch'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="batch-name">Batch name *</Label>
              <Input
                id="batch-name"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                placeholder="e.g. Batch A – March 2026"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Start date</Label>
                <Input
                  type="date"
                  value={batchStartDate}
                  onChange={(e) => setBatchStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End date</Label>
                <Input
                  type="date"
                  value={batchEndDate}
                  onChange={(e) => setBatchEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="batch-capacity">Capacity (optional)</Label>
              <Input
                id="batch-capacity"
                type="number"
                min={0}
                value={batchCapacity}
                onChange={(e) => setBatchCapacity(e.target.value)}
                placeholder="Unlimited"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeBatchForm}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSaveBatch()}
              disabled={saving || !batchName.trim()}
            >
              {saving ? 'Saving...' : editingBatch ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deletingModule != null}
        onOpenChange={(open) => !open && setDeletingModule(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete module</DialogTitle>
            <DialogDescription>
              Delete &quot;{deletingModule?.title}&quot;? This will remove all lessons in this
              module. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeletingModule(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDeleteModule()}
              disabled={saving}
            >
              {saving ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deletingLesson != null}
        onOpenChange={(open) => !open && setDeletingLesson(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete lesson</DialogTitle>
            <DialogDescription>
              Delete &quot;{deletingLesson?.title}&quot;? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeletingLesson(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDeleteLesson()}
              disabled={saving}
            >
              {saving ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deletingBatch != null}
        onOpenChange={(open) => !open && setDeletingBatch(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete batch</DialogTitle>
            <DialogDescription>
              Delete batch &quot;{deletingBatch?.name}&quot;? This is only allowed when there are
              no active enrollments. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeletingBatch(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDeleteBatch()}
              disabled={saving}
            >
              {saving ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
