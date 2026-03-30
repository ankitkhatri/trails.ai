"use client";

import type {
  PlanningMode,
  TrekAssumptions,
  WeatherProviderName,
} from "@/lib/types";

type TrekAssumptionsFormProps = {
  assumptions: TrekAssumptions;
  displayStartDateTime: string;
  onChange: (nextAssumptions: TrekAssumptions) => void;
  planningMode: PlanningMode;
  onPlanningModeChange: (planningMode: PlanningMode) => void;
  weatherProvider: WeatherProviderName;
  onWeatherProviderChange: (provider: WeatherProviderName) => void;
  onAnalyze: () => void;
  disabled: boolean;
  isAnalyzing: boolean;
  readOnly?: boolean;
};

export function TrekAssumptionsForm({
  assumptions,
  displayStartDateTime,
  onChange,
  planningMode,
  onPlanningModeChange,
  weatherProvider,
  onWeatherProviderChange,
  onAnalyze,
  disabled,
  isAnalyzing,
  readOnly = false,
}: TrekAssumptionsFormProps) {
  return (
    <section className="panel p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-storm-900">Trek Assumptions</h2>
        <p className="mt-1 text-sm text-storm-600">
          Choose whether the route should infer overnight stops from pace or follow
          a fixed village-to-village itinerary.
        </p>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-2">
          <span className="text-sm font-medium text-storm-800">Planning mode</span>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={readOnly}
              onClick={() => onPlanningModeChange("flexible")}
              className={`rounded-[1.5rem] border px-4 py-4 text-left transition ${
                planningMode === "flexible"
                  ? "border-ridge-600 bg-ridge-50 text-ridge-900"
                  : "border-storm-200 bg-white text-storm-700 hover:border-ridge-300"
              }`}
            >
              <div className="text-sm font-semibold">Flexible pace</div>
              <div className="mt-1 text-sm leading-6 opacity-80">
                Use overall speed and daily walking hours to infer where each overnight stop lands.
              </div>
            </button>
            <button
              type="button"
              disabled={readOnly}
              onClick={() => onPlanningModeChange("fixed-itinerary")}
              className={`rounded-[1.5rem] border px-4 py-4 text-left transition ${
                planningMode === "fixed-itinerary"
                  ? "border-ridge-600 bg-ridge-50 text-ridge-900"
                  : "border-storm-200 bg-white text-storm-700 hover:border-ridge-300"
              }`}
            >
              <div className="text-sm font-semibold">Fixed itinerary</div>
              <div className="mt-1 text-sm leading-6 opacity-80">
                Lock the route to fixed day endpoints such as Machakola to Jagat to Deng.
              </div>
            </button>
          </div>
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-storm-800">
            {planningMode === "fixed-itinerary" ? "First day start time" : "Start date and time"}
          </span>
          <input
            type="datetime-local"
            disabled={readOnly}
            value={displayStartDateTime}
            onChange={(event) => {
              if (!event.target.value) {
                return;
              }

              const iso = new Date(event.target.value).toISOString();
              onChange({
                ...assumptions,
                startDateTimeIso: iso,
              });
            }}
            className="rounded-2xl border border-storm-200 bg-white px-4 py-3 text-sm text-storm-900 outline-none transition disabled:bg-storm-50 disabled:text-storm-500 focus:border-ridge-500"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-storm-800">
              Average speed (km/h)
            </span>
            <input
              type="number"
              disabled={readOnly}
              min="1"
              max="10"
              step="0.1"
              value={assumptions.averageSpeedKph}
              onChange={(event) =>
                onChange({
                  ...assumptions,
                  averageSpeedKph: Number(event.target.value),
                })
              }
              className="rounded-2xl border border-storm-200 bg-white px-4 py-3 text-sm text-storm-900 outline-none transition disabled:bg-storm-50 disabled:text-storm-500 focus:border-ridge-500"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-storm-800">
              {planningMode === "fixed-itinerary"
                ? "Default walking hours"
                : "Moving hours per day"}
            </span>
            <input
              type="number"
              disabled={readOnly}
              min="1"
              max="16"
              step="0.5"
              value={assumptions.movingHoursPerDay}
              onChange={(event) =>
                onChange({
                  ...assumptions,
                  movingHoursPerDay: Number(event.target.value),
                })
              }
              className="rounded-2xl border border-storm-200 bg-white px-4 py-3 text-sm text-storm-900 outline-none transition disabled:bg-storm-50 disabled:text-storm-500 focus:border-ridge-500"
            />
          </label>
        </div>

        <div className="grid gap-2">
          <span className="text-sm font-medium text-storm-800">Weather provider</span>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={readOnly}
              onClick={() => onWeatherProviderChange("mock")}
              className={`rounded-[1.5rem] border px-4 py-4 text-left transition ${
                weatherProvider === "mock"
                  ? "border-ridge-600 bg-ridge-50 text-ridge-900"
                  : "border-storm-200 bg-white text-storm-700 hover:border-ridge-300"
              }`}
            >
              <div className="text-sm font-semibold">Mock</div>
              <div className="mt-1 text-sm leading-6 opacity-80">
                Deterministic sample weather for local scaffold work and demos.
              </div>
            </button>
            <button
              type="button"
              disabled={readOnly}
              onClick={() => onWeatherProviderChange("open-meteo")}
              className={`rounded-[1.5rem] border px-4 py-4 text-left transition ${
                weatherProvider === "open-meteo"
                  ? "border-ridge-600 bg-ridge-50 text-ridge-900"
                  : "border-storm-200 bg-white text-storm-700 hover:border-ridge-300"
              }`}
            >
              <div className="text-sm font-semibold">Open-Meteo</div>
              <div className="mt-1 text-sm leading-6 opacity-80">
                Live hourly forecast data. Falls back to mock weather if the request fails.
              </div>
            </button>
          </div>
        </div>

        <div className="rounded-[1.75rem] bg-storm-50 p-4 text-sm leading-6 text-storm-700">
          Sampling interval is fixed at approximately {assumptions.sampleDistanceKm} km
          for this MVP. The selected provider is <strong>{weatherProvider}</strong>,
          and the server can also set a default via <code>WEATHER_PROVIDER</code>. In
          fixed-itinerary mode, speed still drives intra-day ETA estimation.
        </div>

        <button
          type="button"
          disabled={disabled || isAnalyzing || readOnly}
          onClick={() => {
            void onAnalyze();
          }}
          className="inline-flex items-center justify-center rounded-full bg-ridge-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-ridge-800 disabled:cursor-not-allowed disabled:bg-storm-300"
        >
          {isAnalyzing ? "Analyzing route..." : "Run Route Analysis"}
        </button>
      </div>
    </section>
  );
}
