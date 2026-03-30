import type {
  CustomAnchor,
  RoutePoint,
  TrekAnchor,
  TrekAssumptions,
  TrekDayPlan,
  TrekSidePoint,
  TimedWaypoint,
} from "@/lib/types";

function dayLabel(dayNumber: number) {
  return `Day ${dayNumber}`;
}

function addDays(dateIso: string, days: number) {
  const date = new Date(dateIso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

export function createRouteAnchor(routeWaypointSequence: number, label?: string): TrekAnchor {
  return {
    kind: "route",
    routeWaypointSequence,
    label,
  };
}

export function createCustomAnchor(
  routeWaypointSequence: number,
  lat: number,
  lng: number,
  label: string,
  elevationM?: number
): CustomAnchor {
  return {
    kind: "custom",
    routeWaypointSequence,
    lat,
    lng,
    elevationM,
    label,
  };
}

export function isCustomAnchor(anchor: TrekAnchor): anchor is CustomAnchor {
  return anchor.kind === "custom";
}

export function getAnchorRouteSequence(anchor: TrekAnchor) {
  return anchor.routeWaypointSequence;
}

export function getRoutePointBySequence(points: RoutePoint[], sequence: number) {
  return points.find((point) => point.sequence === sequence) ?? points[0];
}

export function getAnchorDisplayLabel(anchor: TrekAnchor, points: RoutePoint[]) {
  if (anchor.kind === "custom") {
    return anchor.label || "Custom point";
  }

  const point = getRoutePointBySequence(points, anchor.routeWaypointSequence);
  return anchor.label || `Waypoint ${point.sequence} • Km ${point.distanceFromStartKm.toFixed(1)}`;
}

export function suggestFixedItinerary(
  sampledPoints: RoutePoint[],
  assumptions: TrekAssumptions
): TrekDayPlan[] {
  if (sampledPoints.length < 2) {
    return [];
  }

  const totalDistanceKm = sampledPoints[sampledPoints.length - 1].distanceFromStartKm;
  const dailyDistanceKm = Math.max(
    assumptions.averageSpeedKph * assumptions.movingHoursPerDay,
    1
  );
  const stageCount = Math.max(1, Math.ceil(totalDistanceKm / dailyDistanceKm));
  const plans: TrekDayPlan[] = [];
  let previousEndSequence = 0;

  for (let index = 0; index < stageCount; index += 1) {
    const targetDistanceKm =
      index === stageCount - 1
        ? totalDistanceKm
        : Math.min(totalDistanceKm, dailyDistanceKm * (index + 1));
    const targetPoint =
      sampledPoints.find(
        (point) =>
          point.sequence > previousEndSequence &&
          point.distanceFromStartKm >= targetDistanceKm
      ) ?? sampledPoints[sampledPoints.length - 1];

    plans.push({
      id: `day-${index + 1}`,
      label: dayLabel(index + 1),
      startDateTimeIso: addDays(assumptions.startDateTimeIso, index),
      movingHours: assumptions.movingHoursPerDay,
      startAnchor: createRouteAnchor(previousEndSequence),
      endAnchor: createRouteAnchor(targetPoint.sequence),
    });

    previousEndSequence = targetPoint.sequence;
  }

  return normalizeDayPlans(plans, sampledPoints);
}

export function normalizeDayPlans(plans: TrekDayPlan[], sampledPoints: RoutePoint[]) {
  if (plans.length === 0 || sampledPoints.length < 2) {
    return [];
  }

  const finalSequence = sampledPoints[sampledPoints.length - 1].sequence;
  let previousEndSequence = 0;

  return plans.map((plan, index) => {
    const rawStartSequence = Math.min(
      Math.max(getAnchorRouteSequence(plan.startAnchor), previousEndSequence),
      finalSequence
    );
    const rawEndSequence = Math.min(
      Math.max(getAnchorRouteSequence(plan.endAnchor), rawStartSequence),
      finalSequence
    );

    previousEndSequence = rawEndSequence;

    return {
      ...plan,
      id: plan.id || `day-${index + 1}`,
      label: plan.label || dayLabel(index + 1),
      movingHours: Math.max(plan.movingHours, 0),
      startAnchor: normalizeAnchor(plan.startAnchor, rawStartSequence),
      endAnchor: normalizeAnchor(plan.endAnchor, rawEndSequence),
      sidePoint: normalizeSidePoint(plan.sidePoint),
    };
  });
}

function normalizeAnchor(anchor: TrekAnchor, routeWaypointSequence: number): TrekAnchor {
  if (anchor.kind === "route") {
    return {
      ...anchor,
      routeWaypointSequence,
    };
  }

  return {
    ...anchor,
    routeWaypointSequence,
    label: anchor.label || "Custom point",
  };
}

function normalizeSidePoint(sidePoint?: TrekSidePoint): TrekSidePoint | undefined {
  if (!sidePoint) {
    return undefined;
  }

  return {
    ...sidePoint,
    label: sidePoint.label || "Side point",
    timeOffsetHours: Math.max(sidePoint.timeOffsetHours, 0),
  };
}

export type FixedDayRouteResult = {
  waypoints: TimedWaypoint[];
  routeDistanceKm: number;
  routeStartWaypointSequence: number;
  routeEndWaypointSequence: number;
  requiredHours: number;
  warnings: string[];
};

export function estimateFixedDayRoute(
  sampledPoints: RoutePoint[],
  dayPlan: TrekDayPlan,
  dayIndex: number,
  averageSpeedKph: number
): FixedDayRouteResult {
  if (averageSpeedKph <= 0) {
    throw new Error("Average speed must be greater than zero.");
  }

  const routeStartWaypointSequence = getAnchorRouteSequence(dayPlan.startAnchor);
  const routeEndWaypointSequence = getAnchorRouteSequence(dayPlan.endAnchor);
  const warnings: string[] = [];

  if (routeEndWaypointSequence < routeStartWaypointSequence) {
    throw new Error(`${dayPlan.label} ends before it starts on the route.`);
  }

  const segmentPoints = sampledPoints.filter(
    (point) =>
      point.sequence >= routeStartWaypointSequence &&
      point.sequence <= routeEndWaypointSequence
  );

  const startPoint = getRoutePointBySequence(sampledPoints, routeStartWaypointSequence);
  const endPoint = getRoutePointBySequence(sampledPoints, routeEndWaypointSequence);
  const routeDistanceKm = endPoint.distanceFromStartKm - startPoint.distanceFromStartKm;
  const requiredHours = routeDistanceKm / averageSpeedKph;

  if (requiredHours > dayPlan.movingHours + 0.1) {
    warnings.push(
      `${dayPlan.label} requires ${requiredHours.toFixed(1)} hours at ${averageSpeedKph.toFixed(
        1
      )} km/h, which exceeds the planned ${dayPlan.movingHours.toFixed(1)} hours.`
    );
  }

  const startDate = new Date(dayPlan.startDateTimeIso);

  if (Number.isNaN(startDate.getTime())) {
    throw new Error(`${dayPlan.label} has an invalid start date/time.`);
  }

  const waypoints: TimedWaypoint[] =
    segmentPoints.length > 0
      ? segmentPoints.map((point, index) => {
          const distanceFromDayStartKm = point.distanceFromStartKm - startPoint.distanceFromStartKm;
          const elapsedHours = distanceFromDayStartKm / averageSpeedKph;
          const eta = new Date(startDate.getTime() + elapsedHours * 60 * 60 * 1000);

          return {
            ...point,
            analysisSequence: 0,
            etaIso: eta.toISOString(),
            elapsedHours,
            dayIndex,
            dayPlanId: dayPlan.id,
          };
        })
      : [
          {
            ...startPoint,
            analysisSequence: 0,
            etaIso: startDate.toISOString(),
            elapsedHours: 0,
            dayIndex,
            dayPlanId: dayPlan.id,
          },
        ];

  return {
    waypoints,
    routeDistanceKm,
    routeStartWaypointSequence,
    routeEndWaypointSequence,
    requiredHours,
    warnings,
  };
}
