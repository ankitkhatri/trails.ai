import type {
  DayScenerySummary,
  RouteAnalysisDaySummary,
  SceneryPhoto,
  SceneryQueryInput,
  TrekAnchor,
  TrekContext,
} from "@/lib/types";

function anchorElevation(anchor: TrekAnchor) {
  return anchor.kind === "custom" ? anchor.elevationM ?? 0 : 0;
}

function getTerrainTag(daySummary: RouteAnalysisDaySummary) {
  const maxElevation = Math.max(
    anchorElevation(daySummary.startAnchor),
    anchorElevation(daySummary.endAnchor),
    daySummary.sidePointForecast?.elevationM ?? 0
  );

  if (maxElevation >= 3800) {
    return "alpine ridge";
  }

  if (maxElevation >= 2600) {
    return "high mountain trail";
  }

  if (maxElevation >= 1600) {
    return "mountain village trail";
  }

  return "forest trail";
}

function getElevationBand(daySummary: RouteAnalysisDaySummary): "low" | "mid" | "high" {
  const maxElevation = Math.max(
    anchorElevation(daySummary.startAnchor),
    anchorElevation(daySummary.endAnchor),
    daySummary.sidePointForecast?.elevationM ?? 0
  );

  if (maxElevation >= 3500) {
    return "high";
  }

  if (maxElevation >= 1800) {
    return "mid";
  }

  return "low";
}

function getWeatherMood(daySummary: RouteAnalysisDaySummary) {
  if (daySummary.minTemperatureC <= 0) {
    return "snowy alpine";
  }

  if (daySummary.maxPrecipitationMm >= 4) {
    return "rainy trail";
  }

  if (daySummary.maxWindSpeedKph >= 40) {
    return "windy ridge";
  }

  if (daySummary.maxPrecipitationMm >= 1) {
    return "misty mountain";
  }

  return "clear ridge";
}

function getViewQuality(daySummary: RouteAnalysisDaySummary) {
  if (daySummary.minTemperatureC <= 0 || daySummary.maxPrecipitationMm >= 4) {
    return "low visibility";
  }

  if (daySummary.maxPrecipitationMm >= 1 || daySummary.maxWindSpeedKph >= 35) {
    return "partial views";
  }

  return "wide clear views";
}

function getTrailCondition(daySummary: RouteAnalysisDaySummary) {
  if (daySummary.minTemperatureC <= 0) {
    return "snowy or icy";
  }

  if (daySummary.maxPrecipitationMm >= 4) {
    return "wet and muddy";
  }

  if (daySummary.maxPrecipitationMm >= 1) {
    return "damp";
  }

  return "mostly dry";
}

export function buildSceneryQueryInput(
  daySummary: RouteAnalysisDaySummary,
  trekContext: TrekContext
): SceneryQueryInput {
  const terrainTag = getTerrainTag(daySummary);
  const weatherMood = getWeatherMood(daySummary);
  const viewQuality = getViewQuality(daySummary);
  const trailCondition = getTrailCondition(daySummary);

  return {
    dayPlanId: daySummary.dayPlanId,
    dayNumber: daySummary.dayNumber,
    dayLabel: daySummary.label,
    startLabel: daySummary.startLabel,
    endLabel: daySummary.endLabel,
    routeDisplayName: trekContext.routeDisplayName,
    region: trekContext.region,
    country: trekContext.country,
    season: trekContext.season,
    routeDistanceKm: daySummary.distanceKm,
    elevationBand: getElevationBand(daySummary),
    terrainTag,
    weatherMood,
    viewQuality,
    trailCondition,
  };
}

export function buildSceneryQueries(input: SceneryQueryInput) {
  const route = input.routeDisplayName.trim();
  const region = input.region.trim();
  const country = input.country.trim();
  const season = input.season.trim();
  const stageStops = `${input.startLabel} ${input.endLabel}`.trim();
  const descriptors = `${input.terrainTag} ${input.weatherMood}`.trim();

  return [
    [route, stageStops, region, country, season, descriptors].filter(Boolean).join(" "),
    [route, region, country, descriptors].filter(Boolean).join(" "),
    [region, country, "trek", descriptors].filter(Boolean).join(" "),
    ["mountain trail", descriptors].filter(Boolean).join(" "),
  ].filter(Boolean);
}

export function rankSceneryPhotos(
  photos: SceneryPhoto[],
  queryInput: SceneryQueryInput,
  queryUsed: string
) {
  const keywords = [
    queryInput.routeDisplayName,
    queryInput.region,
    queryInput.country,
    queryInput.terrainTag,
    queryInput.weatherMood,
    queryInput.startLabel,
    queryInput.endLabel,
  ]
    .join(" ")
    .toLowerCase()
    .split(/\s+/)
    .filter((keyword) => keyword.length > 2);

  return [...photos]
    .map((photo) => {
      const haystack = [
        photo.alt,
        photo.description,
        photo.photographerName,
        queryUsed,
      ]
        .join(" ")
        .toLowerCase();
      const score = keywords.reduce(
        (sum, keyword) => sum + (haystack.includes(keyword) ? 1 : 0),
        0
      );

      return { photo, score };
    })
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.photo);
}

export function buildScenerySummary(
  input: SceneryQueryInput,
  photos: SceneryPhoto[],
  queryUsed: string,
  confidence: DayScenerySummary["confidence"]
): DayScenerySummary {
  return {
    dayPlanId: input.dayPlanId,
    dayNumber: input.dayNumber,
    sceneryOutlook: `${input.viewQuality}, ${input.trailCondition} conditions`,
    weatherMood: input.weatherMood,
    viewQuality: input.viewQuality,
    trailCondition: input.trailCondition,
    terrainTag: input.terrainTag,
    queryUsed,
    confidence,
    representativeLabel: "Representative scenery",
    photos,
  };
}
