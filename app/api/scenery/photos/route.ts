import { NextResponse } from "next/server";
import {
  buildSceneryQueries,
  buildSceneryQueryInput,
  buildScenerySummary,
  rankSceneryPhotos,
} from "@/lib/scenery";
import type {
  DayScenerySummary,
  RouteAnalysisDaySummary,
  SceneryConfidence,
  SceneryPhoto,
  TrekContext,
} from "@/lib/types";

type SceneryRequest = {
  trekContext?: TrekContext;
  daySummaries?: RouteAnalysisDaySummary[];
};

type UnsplashSearchResponse = {
  results?: Array<{
    id: string;
    width: number;
    height: number;
    color?: string;
    alt_description?: string | null;
    description?: string | null;
    urls: {
      thumb: string;
      small: string;
      regular: string;
    };
    user: {
      name: string;
      username: string;
      links: {
        html: string;
      };
    };
    links: {
      html: string;
    };
  }>;
};

const confidenceByQueryIndex: SceneryConfidence[] = [
  "route-specific",
  "region-specific",
  "generic terrain/weather",
  "generic terrain/weather",
];

function toPhoto(
  result: NonNullable<UnsplashSearchResponse["results"]>[number],
  appName: string
): SceneryPhoto {
  const utmSuffix = `?utm_source=${encodeURIComponent(appName)}&utm_medium=referral`;

  return {
    id: result.id,
    alt: result.alt_description ?? "Representative mountain scenery",
    description: result.description ?? result.alt_description ?? "",
    width: result.width,
    height: result.height,
    color: result.color,
    thumbUrl: result.urls.thumb,
    smallUrl: result.urls.small,
    regularUrl: result.urls.regular,
    photographerName: result.user.name,
    photographerUsername: result.user.username,
    photographerProfileUrl: `${result.user.links.html}${utmSuffix}`,
    unsplashUrl: `${result.links.html}${utmSuffix}`,
  };
}

async function fetchUnsplashPhotos(query: string, accessKey: string, appName: string) {
  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", query);
  url.searchParams.set("orientation", "landscape");
  url.searchParams.set("content_filter", "high");
  url.searchParams.set("per_page", "6");

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Client-ID ${accessKey}`,
      "Accept-Version": "v1",
    },
    next: { revalidate: 1800 },
  });

  if (!response.ok) {
    throw new Error("Unsplash search failed.");
  }

  const data = (await response.json()) as UnsplashSearchResponse;

  return (data.results ?? []).map((result) => toPhoto(result, appName));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SceneryRequest;
    const daySummaries = body.daySummaries ?? [];
    const trekContext: TrekContext = body.trekContext ?? {
      routeDisplayName: "",
      region: "",
      country: "",
      season: "",
    };
    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    const appName = process.env.UNSPLASH_APP_NAME ?? "trek-weather-planner";

    const sceneryByDay = await Promise.all(
      daySummaries.map(async (daySummary): Promise<DayScenerySummary> => {
        const queryInput = buildSceneryQueryInput(daySummary, trekContext);
        const queries = buildSceneryQueries(queryInput);

        if (!accessKey) {
          return buildScenerySummary(queryInput, [], queries[0] ?? "", null);
        }

        for (let index = 0; index < queries.length; index += 1) {
          const query = queries[index];
          const photos = await fetchUnsplashPhotos(query, accessKey, appName);

          if (photos.length > 0) {
            const rankedPhotos = rankSceneryPhotos(photos, queryInput, query).slice(0, 3);
            return buildScenerySummary(
              queryInput,
              rankedPhotos,
              query,
              confidenceByQueryIndex[index]
            );
          }
        }

        return buildScenerySummary(queryInput, [], queries[queries.length - 1] ?? "", null);
      })
    );

    return NextResponse.json({ dayScenery: sceneryByDay });
  } catch (caughtError) {
    return NextResponse.json(
      {
        error:
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load representative scenery photos.",
      },
      { status: 400 }
    );
  }
}
