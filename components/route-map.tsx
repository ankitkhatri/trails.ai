import dynamic from "next/dynamic";
import type {
  AnalyzedWaypoint,
  MapEditIntent,
  PlanningMode,
  RouteBounds,
  RoutePoint,
  TrekDayPlan,
} from "@/lib/types";

const RouteMapClient = dynamic(() => import("@/components/route-map-client"), {
  ssr: false,
  loading: () => (
    <section className="panel flex h-[560px] items-center justify-center p-6 text-sm text-storm-600">
      Loading map...
    </section>
  ),
});

type RouteMapProps = {
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

export function RouteMap(props: RouteMapProps) {
  return <RouteMapClient {...props} />;
}
