"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export function SiteHeader() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";

  return (
    <header className="border-b border-black/5 bg-white/70 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="font-[family:var(--font-serif)] text-xl font-semibold text-ridge-900"
          >
            Trek Weather Planner
          </Link>
          <nav className="hidden items-center gap-4 text-sm text-storm-700 md:flex">
            <Link href="/plan" className="transition hover:text-ridge-900">
              Planner
            </Link>
            <Link href="/plans" className="transition hover:text-ridge-900">
              My Plans
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3 text-sm">
          {isAuthenticated ? (
            <>
              <span className="hidden text-storm-600 sm:inline">
                {session.user?.email ?? session.user?.name ?? "Signed in"}
              </span>
              <button
                type="button"
                onClick={() => void signOut({ callbackUrl: "/plan" })}
                className="rounded-full border border-storm-200 px-4 py-2 font-medium text-storm-700 transition hover:border-ridge-400 hover:text-ridge-900"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full border border-storm-200 px-4 py-2 font-medium text-storm-700 transition hover:border-ridge-400 hover:text-ridge-900"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-ridge-700 px-4 py-2 font-semibold text-white transition hover:bg-ridge-800"
              >
                Create account
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
