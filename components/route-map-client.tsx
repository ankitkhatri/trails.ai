"use client";

import { Fragment } from "react";
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { haversineDistanceMeters } from "@/lib/geo";
import { getAnchorRouteSequence, isCustomAnchor } from "@/lib/itinerary";
import type {
  AnalyzedWaypoint,
  MapEditIntent,
  PlanningMode,
  RiskLevel,
  RouteBounds,
  RoutePoint,
  TrekDayPlan,
} from "@/lib/types";

type RouteMapClientProps = {
  rawPoints: RoutePoint[];
  sampledPoints: RoutePoint[];
  analyzedWaypoints: AnalyzedWaypoint[];
  bounds: RouteBounds | null;
  planningMode: PlanningMode;
  dayPlans: TrekDayPlan[];
  selectedDayPlanId: string | null;
  mapEditIntent: MapEditIntent | null;
  onMapPick?: (pick: {
    dayPlanId: string;
    target: MapEditIntent["target"];
    routeWaypointSequence: number;
    lat: number;
    lng: number;
    elevationM?: number;
  }) => void;
};

const stageColors = ["#3a6d52", "#5f79a2", "#e67e22", "#8f5bb3", "#b23a48", "#0f766e"];

function colorForRisk(level: RiskLevel) {
  switch (level) {
    case "extreme":
      return "#e11d48";
    case "high":
      return "#f97316";
    case "moderate":
      return "#4c6187";
    default:
      return "#3a6d52";
  }
}

function createLabelIcon(label: string, backgroundColor: string) {
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:999px;background:${backgroundColor};color:white;font-size:12px;font-weight:700;border:2px solid white;box-shadow:0 6px 16px rgba(0,0,0,0.18)">${label}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function findNearestRoutePoint(sampledPoints: RoutePoint[], lat: number, lng: number) {
  return sampledPoints.reduce<RoutePoint>((closest, point) => {
    const closestDistance = haversineDistanceMeters(closest, { lat, lng });
    const pointDistance = haversineDistanceMeters(point, { lat, lng });
    return pointDistance < closestDistance ? point : closest;
  }, sampledPoints[0]);
}

function MapClickHandler({
  sampledPoints,
  mapEditIntent,
  onMapPick,
}: {
  sampledPoints: RoutePoint[];
  mapEditIntent: MapEditIntent | null;
  onMapPick?: RouteMapClientProps["onMapPick"];
}) {
  useMapEvents({
    click(event) {
      if (!mapEditIntent || !onMapPick || sampledPoints.length === 0) {
        return;
      }

      const nearestRoutePoint = findNearestRoutePoint(
        sampledPoints,
        event.latlng.lat,
        event.latlng.lng
      );
      const shouldSnap =
        mapEditIntent.target === "start-route" || mapEditIntent.target === "end-route";

      onMapPick({
        dayPlanId: mapEditIntent.dayPlanId,
        target: mapEditIntent.target,
        routeWaypointSequence: nearestRoutePoint.sequence,
        lat: shouldSnap ? nearestRoutePoint.lat : event.latlng.lat,
        lng: shouldSnap ? nearestRoutePoint.lng : event.latlng.lng,
        elevationM: shouldSnap ? nearestRoutePoint.elevationM : undefined,
      });
    },
  });

  return null;
}

export default function RouteMapClient({
  rawPoints,
  sampledPoints,
  analyzedWaypoints,
  bounds,
  planningMode,
  dayPlans,
  selectedDayPlanId,
  mapEditIntent,
  onMapPick,
}: RouteMapClientProps) {
  const hasRoute = rawPoints.length > 1 && bounds;
  const analysisBySequence = new Map<number, AnalyzedWaypoint>();

  analyzedWaypoints.forEach((waypoint) => {
    analysisBySequence.set(waypoint.sequence, waypoint);
  });

  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-6 py-5">
        <div>
          <h2 className="text-lg font-semibold text-storm-900">Route Planner Map</h2>
          <p className="mt-1 text-sm text-storm-600">
            {planningMode === "fixed-itinerary"
              ? "Use the bottom dock to pick a day, then edit that day directly on the map."
              : "Review the route and weather risk along the sampled GPX track."}
          </p>
        </div>
        {mapEditIntent ? (
          <div className="rounded-full bg-ridge-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-ridge-800">
            {mapEditIntent.target.replace("-", " ")}
          </div>
        ) : null}
      </div>

      <div className="relative h-[560px]">
        {hasRoute ? (
          <MapContainer bounds={bounds as RouteBounds} scrollWheelZoom={true} preferCanvas className="z-0">
            <MapClickHandler
              sampledPoints={sampledPoints}
              mapEditIntent={mapEditIntent}
              onMapPick={onMapPick}
            />

            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <Polyline
              positions={rawPoints.map((point) => [point.lat, point.lng] as [number, number])}
              pathOptions={{ color: "#64748b", weight: 4, opacity: 0.35 }}
              interactive={false}
            />

            {planningMode === "fixed-itinerary"
              ? dayPlans.map((plan, index) => {
                  const startSequence = getAnchorRouteSequence(plan.startAnchor);
                  const endSequence = getAnchorRouteSequence(plan.endAnchor);
                  const stagePoints = sampledPoints.filter(
                    (point) => point.sequence >= startSequence && point.sequence <= endSequence
                  );

                  return (
                    <Polyline
                      key={plan.id}
                      positions={stagePoints.map(
                        (point) => [point.lat, point.lng] as [number, number]
                      )}
                      pathOptions={{
                        color: stageColors[index % stageColors.length],
                        weight: selectedDayPlanId === plan.id ? 8 : 6,
                        opacity: 0.9,
                      }}
                      interactive={false}
                    />
                  );
                })
              : analyzedWaypoints.slice(1).map((point, index) => (
                  <Polyline
                    key={`${analyzedWaypoints[index].analysisSequence}-${point.analysisSequence}`}
                    positions={[
                      [analyzedWaypoints[index].lat, analyzedWaypoints[index].lng],
                      [point.lat, point.lng],
                    ]}
                    pathOptions={{
                      color: colorForRisk(point.risk.level),
                      weight: 6,
                      opacity: 0.9,
                    }}
                    interactive={false}
                  />
                ))}

            {planningMode === "fixed-itinerary"
              ? dayPlans.map((plan, index) => {
                  const color = stageColors[index % stageColors.length];
                  const routeStart = sampledPoints[getAnchorRouteSequence(plan.startAnchor)];
                  const routeEnd = sampledPoints[getAnchorRouteSequence(plan.endAnchor)];

                  return (
                    <Fragment key={plan.id}>
                      <Marker
                        position={[routeStart.lat, routeStart.lng]}
                        icon={createLabelIcon(`S${index + 1}`, color)}
                      >
                        <Popup>Start for {plan.label}</Popup>
                      </Marker>
                      <Marker
                        position={[routeEnd.lat, routeEnd.lng]}
                        icon={createLabelIcon(`${index + 1}`, color)}
                      >
                        <Popup>End for {plan.label}</Popup>
                      </Marker>

                      {isCustomAnchor(plan.startAnchor) ? (
                        <CircleMarker
                          center={[plan.startAnchor.lat, plan.startAnchor.lng]}
                          radius={7}
                          pathOptions={{ color, fillOpacity: 0.9, weight: 3 }}
                        >
                          <Tooltip permanent direction="top">
                            {plan.startAnchor.label}
                          </Tooltip>
                        </CircleMarker>
                      ) : null}

                      {isCustomAnchor(plan.endAnchor) ? (
                        <CircleMarker
                          center={[plan.endAnchor.lat, plan.endAnchor.lng]}
                          radius={7}
                          pathOptions={{ color, fillOpacity: 0.9, weight: 3 }}
                        >
                          <Tooltip permanent direction="top">
                            {plan.endAnchor.label}
                          </Tooltip>
                        </CircleMarker>
                      ) : null}

                      {plan.sidePoint ? (
                        <CircleMarker
                          center={[plan.sidePoint.lat, plan.sidePoint.lng]}
                          radius={6}
                          pathOptions={{ color: "#7c3aed", fillOpacity: 0.85, weight: 3 }}
                        >
                          <Tooltip permanent direction="top">
                            {plan.sidePoint.label}
                          </Tooltip>
                        </CircleMarker>
                      ) : null}
                    </Fragment>
                  );
                })
              : sampledPoints.map((point) => {
                  const analyzedPoint = analysisBySequence.get(point.sequence);

                  return (
                    <CircleMarker
                      key={point.sequence}
                      center={[point.lat, point.lng]}
                      radius={4}
                      pathOptions={{
                        color: analyzedPoint ? colorForRisk(analyzedPoint.risk.level) : "#64748b",
                        fillOpacity: 0.9,
                        weight: 2,
                      }}
                    >
                      <Popup>
                        <div className="space-y-1 text-sm">
                          <div className="font-semibold">
                            Km {point.distanceFromStartKm.toFixed(1)}
                          </div>
                          {analyzedPoint ? (
                            <div>{new Date(analyzedPoint.etaIso).toLocaleString()}</div>
                          ) : null}
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
          </MapContainer>
        ) : (
          <div className="flex h-full items-center justify-center border-t border-black/5 bg-white/80 px-6 text-center text-sm text-storm-600">
            Upload and parse a GPX route to populate the map.
          </div>
        )}

        {mapEditIntent ? (
          <div className="pointer-events-none absolute left-4 top-4 z-[1000] rounded-[1.25rem] bg-white/95 px-4 py-3 text-sm font-medium text-storm-800 shadow-terrain">
            {mapEditIntent.target === "start-route" && "Click near the route to set the day start."}
            {mapEditIntent.target === "start-custom" && "Click anywhere on the map to place a custom start."}
            {mapEditIntent.target === "end-route" && "Click near the route to set the day end."}
            {mapEditIntent.target === "end-custom" && "Click anywhere on the map to place a custom end."}
            {mapEditIntent.target === "side-point" && "Click anywhere on the map to place the side point."}
          </div>
        ) : null}
      </div>
    </section>
  );
}
