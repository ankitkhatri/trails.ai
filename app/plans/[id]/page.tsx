import { notFound, redirect } from "next/navigation";
import { PlannerShell } from "@/components/planner-shell";
import { getAuthSession } from "@/lib/auth";
import { buildSavedPlanPayload } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import type { WeatherProviderName } from "@/lib/types";

type PlanPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function SavedPlanPage({ params }: PlanPageProps) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/plans/${(await params).id}`);
  }

  const { id } = await params;
  const plan = await prisma.trekPlan.findFirst({
    where: {
      id,
      ownerId: session.user.id,
    },
    include: {
      route: true,
      days: true,
    },
  });

  if (!plan) {
    notFound();
  }

  const defaultProvider: WeatherProviderName =
    process.env.WEATHER_PROVIDER === "open-meteo" ? "open-meteo" : "mock";

  return (
    <PlannerShell
      defaultProvider={defaultProvider}
      initialPlan={buildSavedPlanPayload(plan, "owner")}
    />
  );
}
