import type { AnalyzedWaypoint } from "@/lib/types";

type WaypointWeatherTableProps = {
  fileName: string;
  providerLabel?: string;
  selectedDayNumber?: number | null;
  waypoints: AnalyzedWaypoint[];
};

function riskClasses(level: string) {
  switch (level) {
    case "extreme":
      return "bg-rose-600 text-white";
    case "high":
      return "bg-amber-500 text-white";
    case "moderate":
      return "bg-storm-500 text-white";
    default:
      return "bg-ridge-100 text-ridge-900";
  }
}

export function WaypointWeatherTable({
  fileName,
  providerLabel,
  selectedDayNumber,
  waypoints,
}: WaypointWeatherTableProps) {
  const displayedWaypoints =
    selectedDayNumber === null || selectedDayNumber === undefined
      ? waypoints
      : waypoints.filter((waypoint) => waypoint.dayIndex === selectedDayNumber);

  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-black/5 px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-storm-900">Waypoint Weather</h2>
            <p className="mt-1 text-sm text-storm-600">
              Forecast and modeled ETA at each sampled point.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {fileName ? (
              <span className="rounded-full bg-storm-100 px-3 py-1 text-xs font-semibold text-storm-800">
                {fileName}
              </span>
            ) : null}
            {providerLabel ? (
              <span className="rounded-full bg-ridge-100 px-3 py-1 text-xs font-semibold text-ridge-800">
                {providerLabel}
              </span>
            ) : null}
            {selectedDayNumber ? (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                Day {selectedDayNumber}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {displayedWaypoints.length === 0 ? (
        <div className="px-6 py-10 text-sm text-storm-600">
          No waypoint weather yet. Run route analysis after uploading a GPX route.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-storm-50 text-storm-700">
              <tr>
                <th className="px-4 py-3 font-medium">Day</th>
                <th className="px-4 py-3 font-medium">Km</th>
                <th className="px-4 py-3 font-medium">ETA</th>
                <th className="px-4 py-3 font-medium">Temp</th>
                <th className="px-4 py-3 font-medium">Rain</th>
                <th className="px-4 py-3 font-medium">Snow</th>
                <th className="px-4 py-3 font-medium">Wind</th>
                <th className="px-4 py-3 font-medium">Risk</th>
                <th className="px-4 py-3 font-medium">Reasons</th>
              </tr>
            </thead>
            <tbody>
              {displayedWaypoints.map((waypoint) => (
                <tr key={waypoint.analysisSequence} className="border-t border-black/5">
                  <td className="px-4 py-3 text-storm-700">{waypoint.dayIndex}</td>
                  <td className="px-4 py-3 text-storm-900">
                    {waypoint.distanceFromStartKm.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-storm-700">
                    {new Intl.DateTimeFormat(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    }).format(new Date(waypoint.etaIso))}
                  </td>
                  <td className="px-4 py-3 text-storm-700">
                    {waypoint.weather.temperatureC.toFixed(1)} C
                  </td>
                  <td className="px-4 py-3 text-storm-700">
                    {waypoint.weather.precipitationMm.toFixed(1)} mm
                  </td>
                  <td className="px-4 py-3 text-storm-700">
                    {waypoint.weather.snowfallCm.toFixed(1)} cm
                  </td>
                  <td className="px-4 py-3 text-storm-700">
                    {waypoint.weather.windSpeedKph.toFixed(0)} km/h
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${riskClasses(
                        waypoint.risk.level
                      )}`}
                    >
                      {waypoint.risk.level}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-storm-700">
                    {waypoint.risk.reasons.length > 0
                      ? waypoint.risk.reasons.join(", ")
                      : "Stable conditions"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
