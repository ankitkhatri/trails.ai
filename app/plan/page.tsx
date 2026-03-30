import type { WeatherProviderName } from "@/lib/types";
import { PlannerShell } from "@/components/planner-shell";

export default function PlanPage() {
  const defaultProvider: WeatherProviderName =
    process.env.WEATHER_PROVIDER === "open-meteo" ? "open-meteo" : "mock";

  return <PlannerShell defaultProvider={defaultProvider} />;
}
