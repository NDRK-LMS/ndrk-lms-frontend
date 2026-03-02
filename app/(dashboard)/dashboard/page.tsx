"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { UserRole } from "@ndrk/shared";

type AdminOverview = {
  summary: {
    users: number;
    programmes: number;
    batches: number;
  };
};

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const message = useAuthStore((s) => s.message);

  const [adminData, setAdminData] = useState<AdminOverview | null>(null);

  const isAdmin =
    user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.PROGRAMME_ADMIN;

  useEffect(() => {
    if (!user || !accessToken) {
      router.replace("/login");
      return;
    }

    if (isAdmin) {
      fetch("http://localhost:3001/api/v1/admin/dashboard", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
        .then((r) => r.json())
        .then((d) => setAdminData(d))
        .catch(() => setAdminData(null));
    }
  }, [user, accessToken, isAdmin, router]);

  if (!user) {
    return null;
  }

  if (isAdmin) {
    return (
      <div className="flex min-h-[calc(100vh-56px)] bg-slate-50">
        <aside className="flex w-64 flex-col border-r bg-white/80 p-4">
          <h2 className="mb-4 text-lg font-semibold">Admin</h2>
          <nav className="space-y-2 text-sm">
            <div className="font-medium text-blue-600">Dashboard</div>
            <div>Users</div>
            <div>Programmes</div>
            <div>Batches</div>
            <div>Content</div>
            <div>Assessments</div>
            <div>Certificates</div>
            <div>Analytics</div>
            <div>Audit Logs</div>
            <div>Settings</div>
          </nav>
        </aside>
        <main className="flex-1 px-8 py-6">
          <h1 className="text-2xl font-semibold mb-4">
            Welcome back, {user.fullName}!
          </h1>
          <p className="mb-6 text-gray-600">
            {message ?? "Here is a quick summary of your platform."}
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="text-sm text-gray-500">Total users</div>
              <div className="mt-2 text-2xl font-semibold">
                {adminData?.summary.users ?? "—"}
              </div>
            </div>
            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="text-sm text-gray-500">Programmes</div>
              <div className="mt-2 text-2xl font-semibold">
                {adminData?.summary.programmes ?? "—"}
              </div>
            </div>
            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="text-sm text-gray-500">Batches</div>
              <div className="mt-2 text-2xl font-semibold">
                {adminData?.summary.batches ?? "—"}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Learner dashboard
  return (
    <div className="flex min-h-[calc(100vh-56px)] bg-slate-50">
      <aside className="flex w-56 flex-col border-r bg-white/80 p-4">
        <h2 className="mb-4 text-lg font-semibold">My Learning</h2>
        <nav className="space-y-2 text-sm">
          <div className="font-medium text-blue-600">Dashboard</div>
          <div>My Programmes</div>
          <div>Live Classes</div>
          <div>Assessments</div>
          <div>Certificates</div>
        </nav>
      </aside>
      <main className="flex-1 px-8 py-6">
        <h1 className="text-2xl font-semibold mb-4">
          Welcome back, {user.fullName}!
        </h1>
        <p className="mb-6 text-gray-600">
          {message ?? "Continue your learning journey from where you left off."}
        </p>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">Next steps</div>
          <p className="mt-2 text-sm text-gray-700">
            Your personalised learner dashboard (programmes, classes,
            assessments) will be built here.
          </p>
        </div>
      </main>
    </div>
  );
}

