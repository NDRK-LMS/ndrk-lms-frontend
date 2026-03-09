'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Mail,
  Phone,
  Shield,
  Calendar,
  Edit,
  UserX,
  UserCheck,
  Trash2,
  Award,
  BookOpen,
  Activity,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

interface UserDetail {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  role: string;
  status: string;
  avatarUrl?: string | null;
  bio?: string | null;
  googleId?: string | null;
  mfaEnabled?: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
  enrollments?: Array<{
    id: string;
    programme?: { title: string };
    batch?: { name: string };
    progress?: number;
    status: string;
  }>;
  activities?: Array<{ action: string; details?: string; createdAt: string }>;
  grades?: Array<{
    id: string;
    assessmentTitle?: string;
    programmeName?: string;
    score?: number;
    status?: string;
  }>;
  certificates?: Array<{
    id: string;
    programmeName?: string;
    certificateNumber?: string;
    issuedAt?: string;
  }>;
  auditLogs?: Array<{
    action: string;
    resourceType?: string;
    resourceId?: string;
    details?: unknown;
    createdAt: string;
  }>;
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const currentUser = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);

  const [user, setUser] = useState<UserDetail | null>(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const canEdit = isSuperAdmin;

  useEffect(() => {
    if (!accessToken || !id) return;
    void fetchUserDetail();
  }, [accessToken, id]);

  async function fetchUserDetail() {
    if (!accessToken || !id) return;
    try {
      const data = await api.get<UserDetail>(
        `/api/v1/admin/users/${id}`,
        accessToken
      );
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function toggleStatus() {
    if (!user || !accessToken || !canEdit) return;
    const newStatus = user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
      await api.patch(
        `/api/v1/admin/users/${user.id}`,
        { status: newStatus },
        accessToken
      );
      await fetchUserDetail();
    } catch {
      alert('Failed to update status');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-4">
        <Link href="/admin/users">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <p className="text-gray-500">User not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/users">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{user.fullName}</h1>
            <p className="text-gray-500">{user.email}</p>
          </div>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/admin/users/${id}/edit`)}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button
              variant={user.status === 'ACTIVE' ? 'destructive' : 'default'}
              onClick={() => void toggleStatus()}
            >
              {user.status === 'ACTIVE' ? (
                <>
                  <UserX className="mr-2 h-4 w-4" />
                  Disable
                </>
              ) : (
                <>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Enable
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-3xl font-bold text-white">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                user.fullName.charAt(0)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center gap-3">
                <h2 className="text-xl font-semibold">{user.fullName}</h2>
                <Badge
                  className={
                    user.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }
                >
                  {user.status}
                </Badge>
                {user.mfaEnabled && (
                  <Badge
                    variant="outline"
                    className="border-blue-200 text-blue-600"
                  >
                    <Lock className="mr-1 h-3 w-3" />
                    MFA Enabled
                  </Badge>
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                <InfoItem icon={Mail} label="Email" value={user.email} />
                <InfoItem
                  icon={Phone}
                  label="Phone"
                  value={user.phone ?? 'Not provided'}
                />
                <InfoItem
                  icon={Shield}
                  label="Role"
                  value={user.role.replace('_', ' ')}
                />
                <InfoItem
                  icon={Calendar}
                  label="Joined"
                  value={new Date(user.createdAt).toLocaleDateString()}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="grades">Grades</TabsTrigger>
          <TabsTrigger value="certificates">Certificates</TabsTrigger>
          {isSuperAdmin && <TabsTrigger value="audit">Audit</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">User ID</label>
                  <p className="font-mono text-sm">{user.id}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Google ID</label>
                  <p className="font-mono text-sm">
                    {user.googleId ?? 'Not linked'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Last Login</label>
                  <p>
                    {user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleString()
                      : 'Never'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Account Status</label>
                  <p
                    className={
                      user.status === 'ACTIVE'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }
                  >
                    {user.status}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {isSuperAdmin && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <Trash2 className="h-5 w-5" />
                  Danger Zone
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg bg-red-50 p-4">
                  <div>
                    <p className="font-medium">Delete Account</p>
                    <p className="text-sm text-gray-600">
                      Permanently disable this user (soft delete).
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      if (
                        !confirm(
                          'Disable this user? They will not be able to log in.'
                        )
                      )
                        return;
                      try {
                        await api.delete(
                          `/api/v1/admin/users/${user.id}`,
                          accessToken
                        );
                        router.push('/admin/users');
                      } catch {
                        alert('Delete failed');
                      }
                    }}
                  >
                    Delete User
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="enrollments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Programme Enrollments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {user.enrollments && user.enrollments.length > 0 ? (
                <div className="space-y-4">
                  {user.enrollments.map((enrollment) => (
                    <div
                      key={enrollment.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div>
                        <p className="font-medium">
                          {enrollment.programme?.title ?? 'Programme'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {enrollment.batch?.name ?? '—'}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        {enrollment.progress != null && (
                          <div className="w-32">
                            <div className="mb-1 flex justify-between text-xs">
                              <span>Progress</span>
                              <span>{enrollment.progress}%</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-gray-200">
                              <div
                                className="h-2 rounded-full bg-blue-600"
                                style={{ width: `${enrollment.progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                        <Badge>{enrollment.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-gray-500">
                  No enrollments found
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {user.activities && user.activities.length > 0 ? (
                <div className="space-y-4">
                  {user.activities.map((activity, idx) => (
                    <div
                      key={idx}
                      className="border-l-4 border-blue-500 bg-gray-50 p-4"
                    >
                      <p className="font-medium">{activity.action}</p>
                      {activity.details && (
                        <p className="text-sm text-gray-500">
                          {activity.details}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-400">
                        {new Date(activity.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-gray-500">
                  No recent activity
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grades">
          <Card>
            <CardHeader>
              <CardTitle>Assessment Grades</CardTitle>
            </CardHeader>
            <CardContent>
              {user.grades && user.grades.length > 0 ? (
                <div className="space-y-4">
                  {user.grades.map((grade) => (
                    <div
                      key={grade.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div>
                        <p className="font-medium">
                          {grade.assessmentTitle ?? 'Assessment'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {grade.programmeName ?? '—'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-600">
                          {grade.score ?? '—'}%
                        </p>
                        <p className="text-xs text-gray-500">
                          {grade.status ?? '—'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-gray-500">
                  No grades available
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="certificates">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Issued Certificates
              </CardTitle>
            </CardHeader>
            <CardContent>
              {user.certificates && user.certificates.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {user.certificates.map((cert) => (
                    <div
                      key={cert.id}
                      className="rounded-lg border bg-gradient-to-br from-yellow-50 to-orange-50 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <Award className="h-8 w-8 text-yellow-600" />
                        <div>
                          <p className="font-medium">
                            {cert.programmeName ?? 'Programme'}
                          </p>
                          <p className="text-sm text-gray-600">
                            ID: {cert.certificateNumber ?? '—'}
                          </p>
                          {cert.issuedAt && (
                            <p className="mt-2 text-xs text-gray-500">
                              Issued:{' '}
                              {new Date(cert.issuedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-gray-500">
                  No certificates issued
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isSuperAdmin && (
          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle>Audit Trail</CardTitle>
              </CardHeader>
              <CardContent>
                {user.auditLogs && user.auditLogs.length > 0 ? (
                  <div className="space-y-4">
                    {user.auditLogs.map((log, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border p-4 font-mono text-sm"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <Badge variant="outline">{log.action}</Badge>
                          <span className="text-gray-500">
                            {new Date(log.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-gray-700">
                          {log.resourceType}: {log.resourceId}
                        </p>
                        {log.details != null && (
                          <pre className="mt-2 overflow-auto rounded bg-gray-100 p-2 text-xs">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-gray-500">
                    No audit logs
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-gray-400" />
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}
