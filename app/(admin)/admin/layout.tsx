'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { UserRole } from '@ndrk/shared';
import { AppSidebar } from '@/components/admin/app-sidebar';
import { AdminHeader } from '@/components/admin/header';

const ADMIN_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.PROGRAMME_ADMIN,
  UserRole.FACULTY,
  UserRole.GUEST_FACULTY,
  UserRole.EVALUATOR,
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const hydrated = useAuthStore((s) => s.hydrated);

  const isAdmin = user && ADMIN_ROLES.includes(user.role as UserRole);
  // `status` is only on the backend type, so treat it as optional here
  const isActive = (user as any)?.status !== 'DISABLED';

  useEffect(() => {
    // Do nothing until Zustand has rehydrated from localStorage
    if (!hydrated) return;

    if (!user || !accessToken) {
      router.replace(
        `/auth/login?redirect=${encodeURIComponent(
          pathname || '/admin/dashboard',
        )}`,
      );
      return;
    }
    if (!isAdmin) {
      router.replace('/');
      return;
    }
    if (!isActive) {
      router.replace('/auth/login?error=account_disabled');
    }
  }, [hydrated, user, accessToken, isAdmin, isActive, router, pathname]);

  // Avoid flicker / wrong redirect during the first paint
  if (!hydrated) {
    return null;
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppSidebar userRole={user.role} userName={user.fullName} />
      <div className="pl-64 flex min-h-screen flex-col">
        <AdminHeader
          user={{
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
          }}
        />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}