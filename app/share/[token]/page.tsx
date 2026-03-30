import { notFound } from "next/navigation";
import { PlannerShell } from "@/components/planner-shell";
import { buildSavedPlanPayload } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import type { WeatherProviderName } from "@/lib/types";

type SharedPlanPageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function SharedPlanPage({ params }: SharedPlanPageProps) {
  const { token } = await params;

  const plan = await prisma.trekPlan.findUnique({
    where: {
      shareToken: token,
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
      initialPlan={buildSavedPlanPayload(plan, "shared-readonly")}
    />
  );
}
