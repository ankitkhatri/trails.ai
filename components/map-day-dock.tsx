"use client";

import { useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import { getAnchorDisplayLabel } from "@/lib/itinerary";
import type {
  DayScenerySummary,
  MapEditIntent,
  RouteAnalysisDaySummary,
  RoutePoint,
  TrekDayPlan,
} from "@/lib/types";

type MapDayDockProps = {
  sampledPoints: RoutePoint[];
  dayPlans: TrekDayPlan[];
  daySummaries: RouteAnalysisDaySummary[];
  dayScenery: Record<string, DayScenerySummary | undefined>;
  sceneryIsStale?: boolean;
  selectedDayPlanId: string | null;
  mapEditIntent: MapEditIntent | null;
  dirtyDayPlanIds: string[];
  readOnly?: boolean;
  onSelectDayPlan: (dayPlanId: string | null) => void;
  onSetMapEditIntent: (intent: MapEditIntent | null) => void;
  onChangeDayPlan: (dayPlanId: string, updates: Partial<TrekDayPlan>) => void;
  onAddDayPlan: () => void;
  onDuplicateDayPlan: (dayPlanId: string) => void;
  onRemoveDayPlan: (dayPlanId: string) => void;
  onApplyDayTemplate: (
    dayPlanId: string,
    template: "route" | "rest" | "acclimatization"
  ) => void;
};

function toDatetimeLocalValue(dateIso: string) {
  const date = new Date(dateIso);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function riskTone(level: string) {
  switch (level) {
    case "extreme":
      return "bg-rose-600 text-white";
    case "high":
      return "bg-amber-500 text-white";
    case "moderate":
      return "bg-storm-600 text-white";
    default:
      return "bg-ridge-700 text-white";
  }
}

function openGalleryForDay(
  onSelectDayPlan: (dayPlanId: string | null) => void,
  setLightboxIndex: (index: number | null) => void,
  dayPlanId: string,
  photoIndex: number
) {
  onSelectDayPlan(dayPlanId);
  setLightboxIndex(photoIndex);
}

export function MapDayDock({
  sampledPoints,
  dayPlans,
  daySummaries,
  dayScenery,
  sceneryIsStale = false,
  selectedDayPlanId,
  mapEditIntent,
  dirtyDayPlanIds,
  readOnly = false,
  onSelectDayPlan,
  onSetMapEditIntent,
  onChangeDayPlan,
  onAddDayPlan,
  onDuplicateDayPlan,
  onRemoveDayPlan,
  onApplyDayTemplate,
}: MapDayDockProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const selectedDayPlan =
    dayPlans.find((dayPlan) => dayPlan.id === selectedDayPlanId) ?? dayPlans[0] ?? null;
  const selectedDaySummary =
    daySummaries.find((daySummary) => daySummary.dayPlanId === selectedDayPlan?.id) ?? null;
  const selectedScenery = selectedDayPlan ? dayScenery[selectedDayPlan.id] : undefined;
  const lightboxPhotos = selectedScenery?.photos ?? [];
  const selectedGallery = selectedScenery?.photos.slice(0, 6) ?? [];

  if (dayPlans.length === 0) {
    return null;
  }

  const selectedIndex = selectedDayPlan
    ? dayPlans.findIndex((dayPlan) => dayPlan.id === selectedDayPlan.id)
    : -1;
  const canGoPrevious = selectedIndex > 0;
  const canGoNext = selectedIndex >= 0 && selectedIndex < dayPlans.length - 1;

  return (
    <div className="border-t border-black/5 bg-white/95 px-4 py-4 backdrop-blur sm:px-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-storm-500">
            Day Planner
          </h3>
          <p className="mt-1 text-sm text-storm-600">
            Click a day to inspect conditions and edit its route anchors or side point.
          </p>
        </div>
        {!readOnly ? (
          <button
            type="button"
            onClick={onAddDayPlan}
            className="rounded-full bg-ridge-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ridge-800"
          >
            Add Day
          </button>
        ) : null}
      </div>

      <div className="mb-5 flex gap-3 overflow-x-auto pb-2">
        {dayPlans.map((dayPlan, index) => {
          const daySummary = daySummaries.find((entry) => entry.dayPlanId === dayPlan.id);
          const scenery = dayScenery[dayPlan.id];
          const isSelected = selectedDayPlan?.id === dayPlan.id;
          const hero = scenery?.photos[0];
          const gallery = scenery?.photos.slice(0, 3) ?? [];
          const isDirty = dirtyDayPlanIds.includes(dayPlan.id);

          return (
            <button
              type="button"
              key={dayPlan.id}
              onClick={() => onSelectDayPlan(dayPlan.id)}
              className={`min-w-[240px] overflow-hidden rounded-[1.5rem] border text-left transition ${
                isSelected
                  ? "border-ridge-500 bg-ridge-50"
                  : "border-storm-200 bg-white hover:border-ridge-300"
              }`}
            >
              {hero ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    openGalleryForDay(onSelectDayPlan, setLightboxIndex, dayPlan.id, 0);
                  }}
                  className="block h-24 w-full overflow-hidden bg-storm-100"
                >
                  <img
                    src={hero.smallUrl}
                    alt={hero.alt}
                    className="h-full w-full object-cover transition duration-300 hover:scale-[1.04]"
                    loading="lazy"
                  />
                </button>
              ) : (
                <div className="h-24 bg-gradient-to-br from-ridge-100 via-white to-storm-100" />
              )}
              <div className="space-y-2 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.22em] text-storm-500">
                      Day {index + 1}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-base font-semibold text-storm-900">
                      <span>{dayPlan.label}</span>
                      {isDirty ? (
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />
                      ) : null}
                    </div>
                  </div>
                  {daySummary ? (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${riskTone(
                        daySummary.maxRiskLevel
                      )}`}
                    >
                      {daySummary.maxRiskLevel}
                    </span>
                  ) : null}
                </div>
                <div className="text-sm text-storm-600">
                  {getAnchorDisplayLabel(dayPlan.startAnchor, sampledPoints)}
                  {" -> "}
                  {getAnchorDisplayLabel(dayPlan.endAnchor, sampledPoints)}
                </div>
                <div className="flex items-center justify-between text-sm text-storm-500">
                  <span>
                    {daySummary ? `${daySummary.distanceKm.toFixed(1)} km` : "Pending analysis"}
                  </span>
                  {scenery?.confidence ? (
                    <span className="capitalize">{scenery.confidence}</span>
                  ) : null}
                </div>
                {gallery.length > 0 ? (
                  <div className="grid grid-cols-3 gap-1">
                    {gallery.map((photo, photoIndex) => (
                      <button
                        type="button"
                        key={photo.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          openGalleryForDay(
                            onSelectDayPlan,
                            setLightboxIndex,
                            dayPlan.id,
                            photoIndex
                          );
                        }}
                        className="overflow-hidden rounded-xl bg-storm-100"
                      >
                        <img
                          src={photo.thumbUrl}
                          alt={photo.alt}
                          className="h-12 w-full object-cover transition duration-300 hover:scale-[1.05]"
                          loading={photoIndex === 0 ? "eager" : "lazy"}
                        />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      {selectedDayPlan && selectedGallery.length > 0 ? (
        <section className="mb-5 rounded-[1.5rem] border border-storm-200 bg-gradient-to-br from-white via-ridge-50/60 to-storm-50/70 p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-storm-500">
                Day Gallery
              </div>
              <div className="mt-1 text-lg font-semibold text-storm-900">
                {selectedScenery?.representativeLabel ?? selectedDayPlan.label}
              </div>
              <div className="mt-1 text-sm text-storm-600">
                Click any image to open the full gallery for this day.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLightboxIndex(0)}
              className="rounded-full border border-storm-200 bg-white px-4 py-2 text-sm font-semibold text-storm-700 transition hover:border-ridge-400 hover:text-ridge-900"
            >
              Open Gallery
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {selectedGallery.map((photo, photoIndex) => (
              <button
                type="button"
                key={photo.id}
                onClick={() => setLightboxIndex(photoIndex)}
                className="group overflow-hidden rounded-[1.25rem] border border-white/60 bg-white shadow-sm"
              >
                <div className="relative">
                  <img
                    src={photo.smallUrl}
                    alt={photo.alt}
                    className="h-24 w-full object-cover transition duration-300 group-hover:scale-[1.05]"
                    loading="lazy"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-storm-950/70 to-transparent px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
                    Photo {photoIndex + 1}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {selectedDayPlan ? (
        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[1.75rem] border border-storm-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-storm-500">
                  {selectedDaySummary ? `Day ${selectedDaySummary.dayNumber}` : "Selected day"}
                </div>
                <h4 className="mt-2 text-xl font-semibold text-storm-900">
                  {selectedDayPlan.label}
                </h4>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!canGoPrevious}
                  onClick={() =>
                    canGoPrevious ? onSelectDayPlan(dayPlans[selectedIndex - 1]?.id ?? null) : null
                  }
                  className="rounded-full border border-storm-200 px-3 py-1.5 text-xs font-semibold text-storm-700 transition hover:border-ridge-400 disabled:cursor-not-allowed disabled:text-storm-300"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={!canGoNext}
                  onClick={() =>
                    canGoNext ? onSelectDayPlan(dayPlans[selectedIndex + 1]?.id ?? null) : null
                  }
                  className="rounded-full border border-storm-200 px-3 py-1.5 text-xs font-semibold text-storm-700 transition hover:border-ridge-400 disabled:cursor-not-allowed disabled:text-storm-300"
                >
                  Next
                </button>
                {!readOnly ? (
                  <button
                    type="button"
                    onClick={() => onDuplicateDayPlan(selectedDayPlan.id)}
                    className="rounded-full border border-storm-200 px-3 py-1.5 text-xs font-semibold text-storm-700 transition hover:border-ridge-400 hover:text-ridge-900"
                  >
                    Duplicate day
                  </button>
                ) : null}
                {!readOnly && dayPlans.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => onRemoveDayPlan(selectedDayPlan.id)}
                    className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                  >
                    Remove day
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              {!readOnly ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onApplyDayTemplate(selectedDayPlan.id, "route")}
                    className="rounded-full border border-storm-200 px-3 py-1.5 text-xs font-semibold text-storm-700 transition hover:border-ridge-400 hover:text-ridge-900"
                  >
                    Route day
                  </button>
                  <button
                    type="button"
                    onClick={() => onApplyDayTemplate(selectedDayPlan.id, "rest")}
                    className="rounded-full border border-storm-200 px-3 py-1.5 text-xs font-semibold text-storm-700 transition hover:border-ridge-400 hover:text-ridge-900"
                  >
                    Rest day
                  </button>
                  <button
                    type="button"
                    onClick={() => onApplyDayTemplate(selectedDayPlan.id, "acclimatization")}
                    className="rounded-full border border-storm-200 px-3 py-1.5 text-xs font-semibold text-storm-700 transition hover:border-ridge-400 hover:text-ridge-900"
                  >
                    Acclimatization day
                  </button>
                  {mapEditIntent?.dayPlanId === selectedDayPlan.id ? (
                    <button
                      type="button"
                      onClick={() => onSetMapEditIntent(null)}
                      className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                    >
                      Cancel map action
                    </button>
                  ) : null}
                </div>
              ) : null}

              <label className="grid gap-2">
                <span className="text-sm font-medium text-storm-800">Label</span>
                <input
                  type="text"
                  disabled={readOnly}
                  value={selectedDayPlan.label}
                  onChange={(event) =>
                    onChangeDayPlan(selectedDayPlan.id, { label: event.target.value })
                  }
                  className="rounded-2xl border border-storm-200 bg-white px-4 py-3 text-sm text-storm-900 outline-none transition disabled:bg-storm-50 disabled:text-storm-500 focus:border-ridge-500"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-storm-800">Day start time</span>
                  <input
                    type="datetime-local"
                    disabled={readOnly}
                    value={toDatetimeLocalValue(selectedDayPlan.startDateTimeIso)}
                    onChange={(event) => {
                      if (!event.target.value) {
                        return;
                      }

                      onChangeDayPlan(selectedDayPlan.id, {
                        startDateTimeIso: new Date(event.target.value).toISOString(),
                      });
                    }}
                    className="rounded-2xl border border-storm-200 bg-white px-4 py-3 text-sm text-storm-900 outline-none transition disabled:bg-storm-50 disabled:text-storm-500 focus:border-ridge-500"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-storm-800">Planned walking hours</span>
                  <input
                    type="number"
                    disabled={readOnly}
                    min="0"
                    max="16"
                    step="0.5"
                    value={selectedDayPlan.movingHours}
                    onChange={(event) =>
                      onChangeDayPlan(selectedDayPlan.id, {
                        movingHours: Number(event.target.value),
                      })
                    }
                    className="rounded-2xl border border-storm-200 bg-white px-4 py-3 text-sm text-storm-900 outline-none transition disabled:bg-storm-50 disabled:text-storm-500 focus:border-ridge-500"
                  />
                </label>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl bg-storm-50 p-4">
                  <div className="text-sm font-semibold text-storm-900">Start anchor</div>
                  <div className="mt-2 text-sm text-storm-700">
                    {getAnchorDisplayLabel(selectedDayPlan.startAnchor, sampledPoints)}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() =>
                        onSetMapEditIntent({
                          dayPlanId: selectedDayPlan.id,
                          target: "start-route",
                        })
                      }
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        mapEditIntent?.dayPlanId === selectedDayPlan.id &&
                        mapEditIntent.target === "start-route"
                          ? "bg-ridge-700 text-white"
                          : "bg-white text-storm-800"
                      }`}
                    >
                      Set on route
                    </button>
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() =>
                        onSetMapEditIntent({
                          dayPlanId: selectedDayPlan.id,
                          target: "start-custom",
                        })
                      }
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        mapEditIntent?.dayPlanId === selectedDayPlan.id &&
                        mapEditIntent.target === "start-custom"
                          ? "bg-ridge-700 text-white"
                          : "bg-white text-storm-800"
                      }`}
                    >
                      Set custom
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl bg-storm-50 p-4">
                  <div className="text-sm font-semibold text-storm-900">End anchor</div>
                  <div className="mt-2 text-sm text-storm-700">
                    {getAnchorDisplayLabel(selectedDayPlan.endAnchor, sampledPoints)}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() =>
                        onSetMapEditIntent({
                          dayPlanId: selectedDayPlan.id,
                          target: "end-route",
                        })
                      }
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        mapEditIntent?.dayPlanId === selectedDayPlan.id &&
                        mapEditIntent.target === "end-route"
                          ? "bg-ridge-700 text-white"
                          : "bg-white text-storm-800"
                      }`}
                    >
                      Set on route
                    </button>
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() =>
                        onSetMapEditIntent({
                          dayPlanId: selectedDayPlan.id,
                          target: "end-custom",
                        })
                      }
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        mapEditIntent?.dayPlanId === selectedDayPlan.id &&
                        mapEditIntent.target === "end-custom"
                          ? "bg-ridge-700 text-white"
                          : "bg-white text-storm-800"
                      }`}
                    >
                      Set custom
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-storm-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-storm-900">Optional side point</div>
                    <div className="mt-1 text-sm text-storm-700">
                      {selectedDayPlan.sidePoint
                        ? `${selectedDayPlan.sidePoint.label} at +${selectedDayPlan.sidePoint.timeOffsetHours.toFixed(
                            1
                          )} h`
                        : "No acclimatization or side-hike point yet."}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() =>
                        onSetMapEditIntent({
                          dayPlanId: selectedDayPlan.id,
                          target: "side-point",
                        })
                      }
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        mapEditIntent?.dayPlanId === selectedDayPlan.id &&
                        mapEditIntent.target === "side-point"
                          ? "bg-ridge-700 text-white"
                          : "bg-white text-storm-800"
                      }`}
                    >
                      {selectedDayPlan.sidePoint ? "Edit point" : "Add point"}
                    </button>
                    {selectedDayPlan.sidePoint ? (
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() => onChangeDayPlan(selectedDayPlan.id, { sidePoint: undefined })}
                        className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-rose-700"
                      >
                        Clear point
                      </button>
                    ) : null}
                  </div>
                </div>
                {selectedDayPlan.sidePoint ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-storm-800">Side point label</span>
                      <input
                        type="text"
                        disabled={readOnly}
                        value={selectedDayPlan.sidePoint.label}
                        onChange={(event) =>
                          onChangeDayPlan(selectedDayPlan.id, {
                            sidePoint: {
                              ...selectedDayPlan.sidePoint!,
                              label: event.target.value,
                            },
                          })
                        }
                        className="rounded-2xl border border-storm-200 bg-white px-4 py-3 text-sm text-storm-900 outline-none transition disabled:bg-storm-50 disabled:text-storm-500 focus:border-ridge-500"
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-storm-800">
                        Hours after day start
                      </span>
                      <input
                        type="number"
                        disabled={readOnly}
                        min="0"
                        max="24"
                        step="0.5"
                        value={selectedDayPlan.sidePoint.timeOffsetHours}
                        onChange={(event) =>
                          onChangeDayPlan(selectedDayPlan.id, {
                            sidePoint: {
                              ...selectedDayPlan.sidePoint!,
                              timeOffsetHours: Number(event.target.value),
                            },
                          })
                        }
                        className="rounded-2xl border border-storm-200 bg-white px-4 py-3 text-sm text-storm-900 outline-none transition disabled:bg-storm-50 disabled:text-storm-500 focus:border-ridge-500"
                      />
                    </label>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-[1.75rem] border border-storm-200 bg-white p-5">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-storm-500">
                Day conditions
              </div>
              <h4 className="mt-2 text-xl font-semibold text-storm-900">
                {selectedDaySummary?.label ?? selectedDayPlan.label}
              </h4>
            </div>

            {selectedDaySummary ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-storm-50 px-4 py-3 text-sm text-storm-700">
                  Distance <strong>{selectedDaySummary.distanceKm.toFixed(1)} km</strong>
                </div>
                <div className="rounded-2xl bg-storm-50 px-4 py-3 text-sm text-storm-700">
                  Max risk <strong>{selectedDaySummary.maxRiskLevel}</strong>
                </div>
                <div className="rounded-2xl bg-storm-50 px-4 py-3 text-sm text-storm-700">
                  Max wind <strong>{selectedDaySummary.maxWindSpeedKph.toFixed(0)} km/h</strong>
                </div>
                <div className="rounded-2xl bg-storm-50 px-4 py-3 text-sm text-storm-700">
                  Min temp <strong>{selectedDaySummary.minTemperatureC.toFixed(1)} C</strong>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-storm-50 px-4 py-3 text-sm text-storm-700">
                Run analysis to load weather, risk, and representative scenery for this day.
              </div>
            )}

            {selectedDaySummary?.sidePointForecast ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Side point {selectedDaySummary.sidePointForecast.label}:{" "}
                {selectedDaySummary.sidePointForecast.weather.temperatureC.toFixed(1)} C,{" "}
                {selectedDaySummary.sidePointForecast.weather.windSpeedKph.toFixed(0)} km/h
              </div>
            ) : null}

            {selectedScenery ? (
              <div className="space-y-3">
                <div className="rounded-2xl bg-ridge-50 px-4 py-3 text-sm text-ridge-900">
                  <div className="font-semibold">{selectedScenery.representativeLabel}</div>
                  <div className="mt-1">
                    {selectedScenery.sceneryOutlook}. {selectedScenery.weatherMood}.
                  </div>
                  <div className="mt-2 text-xs uppercase tracking-[0.18em] text-ridge-700">
                    {selectedScenery.confidence ?? "no photo match"}
                  </div>
                  {sceneryIsStale ? (
                    <div className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                      Showing cached scenery from the last analysis. Rerun analysis to refresh.
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {selectedScenery.photos.map((photo, photoIndex) => (
                    <article
                      key={photo.id}
                      className="overflow-hidden rounded-[1.5rem] border border-storm-200 bg-white"
                    >
                      <button
                        type="button"
                        onClick={() => setLightboxIndex(photoIndex)}
                        className="block w-full text-left"
                      >
                        <img
                          src={photo.smallUrl}
                          alt={photo.alt}
                          className="h-28 w-full object-cover transition hover:scale-[1.02]"
                          loading="lazy"
                        />
                      </button>
                      <div className="space-y-2 px-3 py-3 text-xs text-storm-600">
                        <div className="line-clamp-2">{photo.alt}</div>
                        <a
                          href={photo.unsplashUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-ridge-700 underline"
                        >
                          {photo.photographerName}
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <Lightbox
        open={lightboxIndex !== null}
        close={() => setLightboxIndex(null)}
        index={lightboxIndex ?? 0}
        plugins={[Thumbnails]}
        slides={lightboxPhotos.map((photo) => ({
          src: photo.regularUrl,
          alt: photo.alt,
          thumbnail: photo.thumbUrl,
        }))}
        carousel={{ finite: false }}
        controller={{ closeOnBackdropClick: true }}
        thumbnails={{
          position: "bottom",
          width: 104,
          height: 72,
          border: 0,
          borderRadius: 14,
          padding: 0,
          gap: 10,
          vignette: false,
          showToggle: false,
        }}
        render={{
          slide: ({ slide }) => (
            <div className="flex h-full w-full items-center justify-center bg-black">
              <img
                src={slide.src}
                alt={slide.alt ?? ""}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ),
          buttonPrev:
            lightboxPhotos.length > 1
              ? undefined
              : () => <span className="hidden" />,
          buttonNext:
            lightboxPhotos.length > 1
              ? undefined
              : () => <span className="hidden" />,
          iconClose: () => (
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white">
              Close
            </span>
          ),
        }}
        styles={{
          container: {
            backgroundColor: "rgba(6, 10, 18, 0.9)",
          },
          thumbnailsTrack: {
            background: "transparent",
            padding: "0 1rem 1rem",
          },
          thumbnailsContainer: {
            background: "transparent",
          },
          thumbnail: {
            background: "rgba(255,255,255,0.06)",
          },
        }}
      />
    </div>
  );
}
