import { NextResponse } from "next/server";
import { buildRoutePoints, getBounds, sampleRouteEveryMeters } from "@/lib/geo";
import { parseGpxText } from "@/lib/gpx";
import type { RouteParseResponse } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { gpxText?: string };

    if (!body.gpxText) {
      return NextResponse.json({ error: "Missing GPX text." }, { status: 400 });
    }

    const parsedGpx = parseGpxText(body.gpxText);
    const rawPoints = buildRoutePoints(parsedGpx.points);
    const sampledPoints = sampleRouteEveryMeters(rawPoints, 1000);
    const warnings: string[] = [];

    if (sampledPoints.length < 3) {
      warnings.push("The sampled route is very short. Risk results may be sparse.");
    }

    const response: RouteParseResponse = {
      name: parsedGpx.name,
      rawPoints,
      sampledPoints,
      totalDistanceKm: rawPoints[rawPoints.length - 1]?.distanceFromStartKm ?? 0,
      bounds: getBounds(rawPoints),
      warnings,
    };

    return NextResponse.json(response);
  } catch (caughtError) {
    return NextResponse.json(
      {
        error:
          caughtError instanceof Error ? caughtError.message : "Unable to parse GPX file.",
      },
      { status: 400 }
    );
  }
}
