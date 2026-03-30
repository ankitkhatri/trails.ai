import { XMLParser } from "fast-xml-parser";
import type { RoutePoint } from "@/lib/types";

type GpxPointShape = {
  lat?: string | number;
  lon?: string | number;
  ele?: string | number;
};

type ParsedGpx = {
  name: string;
  points: Omit<RoutePoint, "sequence" | "cumulativeDistanceM" | "distanceFromStartKm">[];
};

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function extractTrackPoints(node: unknown): GpxPointShape[] {
  if (!node || typeof node !== "object") {
    return [];
  }

  const record = node as Record<string, unknown>;
  const directTrackPoints = asArray(record.trkpt as GpxPointShape | GpxPointShape[]);
  const directRoutePoints = asArray(record.rtept as GpxPointShape | GpxPointShape[]);

  const nestedTrackSegments = asArray(record.trkseg).flatMap((segment) =>
    extractTrackPoints(segment)
  );
  const nestedTracks = asArray(record.trk).flatMap((track) => extractTrackPoints(track));
  const nestedRoutes = asArray(record.rte).flatMap((route) => extractTrackPoints(route));

  return [
    ...directTrackPoints,
    ...directRoutePoints,
    ...nestedTrackSegments,
    ...nestedTracks,
    ...nestedRoutes,
  ];
}

export function parseGpxText(gpxText: string): ParsedGpx {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    trimValues: true,
    parseTagValue: true,
  });

  const parsed = parser.parse(gpxText) as {
    gpx?: {
      metadata?: { name?: string };
      trk?: { name?: string } | { name?: string }[];
      rte?: { name?: string } | { name?: string }[];
    };
  };

  const root = parsed.gpx;

  if (!root) {
    throw new Error("The uploaded file is not valid GPX.");
  }

  const rawPoints = extractTrackPoints(root)
    .map((point) => {
      const lat = Number(point.lat);
      const lng = Number(point.lon);
      const elevationM =
        point.ele === undefined || point.ele === null ? undefined : Number(point.ele);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return null;
      }

      return {
        lat,
        lng,
        elevationM: Number.isFinite(elevationM) ? elevationM : undefined,
      };
    })
    .filter((point): point is NonNullable<typeof point> => point !== null);

  if (rawPoints.length < 2) {
    throw new Error("The GPX file does not contain enough route points.");
  }

  const trackName = asArray(root.trk)
    .map((track) => track.name)
    .find(Boolean);
  const routeName = asArray(root.rte)
    .map((route) => route.name)
    .find(Boolean);

  return {
    name: root.metadata?.name ?? trackName ?? routeName ?? "Uploaded Route",
    points: rawPoints,
  };
}
