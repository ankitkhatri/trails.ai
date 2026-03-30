import { NextResponse } from "next/server";
import { estimateWaypointEtas } from "@/lib/eta";
import {
  estimateFixedDayRoute,
  getAnchorDisplayLabel,
  isCustomAnchor,
  normalizeDayPlans,
} from "@/lib/itinerary";
import { scoreWeatherRisk } from "@/lib/risk";
import { getWeatherProvider, MockWeatherProvider } from "@/lib/weather";
import type {
  AnalyzedWaypoint,
  ForecastRequestPoint,
  LocationForecastSummary,
  PlanningMode,
  RiskBreakdown,
  RiskLevel,
  RouteAnalysisDaySummary,
  RouteAnalysisResponse,
  RoutePoint,
  TrekDayPlan,
  TrekAssumptions,
  WeatherForecastPoint,
  WeatherProviderName,
} from "@/lib/types";

type AnalyzeRouteRequest = {
  routeName?: string;
  sampledPoints?: RoutePoint[];
  assumptions?: TrekAssumptions;
  planningMode?: PlanningMode;
  dayPlans?: TrekDayPlan[];
  provider?: WeatherProviderName;
};

type DayComputation = {
  plan: TrekDayPlan;
  routeStartWaypointSequence: number;
  routeEndWaypointSequence: number;
  routeDistanceKm: number;
  requiredHours: number;
  routeWaypoints: AnalyzedWaypoint[];
  startAnchorForecast?: LocationForecastSummary;
  endAnchorForecast?: LocationForecastSummary;
  sidePointForecast?: LocationForecastSummary;
  startTimeIso: string;
  endTimeIso: string;
};

const riskPriority: RiskLevel[] = ["low", "moderate", "high", "extreme"];

function maxRiskLevelFromBreakdowns(risks: RiskBreakdown[]): RiskLevel {
  if (risks.length === 0) {
    return "low";
  }

  return risks.reduce<RiskLevel>((currentMax, risk) => {
    return riskPriority.indexOf(risk.level) > riskPriority.indexOf(currentMax)
      ? risk.level
      : currentMax;
  }, "low");
}

function maxRiskLevel(waypoints: AnalyzedWaypoint[]): RiskLevel {
  return maxRiskLevelFromBreakdowns(waypoints.map((waypoint) => waypoint.risk));
}

function buildLocationForecastSummary(
  id: string,
  label: string,
  kind: LocationForecastSummary["kind"],
  lat: number,
  lng: number,
  elevationM: number | undefined,
  etaIso: string,
  weather: WeatherForecastPoint
): LocationForecastSummary {
  return {
    id,
    label,
    kind,
    lat,
    lng,
    elevationM,
    etaIso,
    weather,
    risk: scoreWeatherRisk(weather),
  };
}

function summarizeRouteElevations(routeWaypoints: AnalyzedWaypoint[]) {
  const elevations = routeWaypoints
    .map((waypoint) => waypoint.elevationM)
    .filter((elevation): elevation is number => typeof elevation === "number");

  if (elevations.length === 0) {
    return {
      routeMinElevationM: null,
      routeMaxElevationM: null,
      routeAverageElevationM: null,
    };
  }

  const totalElevation = elevations.reduce((sum, elevation) => sum + elevation, 0);

  return {
    routeMinElevationM: Math.min(...elevations),
    routeMaxElevationM: Math.max(...elevations),
    routeAverageElevationM: totalElevation / elevations.length,
  };
}

function summarizeDay(day: DayComputation, sampledPoints: RoutePoint[], dayNumber: number) {
  const riskSources = [
    ...day.routeWaypoints.map((waypoint) => waypoint.risk),
    ...(day.startAnchorForecast ? [day.startAnchorForecast.risk] : []),
    ...(day.endAnchorForecast ? [day.endAnchorForecast.risk] : []),
    ...(day.sidePointForecast ? [day.sidePointForecast.risk] : []),
  ];
  const weatherSources = [
    ...day.routeWaypoints.map((waypoint) => waypoint.weather),
    ...(day.startAnchorForecast ? [day.startAnchorForecast.weather] : []),
    ...(day.endAnchorForecast ? [day.endAnchorForecast.weather] : []),
    ...(day.sidePointForecast ? [day.sidePointForecast.weather] : []),
  ];
  const startLabel = getAnchorDisplayLabel(day.plan.startAnchor, sampledPoints);
  const endLabel = getAnchorDisplayLabel(day.plan.endAnchor, sampledPoints);
  const routeElevationSummary = summarizeRouteElevations(day.routeWaypoints);

  return {
    dayNumber,
    dayPlanId: day.plan.id,
    label: day.plan.label,
    startLabel,
    endLabel,
    startAnchor: day.plan.startAnchor,
    endAnchor: day.plan.endAnchor,
    routeStartWaypointSequence: day.routeStartWaypointSequence,
    routeEndWaypointSequence: day.routeEndWaypointSequence,
    startTimeIso: day.startTimeIso,
    endTimeIso: day.endTimeIso,
    distanceKm: day.routeDistanceKm,
    waypointCount: day.routeWaypoints.length,
    routeMinElevationM: routeElevationSummary.routeMinElevationM,
    routeMaxElevationM: routeElevationSummary.routeMaxElevationM,
    routeAverageElevationM: routeElevationSummary.routeAverageElevationM,
    maxRiskLevel: maxRiskLevelFromBreakdowns(riskSources),
    maxWindSpeedKph: Math.max(...weatherSources.map((weather) => weather.windSpeedKph)),
    maxPrecipitationMm: Math.max(...weatherSources.map((weather) => weather.precipitationMm)),
    minTemperatureC: Math.min(...weatherSources.map((weather) => weather.temperatureC)),
    isOverDailyLimit: day.requiredHours > day.plan.movingHours + 0.1,
    startAnchorForecast: day.startAnchorForecast,
    endAnchorForecast: day.endAnchorForecast,
    sidePointForecast: day.sidePointForecast,
  } satisfies RouteAnalysisDaySummary;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyzeRouteRequest;
    const planningMode = body.planningMode ?? "flexible";
    const assumptions = body.assumptions;

    if (!body.sampledPoints || body.sampledPoints.length < 2 || !assumptions) {
      return NextResponse.json(
        { error: "Route samples and trek assumptions are required." },
        { status: 400 }
      );
    }

    const warnings: string[] = [];
    const daySummaries: RouteAnalysisDaySummary[] = [];
    let analyzedWaypoints: AnalyzedWaypoint[] = [];
    let provider = getWeatherProvider(body.provider);
    let providerName: WeatherProviderName = provider.name;

    if (planningMode === "fixed-itinerary") {
      if (!body.dayPlans || body.dayPlans.length === 0) {
        return NextResponse.json(
          { error: "Fixed itinerary mode requires at least one day plan." },
          { status: 400 }
        );
      }

      const normalizedDayPlans = normalizeDayPlans(body.dayPlans, body.sampledPoints);
      const rawRouteWaypoints = normalizedDayPlans.flatMap((plan, index) => {
        const result = estimateFixedDayRoute(
          body.sampledPoints!,
          plan,
          index + 1,
          assumptions.averageSpeedKph
        );
        warnings.push(...result.warnings);
        return result.waypoints;
      });

      const routeTargets: ForecastRequestPoint[] = rawRouteWaypoints.map((waypoint) => ({
        id: `route-${waypoint.dayPlanId}-${waypoint.sequence}-${waypoint.etaIso}`,
        lat: waypoint.lat,
        lng: waypoint.lng,
        elevationM: waypoint.elevationM,
        timeIso: waypoint.etaIso,
      }));

      const extraTargets: ForecastRequestPoint[] = [];

      normalizedDayPlans.forEach((plan, index) => {
        const routeResult = estimateFixedDayRoute(
          body.sampledPoints!,
          plan,
          index + 1,
          assumptions.averageSpeedKph
        );
        const routeEndEta =
          routeResult.waypoints[routeResult.waypoints.length - 1]?.etaIso ??
          plan.startDateTimeIso;

        if (isCustomAnchor(plan.startAnchor)) {
          extraTargets.push({
            id: `${plan.id}:start-anchor`,
            lat: plan.startAnchor.lat,
            lng: plan.startAnchor.lng,
            elevationM: plan.startAnchor.elevationM,
            timeIso: plan.startDateTimeIso,
          });
        }

        if (isCustomAnchor(plan.endAnchor)) {
          extraTargets.push({
            id: `${plan.id}:end-anchor`,
            lat: plan.endAnchor.lat,
            lng: plan.endAnchor.lng,
            elevationM: plan.endAnchor.elevationM,
            timeIso: routeEndEta,
          });
        }

        if (plan.sidePoint) {
          const sidePointTime = new Date(
            new Date(plan.startDateTimeIso).getTime() + plan.sidePoint.timeOffsetHours * 3600000
          ).toISOString();
          extraTargets.push({
            id: `${plan.id}:side-point`,
            lat: plan.sidePoint.lat,
            lng: plan.sidePoint.lng,
            elevationM: plan.sidePoint.elevationM,
            timeIso: sidePointTime,
          });
        }
      });

      const allTargets = [...routeTargets, ...extraTargets];

      const forecastResults = await provider.getForecastForTargets(allTargets).catch(
        async (caughtError) => {
          warnings.push(
            caughtError instanceof Error
              ? `${providerName} provider failed, falling back to mock weather.`
              : "Weather provider failed, falling back to mock weather."
          );

          provider = new MockWeatherProvider();
          providerName = provider.name;
          return provider.getForecastForTargets(allTargets);
        }
      );

      const routeWeather = forecastResults.slice(0, routeTargets.length);
      const extraWeather = forecastResults.slice(routeTargets.length);
      let analysisSequence = 0;

      analyzedWaypoints = rawRouteWaypoints.map((waypoint, index) => ({
        ...waypoint,
        analysisSequence: analysisSequence++,
        weather: routeWeather[index],
        risk: scoreWeatherRisk(routeWeather[index]),
      }));

      const extraWeatherMap = new Map<string, WeatherForecastPoint>();
      extraTargets.forEach((target, index) => {
        extraWeatherMap.set(target.id, extraWeather[index]);
      });

      const dayComputations: DayComputation[] = normalizedDayPlans.map((plan, index) => {
        const routeResult = estimateFixedDayRoute(
          body.sampledPoints!,
          plan,
          index + 1,
          body.assumptions!.averageSpeedKph
        );
        const routeWaypoints = analyzedWaypoints.filter((waypoint) => waypoint.dayPlanId === plan.id);
        const routeEndEta =
          routeWaypoints[routeWaypoints.length - 1]?.etaIso ?? plan.startDateTimeIso;
        const startAnchorForecast =
          isCustomAnchor(plan.startAnchor) &&
          extraWeatherMap.get(`${plan.id}:start-anchor`)
            ? buildLocationForecastSummary(
                `${plan.id}:start-anchor`,
                plan.startAnchor.label,
                "start-anchor",
                plan.startAnchor.lat,
                plan.startAnchor.lng,
                plan.startAnchor.elevationM,
                plan.startDateTimeIso,
                extraWeatherMap.get(`${plan.id}:start-anchor`)!
              )
            : undefined;
        const endAnchorForecast =
          isCustomAnchor(plan.endAnchor) &&
          extraWeatherMap.get(`${plan.id}:end-anchor`)
            ? buildLocationForecastSummary(
                `${plan.id}:end-anchor`,
                plan.endAnchor.label,
                "end-anchor",
                plan.endAnchor.lat,
                plan.endAnchor.lng,
                plan.endAnchor.elevationM,
                routeEndEta,
                extraWeatherMap.get(`${plan.id}:end-anchor`)!
              )
            : undefined;
        const sidePointForecast =
          plan.sidePoint && extraWeatherMap.get(`${plan.id}:side-point`)
            ? buildLocationForecastSummary(
                `${plan.id}:side-point`,
                plan.sidePoint.label,
                "side-point",
                plan.sidePoint.lat,
                plan.sidePoint.lng,
                plan.sidePoint.elevationM,
                new Date(
                  new Date(plan.startDateTimeIso).getTime() + plan.sidePoint.timeOffsetHours * 3600000
                ).toISOString(),
                extraWeatherMap.get(`${plan.id}:side-point`)!
              )
            : undefined;
        const endTimeIso = [routeEndEta, sidePointForecast?.etaIso, endAnchorForecast?.etaIso]
          .filter((value): value is string => Boolean(value))
          .sort()
          .slice(-1)[0] ?? routeEndEta;

        return {
          plan,
          routeStartWaypointSequence: routeResult.routeStartWaypointSequence,
          routeEndWaypointSequence: routeResult.routeEndWaypointSequence,
          routeDistanceKm: routeResult.routeDistanceKm,
          requiredHours: routeResult.requiredHours,
          routeWaypoints,
          startAnchorForecast,
          endAnchorForecast,
          sidePointForecast,
          startTimeIso: plan.startDateTimeIso,
          endTimeIso,
        };
      });

      daySummaries.push(
        ...dayComputations.map((dayComputation, index) =>
          summarizeDay(dayComputation, body.sampledPoints!, index + 1)
        )
      );

      if (
        dayComputations[dayComputations.length - 1].routeEndWaypointSequence <
        body.sampledPoints[body.sampledPoints.length - 1].sequence
      ) {
        warnings.push(
          `The fixed itinerary stops before the GPX finish at km ${dayComputations[
            dayComputations.length - 1
          ].routeDistanceKm.toFixed(1)}.`
        );
      }
    } else {
      const timedWaypoints = estimateWaypointEtas(body.sampledPoints, assumptions);
      const routeTargets: ForecastRequestPoint[] = timedWaypoints.map((waypoint) => ({
        id: `route-${waypoint.analysisSequence}`,
        lat: waypoint.lat,
        lng: waypoint.lng,
        elevationM: waypoint.elevationM,
        timeIso: waypoint.etaIso,
      }));

      const routeWeather = await provider.getForecastForTargets(routeTargets).catch(
        async (caughtError) => {
          warnings.push(
            caughtError instanceof Error
              ? `${providerName} provider failed, falling back to mock weather.`
              : "Weather provider failed, falling back to mock weather."
          );

          provider = new MockWeatherProvider();
          providerName = provider.name;
          return provider.getForecastForTargets(routeTargets);
        }
      );

      analyzedWaypoints = timedWaypoints.map((waypoint, index) => ({
        ...waypoint,
        weather: routeWeather[index],
        risk: scoreWeatherRisk(routeWeather[index]),
      }));
    }

    const extremeCount = analyzedWaypoints.filter(
      (waypoint) => waypoint.risk.level === "extreme"
    ).length;
    const highCount = analyzedWaypoints.filter(
      (waypoint) => waypoint.risk.level === "high"
    ).length;

    if (extremeCount > 0) {
      warnings.push(
        `${extremeCount} sampled points exceed the extreme risk threshold. Review route timing or conditions.`
      );
    } else if (highCount > 0) {
      warnings.push(
        `${highCount} sampled points are flagged high risk. Consider a slower pace or a different weather window.`
      );
    }

    const estimatedMovingHours =
      planningMode === "fixed-itinerary"
        ? daySummaries.reduce(
            (sum, daySummary) =>
              sum + daySummary.distanceKm / Math.max(assumptions.averageSpeedKph, 1),
            0
          )
        : analyzedWaypoints[analyzedWaypoints.length - 1]?.distanceFromStartKm
            ? analyzedWaypoints[analyzedWaypoints.length - 1].distanceFromStartKm /
              assumptions.averageSpeedKph
            : 0;
    const startTimeIso =
      planningMode === "fixed-itinerary"
        ? daySummaries[0]?.startTimeIso ?? assumptions.startDateTimeIso
        : assumptions.startDateTimeIso;
    const endTimeIso =
      planningMode === "fixed-itinerary"
        ? daySummaries[daySummaries.length - 1]?.endTimeIso ?? assumptions.startDateTimeIso
        : analyzedWaypoints[analyzedWaypoints.length - 1]?.etaIso ??
          assumptions.startDateTimeIso;
    const estimatedDays =
      (new Date(endTimeIso).getTime() - new Date(startTimeIso).getTime()) /
      (24 * 60 * 60 * 1000);

    const response: RouteAnalysisResponse = {
      planningMode,
      provider: providerName,
      waypoints: analyzedWaypoints,
      daySummaries,
      warnings,
      summary: {
        totalDistanceKm:
          planningMode === "fixed-itinerary"
            ? daySummaries.reduce((sum, daySummary) => sum + daySummary.distanceKm, 0)
            : analyzedWaypoints[analyzedWaypoints.length - 1]?.distanceFromStartKm ?? 0,
        estimatedMovingHours,
        estimatedDays,
        stageCount: planningMode === "fixed-itinerary" ? daySummaries.length : 0,
        startTimeIso,
        endTimeIso,
        maxRiskLevel: maxRiskLevel(analyzedWaypoints),
        maxWindSpeedKph: Math.max(
          ...analyzedWaypoints.map((waypoint) => waypoint.weather.windSpeedKph)
        ),
        maxPrecipitationMm: Math.max(
          ...analyzedWaypoints.map((waypoint) => waypoint.weather.precipitationMm)
        ),
        minTemperatureC: Math.min(
          ...analyzedWaypoints.map((waypoint) => waypoint.weather.temperatureC)
        ),
      },
    };

    return NextResponse.json(response);
  } catch (caughtError) {
    return NextResponse.json(
      {
        error:
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to analyze route conditions.",
      },
      { status: 400 }
    );
  }
}
