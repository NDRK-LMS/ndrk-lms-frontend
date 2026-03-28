'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Users,
  GraduationCap,
  UserPlus,
  Trash2,
  Calendar,
  ArrowLeft,
  MoreVertical,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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

interface BatchDetailResponse {
  batch: {
    id: string;
    name: string;
    status: string;
    startDate?: string | null;
    endDate?: string | null;
    capacity?: number | null;
    programme: { id: string; title: string };
    totalEnrollments: number;
    createdAt: string;
    updatedAt: string;
  };
  enrollments: Array<{
    id: string;
    userId: string;
    enrolledAt: string;
    status: string;
    progressPercent?: number;
    user: {
      id: string;
      fullName: string;
      email: string;
      avatarUrl?: string | null;
      status: string;
    };
  }>;
  faculty: Array<{
    id: string;
    role: string;
    assignedAt: string;
    user: {
      id: string;
      fullName: string;
      email: string;
      avatarUrl?: string | null;
      role: string;
    };
  }>;
}

interface UsersListResponse {
  users: Array<{
    id: string;
    fullName: string;
    email: string;
    role: string;
    status: string;
  }>;
}

export default function AdminBatchDetailPage() {
  const router = useRouter();
  const params = useParams();
  const programmeId = params?.id as string;
  const batchId = params?.batchId as string;
  const accessToken = useAuthStore((s) => s.accessToken);

  const [data, setData] = React.useState<BatchDetailResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [enrollOpen, setEnrollOpen] = React.useState(false);
  const [assignFacultyOpen, setAssignFacultyOpen] = React.useState(false);
  const [usersList, setUsersList] = React.useState<UsersListResponse['users']>([]);
  const [usersLoading, setUsersLoading] = React.useState(false);
  const [selectedUserIds, setSelectedUserIds] = React.useState<string[]>([]);
  const [selectedFacultyId, setSelectedFacultyId] = React.useState('');
  const [facultyRole, setFacultyRole] = React.useState('PRIMARY');
  const [removingEnrollmentId, setRemovingEnrollmentId] = React.useState<string | null>(null);
  const [removingFacultyId, setRemovingFacultyId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!batchId || !accessToken) return;
    void loadBatch();
  }, [batchId, accessToken]);

  function handleApiError(e: unknown) {
    if (e instanceof ApiError && e.status === 401) {
      useAuthStore.getState().clearAuth();
      router.push('/auth/login');
      return;
    }
    setError(e instanceof Error ? e.message : 'An error occurred');
  }

  async function loadBatch() {
    if (!batchId || !accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<BatchDetailResponse>(
        `/api/v1/admin/programmes/batches/${batchId}`,
        accessToken,
      );
      setData(res);
    } catch (e: unknown) {
      handleApiError(e);
    } finally {
      setLoading(false);
    }
  }

  async function loadUsersForEnroll() {
    if (!accessToken) return;
    setUsersLoading(true);
    try {
      const res = await api.get<UsersListResponse>(
        '/api/v1/admin/users?role=LEARNER&status=ACTIVE&limit=100',
        accessToken,
      );
      const enrolledIds = new Set(data?.enrollments.map((e) => e.userId) ?? []);
      setUsersList((res.users ?? []).filter((u) => !enrolledIds.has(u.id)));
    } catch (e: unknown) {
      handleApiError(e);
    } finally {
      setUsersLoading(false);
    }
  }

  async function loadFacultyCandidates() {
    if (!accessToken) return;
    setUsersLoading(true);
    try {
      const [facultyRes, guestRes] = await Promise.all([
        api.get<UsersListResponse>(
          '/api/v1/admin/users?role=FACULTY&status=ACTIVE&limit=100',
          accessToken,
        ),
        api.get<UsersListResponse>(
          '/api/v1/admin/users?role=GUEST_FACULTY&status=ACTIVE&limit=100',
          accessToken,
        ),
      ]);
      const combined = [...(facultyRes.users ?? []), ...(guestRes.users ?? [])];
      const assignedIds = new Set(data?.faculty.map((f) => f.user.id) ?? []);
      setUsersList(combined.filter((u) => !assignedIds.has(u.id)));
    } catch (e: unknown) {
      handleApiError(e);
    } finally {
      setUsersLoading(false);
    }
  }

  async function handleEnroll() {
    if (!batchId || !accessToken || selectedUserIds.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await api.post(
        `/api/v1/admin/programmes/batches/${batchId}/enroll`,
        { userIds: selectedUserIds },
        accessToken,
      );
      await loadBatch();
      setEnrollOpen(false);
      setSelectedUserIds([]);
    } catch (e: unknown) {
      handleApiError(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveEnrollment(enrollmentId: string) {
    if (!accessToken) return;
    setRemovingEnrollmentId(enrollmentId);
    setSaving(true);
    try {
      await api.delete(
        `/api/v1/admin/programmes/batches/${batchId}/enrollments/${enrollmentId}`,
        accessToken,
      );
      await loadBatch();
    } catch (e: unknown) {
      handleApiError(e);
    } finally {
      setSaving(false);
      setRemovingEnrollmentId(null);
    }
  }

  async function handleAssignFaculty() {
    if (!batchId || !accessToken || !selectedFacultyId) return;
    setSaving(true);
    setError(null);
    try {
      await api.post(
        `/api/v1/admin/programmes/batches/${batchId}/faculty`,
        { userId: selectedFacultyId, role: facultyRole },
        accessToken,
      );
      await loadBatch();
      setAssignFacultyOpen(false);
      setSelectedFacultyId('');
    } catch (e: unknown) {
      handleApiError(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveFaculty(userId: string) {
    if (!accessToken) return;
    setRemovingFacultyId(userId);
    setSaving(true);
    try {
      await api.delete(
        `/api/v1/admin/programmes/batches/${batchId}/faculty/${userId}`,
        accessToken,
      );
      await loadBatch();
    } catch (e: unknown) {
      handleApiError(e);
    } finally {
      setSaving(false);
      setRemovingFacultyId(null);
    }
  }

  if (!programmeId || !batchId) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            type="button"
            className="mb-1 flex items-center gap-1 text-xs text-blue-600 hover:underline"
            onClick={() => router.push(`/admin/programmes/${programmeId}/structure`)}
          >
            <ArrowLeft className="h-3 w-3" />
            Back to structure
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {data?.batch.name ?? 'Batch'}
          </h1>
          <p className="text-gray-500">
            {data?.batch.programme.title} — Enrollments & faculty
          </p>
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
            Loading batch...
          </CardContent>
        </Card>
      ) : !data ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-gray-500">
            Batch not found.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Batch info</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4 text-sm text-gray-600">
              <Badge variant={data.batch.status === 'ACTIVE' ? 'default' : 'secondary'}>
                {data.batch.status}
              </Badge>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {data.batch.startDate
                  ? new Date(data.batch.startDate).toLocaleDateString()
                  : '—'}{' '}
                –{' '}
                {data.batch.endDate
                  ? new Date(data.batch.endDate).toLocaleDateString()
                  : '—'}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {data.batch.totalEnrollments}
                {data.batch.capacity != null ? ` / ${data.batch.capacity}` : ''} learners
              </span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Enrolled learners
              </CardTitle>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  loadUsersForEnroll();
                  setEnrollOpen(true);
                }}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Enroll learners
              </Button>
            </CardHeader>
            <CardContent>
              {data.enrollments.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">
                  No learners enrolled yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {data.enrollments.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-600">
                          {e.user.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{e.user.fullName}</p>
                          <p className="text-xs text-gray-500">{e.user.email}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {e.status}
                            </Badge>
                            {e.progressPercent != null && (
                              <span className="text-xs text-gray-500">
                                Progress: {e.progressPercent}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleRemoveEnrollment(e.id)}
                            disabled={saving && removingEnrollmentId === e.id}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove enrollment
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <GraduationCap className="h-4 w-4" />
                Faculty (batch-level)
              </CardTitle>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  loadFacultyCandidates();
                  setAssignFacultyOpen(true);
                }}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Assign faculty
              </Button>
            </CardHeader>
            <CardContent>
              {data.faculty.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">
                  No faculty assigned to this batch.
                </p>
              ) : (
                <div className="space-y-2">
                  {data.faculty.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700">
                          {f.user.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{f.user.fullName}</p>
                          <p className="text-xs text-gray-500">{f.user.email}</p>
                          <Badge variant="outline" className="mt-1 text-xs">
                            {f.role}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleRemoveFaculty(f.user.id)}
                        disabled={saving && removingFacultyId === f.user.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enroll learners</DialogTitle>
            <DialogDescription>
              Select learners to add to this batch. Already enrolled users are not shown.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {usersLoading ? (
              <p className="text-sm text-gray-500">Loading users...</p>
            ) : (
              <div className="max-h-[300px] space-y-2 overflow-y-auto">
                {usersList.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No more learners available to enroll.
                  </p>
                ) : (
                  usersList.map((u) => (
                    <label
                      key={u.id}
                      className="flex cursor-pointer items-center gap-2 rounded border p-2 hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(u.id)}
                        onChange={(ev) => {
                          if (ev.target.checked) {
                            setSelectedUserIds((prev) => [...prev, u.id]);
                          } else {
                            setSelectedUserIds((prev) => prev.filter((id) => id !== u.id));
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className="text-sm font-medium">{u.fullName}</span>
                      <span className="text-xs text-gray-500">{u.email}</span>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEnrollOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleEnroll()}
              disabled={saving || selectedUserIds.length === 0}
            >
              {saving ? 'Enrolling...' : `Enroll ${selectedUserIds.length} learner(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assignFacultyOpen} onOpenChange={setAssignFacultyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign faculty</DialogTitle>
            <DialogDescription>
              Select a faculty member to assign to this batch.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {usersLoading ? (
              <p className="text-sm text-gray-500">Loading faculty...</p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Faculty</Label>
                  <Select
                    value={selectedFacultyId}
                    onValueChange={setSelectedFacultyId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select faculty..." />
                    </SelectTrigger>
                    <SelectContent>
                      {usersList.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.fullName} ({u.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={facultyRole} onValueChange={setFacultyRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PRIMARY">Primary</SelectItem>
                      <SelectItem value="SECONDARY">Secondary</SelectItem>
                      <SelectItem value="GUEST">Guest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAssignFacultyOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleAssignFaculty()}
              disabled={saving || !selectedFacultyId}
            >
              {saving ? 'Assigning...' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
