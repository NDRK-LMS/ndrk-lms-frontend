'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  UsersRound,
  FileText,
  ClipboardList,
  Award,
  Bell,
  BarChart3,
  Shield,
  Settings,
  Video,
  GraduationCap,
} from 'lucide-react';
import { UserRole } from '@ndrk/shared';

const ADMIN_ROLES: string[] = [
  UserRole.SUPER_ADMIN,
  UserRole.PROGRAMME_ADMIN,
  UserRole.FACULTY,
  UserRole.GUEST_FACULTY,
  UserRole.EVALUATOR,
];

const SIDEBAR_ITEMS: Array<{
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
}> = [
  { title: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, roles: ADMIN_ROLES },
  { title: 'Users', href: '/admin/users', icon: Users, roles: [UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN] },
  { title: 'Programmes', href: '/admin/programmes', icon: BookOpen, roles: ADMIN_ROLES },
  { title: 'Batches', href: '/admin/batches', icon: UsersRound, roles: [UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN, UserRole.FACULTY, UserRole.GUEST_FACULTY] },
  { title: 'Content', href: '/admin/content', icon: FileText, roles: [UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN, UserRole.FACULTY] },
  { title: 'Live Classes', href: '/admin/live-classes', icon: Video, roles: [UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN, UserRole.FACULTY, UserRole.GUEST_FACULTY] },
  { title: 'Assessments', href: '/admin/assessments', icon: ClipboardList, roles: [UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN, UserRole.FACULTY, UserRole.EVALUATOR] },
  { title: 'Certificates', href: '/admin/certificates', icon: Award, roles: [UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN] },
  { title: 'Notifications', href: '/admin/notifications', icon: Bell, roles: [UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN, UserRole.FACULTY] },
  { title: 'Analytics', href: '/admin/analytics', icon: BarChart3, roles: [UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN] },
  { title: 'Audit Logs', href: '/admin/audit-logs', icon: Shield, roles: [UserRole.SUPER_ADMIN] },
  { title: 'Settings', href: '/admin/settings', icon: Settings, roles: [UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN] },
];

export interface AppSidebarProps {
  userRole: string;
  userName: string;
}

export function AppSidebar({ userRole, userName }: AppSidebarProps) {
  const pathname = usePathname();
  const allowedItems = SIDEBAR_ITEMS.filter((item) => item.roles.includes(userRole));

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
      <div className="shrink-0 border-b border-gray-200 p-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">NDRK LMS</h1>
            <p className="text-xs text-gray-500">Admin Panel</p>
          </div>
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-4">
        <div className="mb-4">
          <p className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Main Menu
          </p>
          {allowedItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'border-r-2 border-blue-600 bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <Icon
                  className={cn('h-5 w-5', isActive ? 'text-blue-600' : 'text-gray-400')}
                />
                {item.title}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-gray-200 p-4 shrink-0">
        <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">{userName}</p>
            <p className="truncate text-xs text-gray-500">
              {userRole.replace('_', ' ')}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
