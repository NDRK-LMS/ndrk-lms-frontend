'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  Filter,
  Download,
  Upload,
  Plus,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  Shield,
  Eye,
  Edit,
  Trash2,
  Calendar,
  CheckSquare,
  XSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { api, ApiError, getApiBase } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { CreateUserModal } from '@/components/admin/create-user-modal';

interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
  avatarUrl?: string | null;
}

interface UsersResponse {
  users: AdminUser[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  disabledUsers: number;
  newThisMonth: number;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    created: number;
    skipped: number;
    errors: Array<{ row: number; email: string; message: string }>;
  } | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState(''); // local value for controlled input; sync to search on Enter or debounce
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const canModify = isSuperAdmin;

  useEffect(() => {
    if (!accessToken) return;
    void fetchUsers();
  }, [accessToken, page, limit, roleFilter, statusFilter, search]);

  // Debounce search: 400ms after user stops typing, update search so fetch runs
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
      searchDebounceRef.current = null;
    }, 400);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchInput]);

  useEffect(() => {
    if (!accessToken) return;
    void fetchStats();
  }, [accessToken]);

  async function fetchUsers() {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search.trim()) params.set('search', search.trim());
      if (roleFilter && roleFilter !== 'all') params.set('role', roleFilter);
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      params.set('sortBy', 'createdAt');
      params.set('sortOrder', 'desc');

      const list = await api.get<UsersResponse>(
        `/api/v1/admin/users?${params.toString()}`,
        accessToken
      );
      setUsers(list.users);
      setTotalPages(list.totalPages || 1);
      setTotalCount(list.total);
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 401) {
        clearAuth();
        router.push('/auth/login');
        return;
      }
      setError(e instanceof Error ? e.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  async function fetchStats() {
    if (!accessToken) return;
    try {
      const stat = await api.get<UserStats>('/api/v1/admin/users/stats', accessToken);
      setStats(stat);
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 401) {
        clearAuth();
        router.push('/auth/login');
      }
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedUsers(users.map((u) => u.id));
    else setSelectedUsers([]);
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) setSelectedUsers([...selectedUsers, userId]);
    else setSelectedUsers(selectedUsers.filter((id) => id !== userId));
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !accessToken) return;
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${getApiBase()}/api/v1/admin/users/bulk-import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new ApiError(data.message ?? 'Import failed', res.status);
      setImportResult(data);
      await fetchUsers();
      await fetchStats();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearAuth();
        router.push('/auth/login');
        return;
      }
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csv = 'email,fullName,role,phone,password\nuser1@example.com,John Doe,LEARNER,,tempPass123\nuser2@example.com,Jane Smith,FACULTY,+919876543210,';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    const data = users.map((u) => ({
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      status: u.status,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  async function handleBulkAction(action: 'enable' | 'disable') {
    if (!accessToken || selectedUsers.length === 0) return;
    try {
      await api.patch(
        '/api/v1/admin/users/bulk',
        { action, userIds: selectedUsers },
        accessToken
      );
      setSelectedUsers([]);
      await fetchUsers();
      await fetchStats();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Bulk action failed');
    }
  }

  async function toggleUserStatus(u: AdminUser) {
    if (!accessToken || !canModify) return;
    const newStatus = u.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
      await api.patch(
        `/api/v1/admin/users/${u.id}`,
        { status: newStatus },
        accessToken
      );
      await fetchUsers();
      await fetchStats();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update status');
    }
  }

  function getRoleBadgeColor(role: string) {
    const colors: Record<string, string> = {
      SUPER_ADMIN: 'bg-red-100 text-red-800 border-red-200',
      PROGRAMME_ADMIN: 'bg-orange-100 text-orange-800 border-orange-200',
      FACULTY: 'bg-blue-100 text-blue-800 border-blue-200',
      GUEST_FACULTY: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      EVALUATOR: 'bg-purple-100 text-purple-800 border-purple-200',
      LEARNER: 'bg-green-100 text-green-800 border-green-200',
    };
    return colors[role] ?? 'bg-gray-100 text-gray-800 border-gray-200';
  }

  function getStatusBadge(status: string) {
    const isActive = status === 'ACTIVE';
    return (
      <Badge
        className={
          isActive
            ? 'border-0 bg-green-100 text-green-800'
            : 'border-0 bg-red-100 text-red-800'
        }
      >
        {isActive ? (
          <UserCheck className="mr-1 h-3 w-3" />
        ) : (
          <UserX className="mr-1 h-3 w-3" />
        )}
        {status}
      </Badge>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500">Manage system users, roles, and access</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canModify && (
            <>
              <Button variant="outline" onClick={downloadTemplate} className="gap-2">
                <Download className="h-4 w-4" />
                Template
              </Button>
              <Button
                variant="outline"
                onClick={() => importFileRef.current?.click()}
                disabled={importing}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                {importing ? 'Importing...' : 'Import CSV'}
              </Button>
              <input
                ref={importFileRef}
                type="file"
                accept=".csv,text/csv,text/plain"
                className="hidden"
                onChange={handleImportCSV}
              />
              <Button variant="outline" onClick={handleExport} className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
              <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add User
              </Button>
            </>
          )}
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            title="TOTAL USERS"
            value={stats.totalUsers}
            icon={Shield}
            color="blue"
          />
          <StatCard
            title="ACTIVE"
            value={stats.activeUsers}
            icon={UserCheck}
            color="green"
          />
          <StatCard
            title="DISABLED"
            value={stats.disabledUsers}
            icon={UserX}
            color="red"
          />
          <StatCard
            title="NEW THIS MONTH"
            value={stats.newThisMonth}
            icon={Calendar}
            color="purple"
          />
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-md">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (searchDebounceRef.current) {
                  clearTimeout(searchDebounceRef.current);
                  searchDebounceRef.current = null;
                }
                setSearch(searchInput);
                setPage(1);
              }}
            >
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <Input
                placeholder="Search by name or email..."
                className="pl-10"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </form>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select
              value={roleFilter}
              onValueChange={(v) => {
                setRoleFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                <SelectItem value="PROGRAMME_ADMIN">Programme Admin</SelectItem>
                <SelectItem value="FACULTY">Faculty</SelectItem>
                <SelectItem value="GUEST_FACULTY">Guest Faculty</SelectItem>
                <SelectItem value="EVALUATOR">Evaluator</SelectItem>
                <SelectItem value="LEARNER">Learner</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="DISABLED">Disabled</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={String(limit)}
              onValueChange={(v) => {
                setLimit(Number(v));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="25 per page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedUsers.length > 0 && canModify && (
          <div className="flex items-center justify-between rounded-lg bg-blue-50 p-3">
            <span className="text-sm font-medium text-blue-900">
              {selectedUsers.length} user(s) selected
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => void handleBulkAction('enable')}
              >
                <CheckSquare className="mr-1 h-4 w-4" />
                Enable
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void handleBulkAction('disable')}
              >
                <XSquare className="mr-1 h-4 w-4" />
                Disable
              </Button>
            </div>
          </div>
        )}

      <Card className="w-full max-w-none">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 hover:bg-gray-50">
              {canModify && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      users.length > 0 && selectedUsers.length === users.length
                    }
                    onCheckedChange={(c) => handleSelectAll(c === true)}
                  />
                </TableHead>
              )}
              <TableHead>USER</TableHead>
              <TableHead>ROLE</TableHead>
              <TableHead>STATUS</TableHead>
              <TableHead>LAST LOGIN</TableHead>
              <TableHead>JOINED</TableHead>
              <TableHead className="w-24">ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={canModify ? 7 : 6}
                  className="py-12 text-center"
                >
                  <div className="flex items-center justify-center gap-2 text-gray-500">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                    Loading users...
                  </div>
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canModify ? 7 : 6}
                  className="py-12 text-center"
                >
                  <div className="flex flex-col items-center gap-2 text-gray-500">
                    <Shield className="h-12 w-12 text-gray-300" />
                    <p>
                      {search.trim()
                        ? `No user found matching "${search}". Try a different name or email, or clear filters.`
                        : 'No users found'}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearch('');
                        setSearchInput('');
                        setRoleFilter('all');
                        setStatusFilter('all');
                        setPage(1);
                      }}
                    >
                      Clear filters
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id} className="group">
                  {canModify && (
                    <TableCell>
                      <Checkbox
                        checked={selectedUsers.includes(u.id)}
                        onCheckedChange={(c) =>
                          handleSelectUser(u.id, c === true)
                        }
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-sm font-medium text-white">
                        {u.avatarUrl ? (
                          <img
                            src={u.avatarUrl}
                            alt={u.fullName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          u.fullName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{u.fullName}</p>
                        <p className="text-sm text-gray-500">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`border ${getRoleBadgeColor(u.role)}`}
                    >
                      {u.role.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(u.status)}</TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {u.lastLoginAt
                      ? new Date(u.lastLoginAt).toLocaleDateString()
                      : 'Never'}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {new Date(u.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(`/admin/users/${u.id}`)
                          }
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        {canModify && (
                          <>
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(`/admin/users/${u.id}/edit`)
                              }
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit User
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => toggleUserStatus(u)}
                            >
                              {u.status === 'ACTIVE' ? (
                                <>
                                  <XSquare className="mr-2 h-4 w-4 text-red-600" />
                                  <span className="text-red-600">
                                    Disable Account
                                  </span>
                                </>
                              ) : (
                                <>
                                  <CheckSquare className="mr-2 h-4 w-4 text-green-600" />
                                  <span className="text-green-600">
                                    Enable Account
                                  </span>
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={async () => {
                                if (
                                  !confirm(
                                    'Are you sure you want to delete this user?'
                                  )
                                )
                                  return;
                                try {
                                  await api.delete(
                                    `/api/v1/admin/users/${u.id}`,
                                    accessToken
                                  );
                                  await fetchUsers();
                                  await fetchStats();
                                } catch (err) {
                                  alert(
                                    err instanceof Error
                                      ? err.message
                                      : 'Delete failed'
                                  );
                                }
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between border-t bg-gray-50 px-4 py-4">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * limit + 1} to{' '}
            {Math.min(page * limit, totalCount)} of {totalCount} users
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="px-2 text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <Dialog open={!!importResult} onOpenChange={(open) => !open && setImportResult(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import result</DialogTitle>
            <DialogDescription>
              {importResult && (
                <>
                  <strong>{importResult.created}</strong> user(s) created.
                  {importResult.skipped > 0 && (
                    <> <strong>{importResult.skipped}</strong> row(s) skipped or failed.</>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {importResult && importResult.errors.length > 0 && (
            <div className="max-h-48 space-y-1 overflow-y-auto rounded border bg-gray-50 p-2 text-sm">
              {importResult.errors.slice(0, 20).map((err, i) => (
                <div key={i} className="text-red-700">
                  Row {err.row}: {err.email} — {err.message}
                </div>
              ))}
              {importResult.errors.length > 20 && (
                <p className="text-gray-500">… and {importResult.errors.length - 20} more errors</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <CreateUserModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          void fetchUsers();
          void fetchStats();
        }}
      />
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'green' | 'red' | 'purple';
}) {
  const colors: Record<string, string> = {
    blue: 'border-blue-200 bg-blue-50 text-blue-600',
    green: 'border-green-200 bg-green-50 text-green-600',
    red: 'border-red-200 bg-red-50 text-red-600',
    purple: 'border-purple-200 bg-purple-50 text-purple-600',
  };
  return (
    <Card className={`border-2 ${colors[color]}`}>
      <CardContent className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wider opacity-80">
          {title}
        </p>
        <div className="mt-2 flex items-end justify-between">
          <p className="text-3xl font-bold">{value}</p>
          <Icon className="h-6 w-6 opacity-60" />
        </div>
      </CardContent>
    </Card>
  );
}
