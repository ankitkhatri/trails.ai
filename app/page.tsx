import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-16">
      <section className="panel grid w-full gap-10 overflow-hidden p-8 lg:grid-cols-[1.1fr_0.9fr] lg:p-12">
        <div className="space-y-6">
          <p className="text-sm uppercase tracking-[0.32em] text-ridge-700">
            Trek Weather Planner
          </p>
          <div className="space-y-4">
            <h1 className="max-w-2xl font-[family:var(--font-serif)] text-5xl leading-none text-ridge-900 sm:text-6xl">
              Plan the weather window before you commit to the route.
            </h1>
            <p className="max-w-xl text-lg leading-8 text-storm-700">
              Upload a GPX trek, model your pace and moving schedule, then inspect
              forecast-driven risk point by point along the trail.
            </p>
          </div>
          <Link
            href="/plan"
            className="inline-flex items-center rounded-full bg-ridge-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-ridge-800"
          >
            Open Planner
          </Link>
        </div>
        <div className="rounded-[2rem] border border-white/60 bg-gradient-to-br from-ridge-100 via-white to-storm-100 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl bg-ridge-900 p-5 text-white">
              <p className="text-xs uppercase tracking-[0.22em] text-ridge-200">
                Route Sampling
              </p>
              <p className="mt-4 text-3xl font-semibold">~1 km</p>
            </div>
            <div className="rounded-3xl bg-white p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-storm-500">
                ETA Modeling
              </p>
              <p className="mt-4 text-3xl font-semibold text-storm-900">
                Daily pace
              </p>
            </div>
            <div className="rounded-3xl bg-white p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-storm-500">
                Weather Layer
              </p>
              <p className="mt-4 text-3xl font-semibold text-storm-900">
                Mock / Open-Meteo
              </p>
            </div>
            <div className="rounded-3xl bg-ember-500 p-5 text-white">
              <p className="text-xs uppercase tracking-[0.22em] text-amber-100">
                Risk Signals
              </p>
              <p className="mt-4 text-3xl font-semibold">Wind, rain, snow</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
