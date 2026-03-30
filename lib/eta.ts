import type { RoutePoint, TimedWaypoint, TrekAssumptions } from "@/lib/types";

export function estimateWaypointEtas(
  sampledPoints: RoutePoint[],
  assumptions: TrekAssumptions
): TimedWaypoint[] {
  const start = new Date(assumptions.startDateTimeIso);

  if (Number.isNaN(start.getTime())) {
    throw new Error("Start date and time is invalid.");
  }

  if (assumptions.averageSpeedKph <= 0) {
    throw new Error("Average speed must be greater than zero.");
  }

  if (assumptions.movingHoursPerDay <= 0) {
    throw new Error("Moving hours per day must be greater than zero.");
  }

  const restHoursPerDay = Math.max(24 - assumptions.movingHoursPerDay, 0);

  return sampledPoints.map((point) => {
    const movingHours = point.distanceFromStartKm / assumptions.averageSpeedKph;
    const restBlocks =
      assumptions.movingHoursPerDay >= 24
        ? 0
        : Math.floor(Math.max(movingHours - 1e-9, 0) / assumptions.movingHoursPerDay);
    const elapsedHours = movingHours + restBlocks * restHoursPerDay;
    const eta = new Date(start.getTime() + elapsedHours * 60 * 60 * 1000);

    return {
      ...point,
      analysisSequence: point.sequence,
      etaIso: eta.toISOString(),
      elapsedHours,
      dayIndex: restBlocks + 1,
    };
  });
}
