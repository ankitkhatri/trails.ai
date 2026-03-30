import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import {
  buildSavedPlanPayload,
  remapPlanSnapshotDayIds,
  toInputJsonValue,
  toNullableInputJsonValue,
} from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import type { DayScenerySummary, RouteAnalysisResponse } from "@/lib/types";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const planInclude = {
  route: true,
  days: true,
} as const;

export async function POST(_: Request, { params }: RouteContext) {
  const session = await getAuthSession();
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const sourcePlan = await prisma.trekPlan.findFirst({
    where: {
      id,
      ownerId: session.user.id,
    },
    include: planInclude,
  });

  if (!sourcePlan) {
    return NextResponse.json({ error: "Plan not found." }, { status: 404 });
  }

  const sortedDays = [...sourcePlan.days].sort(
    (left: (typeof sourcePlan.days)[number], right: (typeof sourcePlan.days)[number]) =>
      left.dayNumber - right.dayNumber
  );

  const sourceDayPlans = sortedDays.map((day) => ({
      id: day.id,
    }));
  const sourceAnalysis = (sourcePlan.analysisSnapshot ?? null) as RouteAnalysisResponse | null;
  const sourceScenery = ((sourcePlan.scenerySnapshot ?? []) as DayScenerySummary[]) ?? [];

  const duplicatePlan = await prisma.trekPlan.create({
    data: {
      title: `${sourcePlan.title} copy`,
      planningMode: sourcePlan.planningMode,
      weatherProvider: sourcePlan.weatherProvider,
      trekContext: toInputJsonValue(sourcePlan.trekContext),
      assumptions: toInputJsonValue(sourcePlan.assumptions),
      analysisSnapshot: toNullableInputJsonValue(sourcePlan.analysisSnapshot),
      scenerySnapshot: toNullableInputJsonValue(sourcePlan.scenerySnapshot),
      snapshotVersion: sourcePlan.snapshotVersion,
      owner: {
        connect: {
          id: session.user.id,
        },
      },
      route: {
        create: {
          owner: {
            connect: {
              id: session.user.id,
            },
          },
          sourceFileName: sourcePlan.route.sourceFileName,
          gpxText: sourcePlan.route.gpxText,
          routeName: sourcePlan.route.routeName,
          totalDistanceKm: sourcePlan.route.totalDistanceKm,
          rawPoints: toInputJsonValue(sourcePlan.route.rawPoints),
          sampledPoints: toInputJsonValue(sourcePlan.route.sampledPoints),
          bounds: toInputJsonValue(sourcePlan.route.bounds),
          warnings: toInputJsonValue(sourcePlan.route.warnings),
        },
      },
      days: {
        create: sortedDays.map((day) => ({
          dayNumber: day.dayNumber,
          label: day.label,
          startDateTimeIso: day.startDateTimeIso,
          movingHours: day.movingHours,
          startAnchor: toInputJsonValue(day.startAnchor),
          endAnchor: toInputJsonValue(day.endAnchor),
          sidePoint: toNullableInputJsonValue(day.sidePoint),
        })),
      },
    },
    include: planInclude,
  });

  const { remappedAnalysis, remappedScenery } = remapPlanSnapshotDayIds(
    sourceDayPlans,
    duplicatePlan.days,
    sourceAnalysis,
    sourceScenery
  );

  const hydratedPlan = await prisma.trekPlan.update({
    where: { id: duplicatePlan.id },
    data: {
      analysisSnapshot: toNullableInputJsonValue(remappedAnalysis),
      scenerySnapshot: toNullableInputJsonValue(remappedScenery),
    },
    include: planInclude,
  });

  return NextResponse.json(buildSavedPlanPayload(hydratedPlan, "owner"));
}
