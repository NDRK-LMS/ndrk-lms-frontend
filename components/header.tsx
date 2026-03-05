'use client';

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";

export function Header() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [open, setOpen] = React.useState(false);

  function handleLogout() {
    clearAuth();
    router.push("/");
    setOpen(false);
  }

  function toggleMenu() {
    setOpen((prev) => !prev);
  }

  return (
    <header className="flex items-center justify-between border-b bg-white/70 px-6 py-3 shadow-sm">
      <Link href="/" className="text-lg font-semibold">
        NDRK LMS
      </Link>
      {user ? (
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-gray-700 sm:inline">Hi, {user.fullName}</span>
          <div className="relative">
            <button
              type="button"
              onClick={toggleMenu}
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs shadow-sm hover:border-slate-300"
            >
              <Avatar src={user.avatarUrl ?? undefined} fallback={user.fullName} />
            </button>
            {open && (
              <div className="absolute right-0 mt-2 w-48 rounded-md border bg-white py-1 text-sm shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    router.push("/profile");
                  }}
                  className="block w-full px-3 py-1.5 text-left text-gray-700 hover:bg-slate-100"
                >
                  Profile
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    router.push("/settings");
                  }}
                  className="block w-full px-3 py-1.5 text-left text-gray-700 hover:bg-slate-100"
                >
                  Account settings
                </button>
                <div className="my-1 border-t" />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="block w-full px-3 py-1.5 text-left text-red-600 hover:bg-red-50"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
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

