'use client';

import { Bell, LogOut, Search, Settings, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/lib/auth-store';
import { cn } from '@/lib/utils';

export interface HeaderUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

export interface AdminHeaderProps {
  user: HeaderUser;
}

export function AdminHeader({ user }: AdminHeaderProps) {
  const router = useRouter();
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const handleLogout = async () => {
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/v1/auth/logout`,
        { method: 'POST', credentials: 'include' }
      );
    } finally {
      clearAuth();
      router.push('/auth/login');
      router.refresh();
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div className="flex max-w-xl flex-1 items-center gap-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Search users, programmes, content..."
            className="w-full pl-10"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
        </Button>

        <div className="relative group">
          <Button
            variant="ghost"
            className="flex items-center gap-3"
            aria-haspopup="true"
            aria-expanded="false"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="hidden text-left md:block">
              <p className="text-sm font-medium">{user.fullName}</p>
              <p className="text-xs text-gray-500">
                {user.role.replace('_', ' ')}
              </p>
            </div>
          </Button>
          <div
            className={cn(
              'absolute right-0 top-full z-50 mt-1 w-56 origin-top-right rounded-md border border-gray-200 bg-white py-1 shadow-lg',
              'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto'
            )}
          >
            <div className="border-b border-gray-100 px-3 py-2">
              <p className="text-sm font-medium text-gray-900">My Account</p>
            </div>
            <button
              type="button"
              onClick={() => router.push('/profile')}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              <User className="h-4 w-4" />
              Profile
            </button>
            <button
              type="button"
              onClick={() => router.push('/admin/settings')}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>
            <div className="border-t border-gray-100" />
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
