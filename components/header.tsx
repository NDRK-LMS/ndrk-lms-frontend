'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";

export function Header() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  function handleLogout() {
    clearAuth();
    router.push("/");
  }

  return (
    <header className="flex items-center justify-between border-b bg-white/70 px-6 py-3 shadow-sm">
      <Link href="/" className="text-lg font-semibold">
        NDRK LMS
      </Link>
      {user ? (
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-700">Hi, {user.fullName}</span>
          <Button
            onClick={handleLogout}
            className="h-8 px-3 text-xs"
          >
            Logout
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-sm">
          <Link href="/login" className="text-blue-600 hover:underline">
            Sign in
          </Link>
          <Link href="/register" className="text-blue-600 hover:underline">
            Sign up
          </Link>
        </div>
      )}
    </header>
  );
}

