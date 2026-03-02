"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";

export default function Home() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (user) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  return (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center bg-slate-50">
      <div className="space-y-4 text-center">
        <h1 className="text-3xl font-semibold">NDRK LMS</h1>
        <p className="text-gray-600">
          Welcome. Please sign in or sign up to continue.
        </p>
        <div className="flex items-center justify-center gap-4">
          <a
            href="/login"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Sign in
          </a>
          <a
            href="/register"
            className="rounded-md border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
          >
            Sign up
          </a>
        </div>
      </div>
    </div>
  );
}
