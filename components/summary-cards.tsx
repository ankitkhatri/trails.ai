import type { RouteAnalysisResponse, RouteParseResponse } from "@/lib/types";

type SummaryCardsProps = {
  route: RouteParseResponse | null;
  analysis: RouteAnalysisResponse | null;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function SummaryCards({ route, analysis }: SummaryCardsProps) {
  const cards = [
    {
      label: "Route distance",
      value: route ? `${route.totalDistanceKm.toFixed(1)} km` : "--",
      tone: "bg-ridge-900 text-white",
    },
    {
      label: "Estimated finish",
      value: formatDateTime(analysis?.summary.endTimeIso),
      tone: "bg-white text-storm-900",
    },
    {
      label: "Highest risk",
      value: analysis?.summary.maxRiskLevel ?? "--",
      tone: "bg-ember-500 text-white",
    },
    {
      label: "Planning mode",
      value:
        analysis?.planningMode === "fixed-itinerary" ? "fixed itinerary" : "flexible pace",
      tone: "bg-white text-storm-900",
    },
    {
      label: "Weather provider",
      value: analysis?.provider ?? "mock",
      tone: "bg-white text-storm-900",
    },
  ];

  return (
    <section className="grid gap-4 lg:grid-cols-5">
      {cards.map((card) => (
        <article
          key={card.label}
          className={`panel rounded-[1.75rem] p-5 ${card.tone}`}
        >
          <p className="text-xs uppercase tracking-[0.22em] opacity-80">{card.label}</p>
          <p className="mt-4 text-2xl font-semibold capitalize">{card.value}</p>
          {card.label === "Estimated finish" && analysis ? (
            <p className="mt-3 text-sm opacity-80">
              {analysis.summary.estimatedDays.toFixed(1)} days over{" "}
              {analysis.summary.estimatedMovingHours.toFixed(1)} moving hours
              {analysis.summary.stageCount > 0
                ? ` across ${analysis.summary.stageCount} stages`
                : ""}
            </p>
          ) : null}
        </article>
      ))}
    </section>
  );
}
