"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { GpxUploader } from "@/components/gpx-uploader";
import { MapDayDock } from "@/components/map-day-dock";
import { PlanSavePanel } from "@/components/plan-save-panel";
import { RouteMap } from "@/components/route-map";
import { SummaryCards } from "@/components/summary-cards";
import { TrekAssumptionsForm } from "@/components/trek-assumptions-form";
import { TrekContextForm } from "@/components/trek-context-form";
import { WarningsPanel } from "@/components/warnings-panel";
import { WaypointWeatherTable } from "@/components/waypoint-weather-table";
import {
  createCustomAnchor,
  createRouteAnchor,
  getAnchorRouteSequence,
  getRoutePointBySequence,
  normalizeDayPlans,
  suggestFixedItinerary,
} from "@/lib/itinerary";
import type {
  DayScenerySummary,
  MapEditIntent,
  PlanOwnerMode,
  PlanningMode,
  RouteAnalysisResponse,
  RouteParseResponse,
  SavedPlanPayload,
  SavePlanRequest,
  TrekAssumptions,
  TrekContext,
  TrekDayPlan,
  TrekSidePoint,
  WeatherProviderName,
} from "@/lib/types";

const defaultStart = new Date(Date.now() + 24 * 60 * 60 * 1000);

function toDatetimeLocalValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function addOneDay(dateIso: string) {
  const date = new Date(dateIso);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString();
}

function buildDefaultPlanTitle(routeName?: string) {
  return routeName ? `${routeName} plan` : "Untitled trek plan";
}

const defaultAssumptions: TrekAssumptions = {
  startDateTimeIso: defaultStart.toISOString(),
  averageSpeedKph: 3.8,
  movingHoursPerDay: 7,
  sampleDistanceKm: 1,
};

const defaultTrekContext: TrekContext = {
  routeDisplayName: "",
  region: "",
  country: "",
  season: "",
};

type PlannerShellProps = {
  defaultProvider: WeatherProviderName;
  initialPlan?: SavedPlanPayload;
};

export function PlannerShell({ defaultProvider, initialPlan }: PlannerShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [route, setRoute] = useState<RouteParseResponse | null>(initialPlan?.route ?? null);
  const [analysis, setAnalysis] = useState<RouteAnalysisResponse | null>(
    initialPlan?.analysis ?? null
  );
  const [assumptions, setAssumptions] = useState<TrekAssumptions>(
    initialPlan?.assumptions ?? defaultAssumptions
  );
  const [trekContext, setTrekContext] = useState<TrekContext>(
    initialPlan?.trekContext ?? defaultTrekContext
  );
  const [planningMode, setPlanningMode] = useState<PlanningMode>(
    initialPlan?.planningMode ?? "flexible"
  );
  const [dayPlans, setDayPlans] = useState<TrekDayPlan[]>(initialPlan?.dayPlans ?? []);
  const [selectedDayPlanId, setSelectedDayPlanId] = useState<string | null>(
    initialPlan?.dayPlans[0]?.id ?? null
  );
  const [mapEditIntent, setMapEditIntent] = useState<MapEditIntent | null>(null);
  const [dayScenery, setDayScenery] = useState<Record<string, DayScenerySummary | undefined>>(
    initialPlan?.dayScenery ?? {}
  );
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>(
    initialPlan?.uploadedFileName ?? ""
  );
  const [weatherProvider, setWeatherProvider] = useState<WeatherProviderName>(
    initialPlan?.weatherProvider ?? defaultProvider
  );
  const [planId, setPlanId] = useState<string | null>(initialPlan?.id ?? null);
  const [planTitle, setPlanTitle] = useState<string>(
    initialPlan?.title ?? buildDefaultPlanTitle(initialPlan?.route?.name)
  );
  const [ownerMode, setOwnerMode] = useState<PlanOwnerMode>(
    initialPlan?.ownerMode ?? "unsaved"
  );
  const [shareToken, setShareToken] = useState<string | null>(initialPlan?.shareToken ?? null);
  const [dirty, setDirty] = useState(false);
  const [dirtyDayPlanIds, setDirtyDayPlanIds] = useState<string[]>([]);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(
    initialPlan?.updatedAt ?? null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const isReadOnly = ownerMode === "shared-readonly";
  const isAuthenticated = status === "authenticated";
  const hasScenery = Object.values(dayScenery).some(Boolean);
  const sceneryIsStale = hasScenery && dirty;

  const warnings = useMemo(() => {
    return [
      ...(route?.warnings ?? []),
      ...(analysis?.warnings ?? []),
      ...(error ? [error] : []),
    ].filter(Boolean);
  }, [analysis?.warnings, error, route?.warnings]);

  const selectedDayNumber = useMemo(() => {
    if (!selectedDayPlanId) {
      return null;
    }

    const analysisMatch = analysis?.daySummaries.find(
      (daySummary) => daySummary.dayPlanId === selectedDayPlanId
    );

    if (analysisMatch) {
      return analysisMatch.dayNumber;
    }

    const dayIndex = dayPlans.findIndex((dayPlan) => dayPlan.id === selectedDayPlanId);
    return dayIndex >= 0 ? dayIndex + 1 : null;
  }, [analysis?.daySummaries, dayPlans, selectedDayPlanId]);

  function clearDerivedState() {
    setAnalysis(null);
  }

  function markDirty(dayPlanIds: string[] = []) {
    if (isReadOnly) {
      return;
    }

    setDirty(true);
    setSaveMessage(null);

    if (dayPlanIds.length > 0) {
      setDirtyDayPlanIds((current) =>
        Array.from(new Set([...current, ...dayPlanIds]))
      );
    }
  }

  function applySavedPlan(savedPlan: SavedPlanPayload) {
    setRoute(savedPlan.route);
    setAnalysis(savedPlan.analysis);
    setAssumptions(savedPlan.assumptions);
    setTrekContext(savedPlan.trekContext);
    setPlanningMode(savedPlan.planningMode);
    setDayPlans(savedPlan.dayPlans);
    setSelectedDayPlanId(savedPlan.dayPlans[0]?.id ?? null);
    setMapEditIntent(null);
    setDayScenery(savedPlan.dayScenery);
    setUploadedFileName(savedPlan.uploadedFileName);
    setWeatherProvider(savedPlan.weatherProvider);
    setPlanId(savedPlan.id);
    setPlanTitle(savedPlan.title);
    setOwnerMode(savedPlan.ownerMode);
    setShareToken(savedPlan.shareToken);
    setDirty(false);
    setDirtyDayPlanIds([]);
    setLastSavedAt(savedPlan.updatedAt);
    setSaveError(null);
    setError(null);
  }

  function setNormalizedPlans(nextPlans: TrekDayPlan[]) {
    if (!route) {
      setDayPlans(nextPlans);
      return;
    }

    setDayPlans(normalizeDayPlans(nextPlans, route.sampledPoints));
  }

  function updateDayPlans(nextPlans: TrekDayPlan[], changedDayIds: string[] = []) {
    setNormalizedPlans(nextPlans);
    clearDerivedState();
    markDirty(changedDayIds);
  }

  function syncAdjacentDayBoundaries(
    nextPlans: TrekDayPlan[],
    dayPlanId: string,
    target: MapEditIntent["target"]
  ) {
    const changedIndex = nextPlans.findIndex((dayPlan) => dayPlan.id === dayPlanId);

    if (changedIndex < 0) {
      return nextPlans;
    }

    const plans = [...nextPlans];

    if (target === "start-route" || target === "start-custom") {
      const previousDay = plans[changedIndex - 1];

      if (previousDay) {
        plans[changedIndex - 1] = {
          ...previousDay,
          endAnchor: plans[changedIndex].startAnchor,
        };
      }
    }

    if (target === "end-route" || target === "end-custom") {
      const nextDay = plans[changedIndex + 1];

      if (nextDay) {
        plans[changedIndex + 1] = {
          ...nextDay,
          startAnchor: plans[changedIndex].endAnchor,
        };
      }
    }

    return plans;
  }

  function resetSuggestedItinerary(
    nextRoute: RouteParseResponse | null = route,
    nextAssumptions: TrekAssumptions = assumptions
  ) {
    if (!nextRoute) {
      setDayPlans([]);
      setSelectedDayPlanId(null);
      return [];
    }

    const suggestedPlans = suggestFixedItinerary(nextRoute.sampledPoints, nextAssumptions);
    setDayPlans(suggestedPlans);
    setSelectedDayPlanId(suggestedPlans[0]?.id ?? null);
    setMapEditIntent(null);
    return suggestedPlans;
  }

  async function loadScenery(nextAnalysis: RouteAnalysisResponse) {
    if (nextAnalysis.planningMode !== "fixed-itinerary" || nextAnalysis.daySummaries.length === 0) {
      setDayScenery({});
      return;
    }

    try {
      const response = await fetch("/api/scenery/photos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trekContext,
          daySummaries: nextAnalysis.daySummaries,
        }),
      });
      const data = (await response.json()) as { dayScenery?: DayScenerySummary[] };

      if (!response.ok) {
        throw new Error("Unable to load representative scenery.");
      }

      setDayScenery(
        Object.fromEntries((data.dayScenery ?? []).map((item) => [item.dayPlanId, item]))
      );
    } catch {
      // Keep the previous gallery cached if scenery refresh fails.
    }
  }

  async function handleAnalyze() {
    if (!route) {
      setError("Upload and parse a GPX route before running analysis.");
      return;
    }

    setError(null);
    setIsAnalyzing(true);
    setSaveMessage(null);

    try {
      const response = await fetch("/api/route/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          routeName: route.name,
          sampledPoints: route.sampledPoints,
          assumptions,
          planningMode,
          dayPlans: planningMode === "fixed-itinerary" ? dayPlans : undefined,
          provider: weatherProvider,
        }),
      });

      const data = (await response.json()) as RouteAnalysisResponse | { error: string };

      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Route analysis failed.");
      }

      setAnalysis(data);
      await loadScenery(data);
      if (!isReadOnly) {
        setDirty(true);
      }
    } catch (caughtError) {
      setAnalysis(null);
      setError(
        caughtError instanceof Error ? caughtError.message : "Route analysis failed."
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  function buildSaveRequest(): SavePlanRequest {
    return {
      title: planTitle,
      uploadedFileName,
      route,
      planningMode,
      assumptions,
      trekContext,
      weatherProvider,
      dayPlans,
      analysis,
      dayScenery: Object.values(dayScenery).filter(
        (entry): entry is DayScenerySummary => Boolean(entry)
      ),
    };
  }

  async function persistPlan(method: "POST" | "PATCH", url: string, successMessage: string) {
    if (!route) {
      setSaveError("Upload and parse a GPX route before saving.");
      return;
    }

    if (!isAuthenticated) {
      setSaveError("Log in to save this plan.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildSaveRequest()),
      });
      const payload = (await response.json()) as SavedPlanPayload | { error: string };

      if (!response.ok || "error" in payload) {
        throw new Error("error" in payload ? payload.error : "Unable to save plan.");
      }

      applySavedPlan(payload);
      setOwnerMode("owner");
      setSaveMessage(successMessage);
      router.replace(`/plans/${payload.id}`);
      router.refresh();
    } catch (caughtError) {
      setSaveError(caughtError instanceof Error ? caughtError.message : "Unable to save plan.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSave() {
    await persistPlan(
      planId ? "PATCH" : "POST",
      planId ? `/api/plans/${planId}` : "/api/plans",
      planId ? "Plan updated." : "Plan saved."
    );
  }

  async function handleSaveAsCopy() {
    await persistPlan("POST", "/api/plans", "Plan copy saved.");
  }

  async function handleDelete() {
    if (!planId || isReadOnly) {
      return;
    }

    const shouldDelete = window.confirm("Delete this saved trek plan?");

    if (!shouldDelete) {
      return;
    }

    setIsDeleting(true);
    setSaveError(null);
    setSaveMessage(null);

    try {
      const response = await fetch(`/api/plans/${planId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Unable to delete plan.");
      }

      router.push("/plans");
      router.refresh();
    } catch (caughtError) {
      setSaveError(
        caughtError instanceof Error ? caughtError.message : "Unable to delete plan."
      );
    } finally {
      setIsDeleting(false);
    }
  }

  function buildAcclimatizationSidePoint(dayPlan: TrekDayPlan): TrekSidePoint | undefined {
    if (!route) {
      return undefined;
    }

    const routePoint = getRoutePointBySequence(
      route.sampledPoints,
      getAnchorRouteSequence(dayPlan.startAnchor)
    );

    return {
      id: dayPlan.sidePoint?.id ?? `${dayPlan.id}-side-point`,
      label: dayPlan.sidePoint?.label ?? "Acclimatization walk",
      lat: routePoint.lat,
      lng: routePoint.lng,
      elevationM: routePoint.elevationM,
      timeOffsetHours: dayPlan.sidePoint?.timeOffsetHours ?? 2,
    };
  }

  function applyDayTemplate(dayPlanId: string, template: "route" | "rest" | "acclimatization") {
    if (!route) {
      return;
    }

    const targetDay = dayPlans.find((dayPlan) => dayPlan.id === dayPlanId);

    if (!targetDay) {
      return;
    }

    const startSequence = getAnchorRouteSequence(targetDay.startAnchor);
    const nextRoutePoint =
      route.sampledPoints.find((point) => point.sequence > startSequence) ??
      getRoutePointBySequence(route.sampledPoints, startSequence);

    const nextPlans = dayPlans.map((dayPlan) => {
      if (dayPlan.id !== dayPlanId) {
        return dayPlan;
      }

      if (template === "route") {
        return {
          ...dayPlan,
          label: dayPlan.label || "Route day",
          endAnchor:
            getAnchorRouteSequence(dayPlan.endAnchor) > startSequence
              ? dayPlan.endAnchor
              : createRouteAnchor(nextRoutePoint.sequence),
        };
      }

      if (template === "rest") {
        return {
          ...dayPlan,
          label: "Rest day",
          endAnchor: dayPlan.startAnchor,
          sidePoint: undefined,
        };
      }

      return {
        ...dayPlan,
        label: "Acclimatization day",
        endAnchor: dayPlan.startAnchor,
        sidePoint: buildAcclimatizationSidePoint(dayPlan),
      };
    });

    updateDayPlans(nextPlans, [dayPlanId]);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-[1600px] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="space-y-6">
          <header className="panel overflow-hidden p-6">
            <p className="text-xs uppercase tracking-[0.28em] text-ridge-700">
              Trek Weather Planner
            </p>
            <div className="mt-4 space-y-3">
              <h1 className="font-[family:var(--font-serif)] text-4xl leading-none text-ridge-900">
                Map-first route timing, weather risk, and representative scenery.
              </h1>
              <p className="text-sm leading-7 text-storm-700">
                Keep the left side for global settings, then use the map dock to plan
                each fixed day directly against the route.
              </p>
            </div>
          </header>

          <PlanSavePanel
            title={planTitle}
            onTitleChange={(nextTitle) => {
              setPlanTitle(nextTitle);
              markDirty();
            }}
            ownerMode={ownerMode}
            isAuthenticated={isAuthenticated}
            currentPath={pathname}
            dirty={dirty}
            lastSavedAt={lastSavedAt}
            planId={planId}
            shareToken={shareToken}
            isSaving={isSaving}
            isDeleting={isDeleting}
            message={saveMessage}
            error={saveError}
            onSave={() => {
              void handleSave();
            }}
            onSaveAsCopy={() => {
              void handleSaveAsCopy();
            }}
            onDelete={() => {
              void handleDelete();
            }}
          />

          <GpxUploader
            uploadedFileName={uploadedFileName}
            disabled={isReadOnly}
            onParsed={(parsedRoute, fileName) => {
              setRoute(parsedRoute);
              clearDerivedState();
              setDayScenery({});
              setUploadedFileName(fileName);
              setError(null);
              setTrekContext((currentContext) => ({
                ...currentContext,
                routeDisplayName: currentContext.routeDisplayName || parsedRoute.name,
              }));
              setPlanTitle((currentTitle) =>
                currentTitle === buildDefaultPlanTitle(initialPlan?.route?.name) ||
                currentTitle === "Untitled trek plan"
                  ? buildDefaultPlanTitle(parsedRoute.name)
                  : currentTitle
              );
              const suggestedPlans = resetSuggestedItinerary(parsedRoute);
              markDirty(suggestedPlans.map((plan) => plan.id));
            }}
            onError={(message) => {
              setError(message);
            }}
          />

          <TrekContextForm
            context={trekContext}
            disabled={isReadOnly}
            onChange={(nextContext) => {
              setTrekContext(nextContext);
              clearDerivedState();
              markDirty();
            }}
          />

          <TrekAssumptionsForm
            assumptions={assumptions}
            displayStartDateTime={toDatetimeLocalValue(new Date(assumptions.startDateTimeIso))}
            readOnly={isReadOnly}
            onChange={(nextAssumptions) => {
              setAssumptions(nextAssumptions);
              clearDerivedState();
              markDirty(dayPlans.map((dayPlan) => dayPlan.id));
            }}
            planningMode={planningMode}
            onPlanningModeChange={(nextPlanningMode) => {
              setPlanningMode(nextPlanningMode);
              clearDerivedState();

              if (nextPlanningMode === "fixed-itinerary" && route && dayPlans.length === 0) {
                const suggestedPlans = resetSuggestedItinerary(route, assumptions);
                markDirty(suggestedPlans.map((plan) => plan.id));
              } else {
                markDirty(dayPlans.map((dayPlan) => dayPlan.id));
              }
            }}
            weatherProvider={weatherProvider}
            onWeatherProviderChange={(nextProvider) => {
              setWeatherProvider(nextProvider);
              setAnalysis(null);
              markDirty();
            }}
            onAnalyze={handleAnalyze}
            disabled={!route}
            isAnalyzing={isAnalyzing}
          />

          {planningMode === "fixed-itinerary" && route ? (
            <section className="panel p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-storm-900">Itinerary helpers</h2>
                  <p className="mt-1 text-sm text-storm-600">
                    Re-split the route from pace assumptions before fine-tuning each day on the map.
                  </p>
                </div>
                {!isReadOnly ? (
                  <button
                    type="button"
                    onClick={() => {
                      const suggestedPlans = resetSuggestedItinerary(route, assumptions);
                      clearDerivedState();
                      markDirty(suggestedPlans.map((plan) => plan.id));
                    }}
                    className="rounded-full border border-storm-200 px-4 py-2 text-sm font-medium text-storm-700 transition hover:border-ridge-400 hover:text-ridge-900"
                  >
                    Suggest From Pace
                  </button>
                ) : null}
              </div>
            </section>
          ) : null}

          <WarningsPanel warnings={warnings} waypoints={analysis?.waypoints ?? []} />
        </div>

        <div className="space-y-6">
          <SummaryCards route={route} analysis={analysis} />
          <RouteMap
            rawPoints={route?.rawPoints ?? []}
            sampledPoints={route?.sampledPoints ?? []}
            analyzedWaypoints={analysis?.waypoints ?? []}
            bounds={route?.bounds ?? null}
            planningMode={planningMode}
            dayPlans={dayPlans}
            selectedDayPlanId={selectedDayPlanId}
            mapEditIntent={isReadOnly ? null : mapEditIntent}
            onMapPick={
              isReadOnly
                ? undefined
                : (pick) => {
                    const selectedPlan = dayPlans.find(
                      (dayPlan) => dayPlan.id === pick.dayPlanId
                    );

                    if (!selectedPlan) {
                      return;
                    }

                    if (pick.target === "start-route") {
                      const nextPlans = syncAdjacentDayBoundaries(
                        dayPlans.map((dayPlan) =>
                          dayPlan.id === pick.dayPlanId
                            ? {
                                ...dayPlan,
                                startAnchor: createRouteAnchor(pick.routeWaypointSequence),
                              }
                            : dayPlan
                        ),
                        pick.dayPlanId,
                        pick.target
                      );
                      updateDayPlans(nextPlans, [pick.dayPlanId]);
                    }

                    if (pick.target === "start-custom") {
                      const nextPlans = syncAdjacentDayBoundaries(
                        dayPlans.map((dayPlan) =>
                          dayPlan.id === pick.dayPlanId
                            ? {
                                ...dayPlan,
                                startAnchor: createCustomAnchor(
                                  pick.routeWaypointSequence,
                                  pick.lat,
                                  pick.lng,
                                  "Custom start",
                                  pick.elevationM
                                ),
                              }
                            : dayPlan
                        ),
                        pick.dayPlanId,
                        pick.target
                      );
                      updateDayPlans(nextPlans, [pick.dayPlanId]);
                    }

                    if (pick.target === "end-route") {
                      const nextPlans = syncAdjacentDayBoundaries(
                        dayPlans.map((dayPlan) =>
                          dayPlan.id === pick.dayPlanId
                            ? {
                                ...dayPlan,
                                endAnchor: createRouteAnchor(pick.routeWaypointSequence),
                              }
                            : dayPlan
                        ),
                        pick.dayPlanId,
                        pick.target
                      );
                      updateDayPlans(nextPlans, [pick.dayPlanId]);
                    }

                    if (pick.target === "end-custom") {
                      const nextPlans = syncAdjacentDayBoundaries(
                        dayPlans.map((dayPlan) =>
                          dayPlan.id === pick.dayPlanId
                            ? {
                                ...dayPlan,
                                endAnchor: createCustomAnchor(
                                  pick.routeWaypointSequence,
                                  pick.lat,
                                  pick.lng,
                                  "Custom end",
                                  pick.elevationM
                                ),
                              }
                            : dayPlan
                        ),
                        pick.dayPlanId,
                        pick.target
                      );
                      updateDayPlans(nextPlans, [pick.dayPlanId]);
                    }

                    if (pick.target === "side-point") {
                      updateDayPlans(
                        dayPlans.map((dayPlan) =>
                          dayPlan.id === pick.dayPlanId
                            ? {
                                ...dayPlan,
                                sidePoint: {
                                  id: dayPlan.sidePoint?.id ?? `${dayPlan.id}-side-point`,
                                  label: dayPlan.sidePoint?.label ?? "Side point",
                                  lat: pick.lat,
                                  lng: pick.lng,
                                  elevationM: pick.elevationM,
                                  timeOffsetHours:
                                    dayPlan.sidePoint?.timeOffsetHours ??
                                    Math.max(dayPlan.movingHours / 2, 0),
                                },
                              }
                            : dayPlan
                        ),
                        [pick.dayPlanId]
                      );
                    }

                    setMapEditIntent(null);
                    setSelectedDayPlanId(pick.dayPlanId);
                    setError(null);
                  }
            }
          />

          {planningMode === "fixed-itinerary" && route ? (
            <MapDayDock
              sampledPoints={route.sampledPoints}
              dayPlans={dayPlans}
              daySummaries={analysis?.daySummaries ?? []}
              dayScenery={dayScenery}
              sceneryIsStale={sceneryIsStale}
              selectedDayPlanId={selectedDayPlanId}
              mapEditIntent={isReadOnly ? null : mapEditIntent}
              dirtyDayPlanIds={dirtyDayPlanIds}
              readOnly={isReadOnly}
              onSelectDayPlan={(dayPlanId) => {
                setSelectedDayPlanId(dayPlanId);
                setMapEditIntent(null);
              }}
              onSetMapEditIntent={setMapEditIntent}
              onChangeDayPlan={(dayPlanId, updates) => {
                updateDayPlans(
                  dayPlans.map((dayPlan) =>
                    dayPlan.id === dayPlanId ? { ...dayPlan, ...updates } : dayPlan
                  ),
                  [dayPlanId]
                );
              }}
              onAddDayPlan={() => {
                if (!route || dayPlans.length === 0) {
                  const suggestedPlans = resetSuggestedItinerary(route, assumptions);
                  markDirty(suggestedPlans.map((plan) => plan.id));
                  return;
                }

                const lastPlan = dayPlans[dayPlans.length - 1];
                const startSequence = getAnchorRouteSequence(lastPlan.startAnchor);
                const endSequence = getAnchorRouteSequence(lastPlan.endAnchor);
                const splitSequence =
                  endSequence > startSequence
                    ? Math.floor((startSequence + endSequence) / 2)
                    : endSequence;
                const shortenedLastPlan: TrekDayPlan = {
                  ...lastPlan,
                  endAnchor: createRouteAnchor(splitSequence),
                };
                const newPlan: TrekDayPlan = {
                  id: `day-${Date.now()}`,
                  label: `Day ${dayPlans.length + 1}`,
                  startDateTimeIso: addOneDay(lastPlan.startDateTimeIso),
                  movingHours: lastPlan.movingHours,
                  startAnchor: createRouteAnchor(splitSequence),
                  endAnchor: lastPlan.endAnchor,
                };

                updateDayPlans(
                  [...dayPlans.slice(0, -1), shortenedLastPlan, newPlan],
                  [lastPlan.id, newPlan.id]
                );
                setSelectedDayPlanId(newPlan.id);
              }}
              onDuplicateDayPlan={(dayPlanId) => {
                const sourceIndex = dayPlans.findIndex((dayPlan) => dayPlan.id === dayPlanId);

                if (sourceIndex < 0) {
                  return;
                }

                const sourcePlan = dayPlans[sourceIndex];
                const duplicatePlan: TrekDayPlan = {
                  ...sourcePlan,
                  id: `day-${Date.now()}`,
                  label: `${sourcePlan.label} copy`,
                  startDateTimeIso: addOneDay(sourcePlan.startDateTimeIso),
                };
                const nextPlans = [...dayPlans];
                nextPlans.splice(sourceIndex + 1, 0, duplicatePlan);
                updateDayPlans(nextPlans, [duplicatePlan.id]);
                setSelectedDayPlanId(duplicatePlan.id);
              }}
              onRemoveDayPlan={(dayPlanId) => {
                const nextPlans = dayPlans.filter((dayPlan) => dayPlan.id !== dayPlanId);
                updateDayPlans(nextPlans, nextPlans.map((dayPlan) => dayPlan.id));
                setSelectedDayPlanId(nextPlans[0]?.id ?? null);
                setMapEditIntent(null);
              }}
              onApplyDayTemplate={applyDayTemplate}
            />
          ) : null}

          <WaypointWeatherTable
            fileName={uploadedFileName}
            providerLabel={analysis?.provider}
            selectedDayNumber={selectedDayNumber}
            waypoints={analysis?.waypoints ?? []}
          />
        </div>
      </section>
    </main>
  );
}
