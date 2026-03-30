import Link from "next/link";
import { redirect } from "next/navigation";
import { buildSavedPlanSummary } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function PlansPage() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/plans");
  }

  const plans = await prisma.trekPlan.findMany({
    where: {
      ownerId: session.user.id,
    },
    include: {
      route: true,
      days: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const summaries = plans.map((plan) => buildSavedPlanSummary(plan));

  return (
    <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="panel p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-ridge-700">My Plans</p>
            <h1 className="mt-3 font-[family:var(--font-serif)] text-4xl leading-none text-ridge-900">
              Saved trek drafts and shareable itineraries
            </h1>
          </div>
          <Link
            href="/plan"
            className="rounded-full bg-ridge-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-ridge-800"
          >
            New plan
          </Link>
        </div>
      </section>

      {summaries.length === 0 ? (
        <section className="panel p-8 text-sm text-storm-600">
          You have not saved any trek plans yet. Open the planner, upload a GPX, and
          save your first route.
        </section>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {summaries.map((plan) => (
            <article key={plan.id} className="panel overflow-hidden p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.22em] text-storm-500">
                    {plan.routeName}
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold text-storm-900">{plan.title}</h2>
                </div>
                <span className="rounded-full bg-ridge-100 px-3 py-1 text-xs font-semibold text-ridge-800">
                  {plan.planningMode === "fixed-itinerary" ? "fixed itinerary" : "flexible pace"}
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-storm-50 px-4 py-3 text-sm text-storm-700">
                  Updated <strong>{formatDate(plan.updatedAt)}</strong>
                </div>
                <div className="rounded-2xl bg-storm-50 px-4 py-3 text-sm text-storm-700">
                  Days <strong>{plan.stageCount}</strong>
                </div>
                <div className="rounded-2xl bg-storm-50 px-4 py-3 text-sm text-storm-700">
                  Max risk <strong>{plan.maxRiskLevel ?? "--"}</strong>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={`/plans/${plan.id}`}
                  className="rounded-full bg-ridge-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ridge-800"
                >
                  Open plan
                </Link>
                <Link
                  href={`/share/${plan.shareToken}`}
                  className="rounded-full border border-storm-200 px-4 py-2 text-sm font-medium text-storm-700 transition hover:border-ridge-400 hover:text-ridge-900"
                >
                  Open shared view
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
