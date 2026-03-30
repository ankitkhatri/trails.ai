import type { RouteBounds, RoutePoint } from "@/lib/types";

type BarePoint = Pick<RoutePoint, "lat" | "lng" | "elevationM">;

const EARTH_RADIUS_M = 6371000;

export function haversineDistanceMeters(a: BarePoint, b: BarePoint) {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const y = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));

  return EARTH_RADIUS_M * y;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function toRoutePoint(point: BarePoint, cumulativeDistanceM: number, sequence: number): RoutePoint {
  return {
    sequence,
    lat: point.lat,
    lng: point.lng,
    elevationM: point.elevationM,
    cumulativeDistanceM,
    distanceFromStartKm: cumulativeDistanceM / 1000,
  };
}

function interpolatePoint(
  start: BarePoint,
  end: BarePoint,
  ratio: number,
  cumulativeDistanceM: number,
  sequence: number
): RoutePoint {
  const elevationM =
    start.elevationM !== undefined && end.elevationM !== undefined
      ? start.elevationM + (end.elevationM - start.elevationM) * ratio
      : start.elevationM ?? end.elevationM;

  return toRoutePoint(
    {
      lat: start.lat + (end.lat - start.lat) * ratio,
      lng: start.lng + (end.lng - start.lng) * ratio,
      elevationM,
    },
    cumulativeDistanceM,
    sequence
  );
}

export function buildRoutePoints(points: BarePoint[]): RoutePoint[] {
  if (points.length < 2) {
    return [];
  }

  let cumulativeDistanceM = 0;

  return points.map((point, index) => {
    if (index > 0) {
      cumulativeDistanceM += haversineDistanceMeters(points[index - 1], point);
    }

    return toRoutePoint(point, cumulativeDistanceM, index);
  });
}

export function sampleRouteEveryMeters(
  routePoints: RoutePoint[],
  sampleDistanceMeters = 1000
): RoutePoint[] {
  if (routePoints.length < 2) {
    return routePoints;
  }

  const sampled: RoutePoint[] = [
    {
      ...routePoints[0],
      sequence: 0,
    },
  ];

  let nextSampleDistance = sampleDistanceMeters;
  let sampledIndex = 1;

  for (let index = 1; index < routePoints.length; index += 1) {
    const previousPoint = routePoints[index - 1];
    const currentPoint = routePoints[index];
    const segmentDistance = currentPoint.cumulativeDistanceM - previousPoint.cumulativeDistanceM;

    if (segmentDistance <= 0) {
      continue;
    }

    while (currentPoint.cumulativeDistanceM >= nextSampleDistance) {
      const ratio =
        (nextSampleDistance - previousPoint.cumulativeDistanceM) / segmentDistance;

      sampled.push(
        interpolatePoint(
          previousPoint,
          currentPoint,
          ratio,
          nextSampleDistance,
          sampledIndex
        )
      );

      sampledIndex += 1;
      nextSampleDistance += sampleDistanceMeters;
    }
  }

  const finalPoint = routePoints[routePoints.length - 1];
  const lastSample = sampled[sampled.length - 1];

  if (
    finalPoint.cumulativeDistanceM - lastSample.cumulativeDistanceM >
    Math.min(sampleDistanceMeters * 0.2, 200)
  ) {
    sampled.push({
      ...finalPoint,
      sequence: sampledIndex,
    });
  } else {
    sampled[sampled.length - 1] = {
      ...finalPoint,
      sequence: sampled[sampled.length - 1].sequence,
    };
  }

  return sampled.map((point, index) => ({
    ...point,
    sequence: index,
  }));
}

export function getBounds(points: BarePoint[]): RouteBounds {
  const lats = points.map((point) => point.lat);
  const lngs = points.map((point) => point.lng);

  return [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)],
  ];
}
