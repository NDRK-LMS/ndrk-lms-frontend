"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/lib/auth-store";
import { UserRole } from "@ndrk/shared";

export default function Home() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const isAdmin =
    user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.PROGRAMME_ADMIN;

  useEffect(() => {
    if (user && isAdmin) {
      router.replace("/admin/dashboard");
    }
  }, [user, isAdmin, router]);

  if (user && isAdmin) {
    return null;
  }

  // Logged-in learner: show learner home
  if (user) {
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
            Continue your learning journey from where you left off.
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

  // Not logged in: landing with sign in / sign up
  return (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center bg-slate-50">
      <div className="space-y-4 text-center">
        <h1 className="text-3xl font-semibold">NDRK LMS</h1>
        <p className="text-gray-600">
          Welcome. Please sign in or sign up to continue.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/auth/login"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-md border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
