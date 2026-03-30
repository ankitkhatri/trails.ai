"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";

export default function SignupPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/plans";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, password }),
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Unable to create account.");
      setIsSubmitting(false);
      return;
    }

    const signInResult = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setIsSubmitting(false);

    if (!signInResult || signInResult.error) {
      setError("Account created, but login failed. Try signing in.");
      return;
    }

    window.location.assign(signInResult.url ?? callbackUrl);
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-5xl items-center px-6 py-12">
      <section className="panel mx-auto w-full max-w-md p-8">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.24em] text-ridge-700">Account</p>
          <h1 className="font-[family:var(--font-serif)] text-4xl leading-none text-ridge-900">
            Create your planner account
          </h1>
          <p className="text-sm leading-7 text-storm-600">
            Save private trek plans, keep daily edits, and publish read-only share links.
          </p>
        </div>

        <form className="mt-8 grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-storm-800">Name</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded-2xl border border-storm-200 bg-white px-4 py-3 text-sm text-storm-900 outline-none transition focus:border-ridge-500"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-storm-800">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-2xl border border-storm-200 bg-white px-4 py-3 text-sm text-storm-900 outline-none transition focus:border-ridge-500"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-storm-800">Password</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-2xl border border-storm-200 bg-white px-4 py-3 text-sm text-storm-900 outline-none transition focus:border-ridge-500"
            />
          </label>

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-ridge-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-ridge-800 disabled:cursor-not-allowed disabled:bg-storm-300"
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-sm text-storm-600">
          Already have an account?{" "}
          <a
            href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="font-semibold text-ridge-700 underline"
          >
            Log in
          </a>
        </p>
      </section>
    </main>
  );
}
