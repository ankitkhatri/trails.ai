import { Prisma } from "@prisma/client";
import type { PlanDay, SavedRoute, TrekPlan } from "@prisma/client";
import type {
  DayScenerySummary,
  PlanOwnerMode,
  RouteAnalysisResponse,
  RouteParseResponse,
  SavedPlanPayload,
  SavedPlanSummary,
  SavePlanRequest,
  TrekDayPlan,
} from "@/lib/types";

type PlanRecord = TrekPlan & {
  route: SavedRoute;
  days: PlanDay[];
};

function asJson<T>(value: Prisma.JsonValue | null | undefined, fallback: T): T {
  return (value as T | null | undefined) ?? fallback;
}

export function toInputJsonValue(value: Prisma.JsonValue) {
  return value as Prisma.InputJsonValue;
}

export function toNullableInputJsonValue(value: Prisma.JsonValue | null | undefined) {
  return value === null || value === undefined
    ? Prisma.JsonNull
    : (value as Prisma.InputJsonValue);
}

export function serializeSceneryRecord(
  dayScenery: Record<string, DayScenerySummary | undefined>
) {
  return Object.values(dayScenery).filter(
    (entry): entry is DayScenerySummary => Boolean(entry)
  );
}

export function buildPlanWriteInput(input: SavePlanRequest) {
  return {
    title: input.title.trim() || input.route?.name || "Untitled trek plan",
    planningMode: input.planningMode,
    weatherProvider: input.weatherProvider,
    assumptions: input.assumptions as Prisma.InputJsonValue,
    trekContext: input.trekContext as Prisma.InputJsonValue,
    analysisSnapshot: input.analysis
      ? (input.analysis as Prisma.InputJsonValue)
      : Prisma.JsonNull,
    scenerySnapshot: (input.dayScenery ?? []) as Prisma.InputJsonValue,
    snapshotVersion: 1,
  };
}

export function buildRouteWriteInput(input: SavePlanRequest) {
  if (!input.route) {
    throw new Error("A parsed route is required before saving.");
  }

  return {
    sourceFileName: input.uploadedFileName || null,
    routeName: input.route.name,
    totalDistanceKm: input.route.totalDistanceKm,
    rawPoints: input.route.rawPoints as Prisma.InputJsonValue,
    sampledPoints: input.route.sampledPoints as Prisma.InputJsonValue,
    bounds: input.route.bounds as Prisma.InputJsonValue,
    warnings: input.route.warnings as Prisma.InputJsonValue,
  };
}

export function buildDayWriteInput(dayPlans: TrekDayPlan[]) {
  return dayPlans.map((dayPlan, index) => ({
    dayNumber: index + 1,
    label: dayPlan.label,
    startDateTimeIso: new Date(dayPlan.startDateTimeIso),
    movingHours: dayPlan.movingHours,
    startAnchor: dayPlan.startAnchor as Prisma.InputJsonValue,
    endAnchor: dayPlan.endAnchor as Prisma.InputJsonValue,
    sidePoint: (dayPlan.sidePoint ?? Prisma.JsonNull) as Prisma.InputJsonValue,
  }));
}

export function buildSavedPlanPayload(
  plan: PlanRecord,
  ownerMode: PlanOwnerMode
): SavedPlanPayload {
  const route: RouteParseResponse = {
    name: plan.route.routeName,
    rawPoints: asJson(plan.route.rawPoints, []),
    sampledPoints: asJson(plan.route.sampledPoints, []),
    totalDistanceKm: plan.route.totalDistanceKm,
    bounds: asJson(plan.route.bounds, [
      [0, 0],
      [0, 0],
    ]),
    warnings: asJson(plan.route.warnings, []),
  };

  const dayPlans = [...plan.days]
    .sort((left, right) => left.dayNumber - right.dayNumber)
    .map<TrekDayPlan | null>((day) => {
      const startAnchor = asJson<TrekDayPlan["startAnchor"] | null>(day.startAnchor, null);
      const endAnchor = asJson<TrekDayPlan["endAnchor"] | null>(day.endAnchor, null);

      if (!startAnchor || !endAnchor) {
        return null;
      }

      return {
        id: day.id,
        label: day.label,
        startDateTimeIso: day.startDateTimeIso.toISOString(),
        movingHours: day.movingHours,
        startAnchor,
        endAnchor,
        sidePoint: asJson(day.sidePoint, undefined),
      };
    })
    .filter((day): day is TrekDayPlan => Boolean(day));

  const daySceneryArray = asJson<DayScenerySummary[]>(plan.scenerySnapshot, []);
  const dayScenery = Object.fromEntries(
    daySceneryArray.map((entry) => [entry.dayPlanId, entry])
  ) as Record<string, DayScenerySummary | undefined>;

  return {
    id: plan.id,
    title: plan.title,
    ownerMode,
    shareToken: plan.shareToken,
    uploadedFileName: plan.route.sourceFileName ?? "",
    snapshotVersion: plan.snapshotVersion,
    route,
    planningMode: plan.planningMode as SavedPlanPayload["planningMode"],
    weatherProvider: plan.weatherProvider as SavedPlanPayload["weatherProvider"],
    assumptions: asJson(plan.assumptions, {
      startDateTimeIso: new Date().toISOString(),
      averageSpeedKph: 4,
      movingHoursPerDay: 7,
      sampleDistanceKm: 1,
    }),
    trekContext: asJson(plan.trekContext, {
      routeDisplayName: "",
      region: "",
      country: "",
      season: "",
    }),
    dayPlans,
    analysis: asJson<RouteAnalysisResponse | null>(plan.analysisSnapshot, null),
    dayScenery,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  };
}

export function buildSavedPlanSummary(plan: PlanRecord): SavedPlanSummary {
  const analysis = asJson<RouteAnalysisResponse | null>(plan.analysisSnapshot, null);

  return {
    id: plan.id,
    title: plan.title,
    routeName: plan.route.routeName,
    planningMode: plan.planningMode as SavedPlanSummary["planningMode"],
    stageCount: plan.days.length,
    maxRiskLevel: analysis?.summary.maxRiskLevel ?? null,
    updatedAt: plan.updatedAt.toISOString(),
    createdAt: plan.createdAt.toISOString(),
    shareToken: plan.shareToken,
  };
}

export function remapPlanSnapshotDayIds(
  sourceDayPlans: Pick<TrekDayPlan, "id">[],
  persistedDays: Pick<PlanDay, "id" | "dayNumber">[],
  analysis: RouteAnalysisResponse | null,
  dayScenery: DayScenerySummary[]
) {
  const sortedPersistedDays = [...persistedDays].sort(
    (left, right) => left.dayNumber - right.dayNumber
  );
  const dayIdMap = new Map<string, string>();

  sourceDayPlans.forEach((dayPlan, index) => {
    const persistedDay = sortedPersistedDays[index];

    if (persistedDay) {
      dayIdMap.set(dayPlan.id, persistedDay.id);
    }
  });

  const remappedAnalysis = analysis
    ? {
        ...analysis,
        waypoints: analysis.waypoints.map((waypoint) => ({
          ...waypoint,
          dayPlanId: waypoint.dayPlanId ? dayIdMap.get(waypoint.dayPlanId) ?? waypoint.dayPlanId : undefined,
        })),
        daySummaries: analysis.daySummaries.map((daySummary) => ({
          ...daySummary,
          dayPlanId: dayIdMap.get(daySummary.dayPlanId) ?? daySummary.dayPlanId,
        })),
      }
    : null;

  const remappedScenery = dayScenery.map((daySummary) => ({
    ...daySummary,
    dayPlanId: dayIdMap.get(daySummary.dayPlanId) ?? daySummary.dayPlanId,
  }));

  return {
    remappedAnalysis,
    remappedScenery,
  };
}
