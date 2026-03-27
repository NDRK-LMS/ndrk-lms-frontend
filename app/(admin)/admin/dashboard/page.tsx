'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  BookOpen,
  UsersRound,
  GraduationCap,
  TrendingUp,
  Clock,
  AlertCircle,
  Activity,
  Server,
  Database,
  HardDrive,
  ClipboardCheck,
  CalendarDays,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { UserRole } from '@ndrk/shared';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalProgrammes: number;
  activeProgrammes: number;
  totalBatches: number;
  totalEnrollments: number;
  pendingGrading: number;
  upcomingClasses: number;
  systemHealth: { database: string; storage: string; api: string };
}

interface ChartData {
  enrollmentTrend: { date: string; count: number }[];
  gradeDistribution: { range: string; count: number }[];
}

interface ActivityItem {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  actor: string;
  actorId: string | null;
  details: unknown;
  time: string;
}

export default function AdminDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const message = useAuthStore((s) => s.message);
  const clearWelcomeMessage = useAuthStore((s) => s.clearWelcomeMessage);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [charts, setCharts] = useState<ChartData | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartRange, setChartRange] = useState<string>('30d');

  useEffect(() => {
    if (message) {
      const t = setTimeout(clearWelcomeMessage, 5000);
      return () => clearTimeout(t);
    }
  }, [message, clearWelcomeMessage]);

  useEffect(() => {
    if (!accessToken) return;

    Promise.all([
      api.get<DashboardStats>('/api/v1/admin/dashboard/stats', accessToken),
      api.get<ChartData>(`/api/v1/admin/dashboard/charts?range=${chartRange}`, accessToken),
      api.get<{ activities: ActivityItem[] }>('/api/v1/admin/dashboard/activity?limit=10', accessToken),
    ])
      .then(([statsData, chartsData, activityData]) => {
        setStats(statsData);
        setCharts(chartsData);
        setActivities(activityData.activities ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accessToken, chartRange]);

  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;
  const isProgrammeAdmin = user?.role === UserRole.PROGRAMME_ADMIN;
  const isFaculty =
    user?.role === UserRole.FACULTY || user?.role === UserRole.GUEST_FACULTY;
  const isEvaluator = user?.role === UserRole.EVALUATOR;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-20 animate-pulse rounded-xl bg-gray-200" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className="flex items-center gap-4 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
          <div className="rounded-full bg-blue-100 p-3">
            <TrendingUp className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-900">
              Welcome back, {user?.fullName}!
            </h3>
            <p className="text-blue-700">{message}</p>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link href="/admin/programmes">
          <Button variant="outline" className="bg-white hover:bg-gray-50">
            + New Programme
          </Button>
        </Link>
        {isSuperAdmin && (
          <Link href="/admin/users">
            <Button variant="outline" className="bg-white hover:bg-gray-50">
              + Add User
            </Button>
          </Link>
        )}
        <Link href="/admin/live-classes">
          <Button variant="outline" className="bg-white hover:bg-gray-50">
            + Schedule Class
          </Button>
        </Link>
        <Link href="/admin/assessments">
          <Button variant="outline" className="bg-white hover:bg-gray-50">
            + Create Assessment
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats?.totalUsers ?? 0}
          subtitle={`${stats?.activeUsers ?? 0} active`}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Programmes"
          value={stats?.totalProgrammes ?? 0}
          subtitle={`${stats?.activeProgrammes ?? 0} active`}
          icon={BookOpen}
          color="green"
        />
        <StatCard
          title="Enrollments"
          value={stats?.totalEnrollments ?? 0}
          subtitle={`${stats?.totalBatches ?? 0} batches`}
          icon={GraduationCap}
          color="purple"
        />
        <StatCard
          title="Pending Grading"
          value={stats?.pendingGrading ?? 0}
          subtitle={`${stats?.upcomingClasses ?? 0} upcoming classes`}
          icon={ClipboardCheck}
          color="orange"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Enrollment Trend
            </CardTitle>
            <div className="flex gap-1">
              {['7d', '30d', '90d'].map((r) => (
                <Button
                  key={r}
                  variant={chartRange === r ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setChartRange(r)}
                  className="text-xs"
                >
                  {r}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {charts?.enrollmentTrend && charts.enrollmentTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={charts.enrollmentTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v: string) => v.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[250px] items-center justify-center text-gray-400">
                No enrollment data for this period
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersRound className="h-5 w-5" />
              Grade Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {charts?.gradeDistribution &&
            charts.gradeDistribution.some((d) => d.count > 0) ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={charts.gradeDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[250px] items-center justify-center text-gray-400">
                No graded submissions yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Health & Activity */}
      {isSuperAdmin && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <HealthRow
                  icon={Database}
                  label="Database"
                  status={stats?.systemHealth?.database ?? 'Operational'}
                />
                <HealthRow
                  icon={HardDrive}
                  label="Storage"
                  status={stats?.systemHealth?.storage ?? 'Available'}
                />
                <HealthRow
                  icon={Activity}
                  label="API"
                  status={stats?.systemHealth?.api ?? 'Operational'}
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activities.length > 0 ? (
                  activities.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 rounded-lg p-2 text-sm transition-colors hover:bg-gray-50"
                    >
                      <div className="mt-2 h-2 w-2 rounded-full bg-blue-500" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {item.action.replace('.', ' ')}
                        </p>
                        <p className="text-xs text-gray-500">
                          by {item.actor}{' '}
                          {item.time &&
                            new Date(item.time).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400">No recent activity</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pending Actions for PA / Faculty */}
      {(isProgrammeAdmin || isFaculty) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Pending Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              <Link
                href="/admin/assessments"
                className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-orange-700 transition-opacity hover:opacity-80"
              >
                <span className="font-medium">Pending Grading</span>
                <span className="ml-2 text-lg font-bold">
                  {stats?.pendingGrading ?? 0}
                </span>
              </Link>
              <Link
                href="/admin/live-classes"
                className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-700 transition-opacity hover:opacity-80"
              >
                <span className="font-medium">Upcoming Classes</span>
                <span className="ml-2 text-lg font-bold">
                  {stats?.upcomingClasses ?? 0}
                </span>
              </Link>
              <Link
                href="/admin/programmes"
                className="rounded-lg border border-green-200 bg-green-50 p-3 text-green-700 transition-opacity hover:opacity-80"
              >
                <span className="font-medium">Batches</span>
                <span className="ml-2 text-lg font-bold">
                  {stats?.totalBatches ?? 0}
                </span>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Evaluator */}
      {isEvaluator && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Pending Evaluations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats?.pendingGrading ?? 0}
            </div>
            <p className="text-sm text-gray-500">Submissions in queue</p>
            <Link href="/admin/assessments">
              <Button variant="outline" className="mt-4">
                Review
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <h3 className="mt-2 text-3xl font-bold">{value}</h3>
            {subtitle && (
              <p className="mt-1 text-xs text-gray-400">{subtitle}</p>
            )}
          </div>
          <div className={`rounded-xl p-3 ${colors[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HealthRow({
  icon: Icon,
  label,
  status,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  status: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-gray-400" />
        <span className="font-medium">{label}</span>
      </div>
      <span className="text-sm font-medium text-green-600">{status}</span>
    </div>
  );
}
