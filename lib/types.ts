export type RiskLevel = "low" | "moderate" | "high" | "extreme";
export type WeatherProviderName = "mock" | "open-meteo";
export type PlanningMode = "flexible" | "fixed-itinerary";
export type RouteBounds = [[number, number], [number, number]];
export type PlanOwnerMode = "owner" | "shared-readonly" | "unsaved";
export type SceneryConfidence =
  | "route-specific"
  | "region-specific"
  | "generic terrain/weather";
export type MapEditTarget =
  | "start-route"
  | "start-custom"
  | "end-route"
  | "end-custom"
  | "side-point";

export type MapEditIntent = {
  dayPlanId: string;
  target: MapEditTarget;
};

export type RoutePoint = {
  sequence: number;
  lat: number;
  lng: number;
  elevationM?: number;
  cumulativeDistanceM: number;
  distanceFromStartKm: number;
};

export type TrekAssumptions = {
  startDateTimeIso: string;
  averageSpeedKph: number;
  movingHoursPerDay: number;
  sampleDistanceKm: number;
};

export type TrekContext = {
  routeDisplayName: string;
  region: string;
  country: string;
  season: string;
};

export type RouteAnchor = {
  kind: "route";
  routeWaypointSequence: number;
  label?: string;
};

export type CustomAnchor = {
  kind: "custom";
  routeWaypointSequence: number;
  lat: number;
  lng: number;
  elevationM?: number;
  label: string;
};

export type TrekAnchor = RouteAnchor | CustomAnchor;

export type TrekSidePoint = {
  id: string;
  lat: number;
  lng: number;
  elevationM?: number;
  label: string;
  timeOffsetHours: number;
};

export type TrekDayPlan = {
  id: string;
  label: string;
  startDateTimeIso: string;
  movingHours: number;
  startAnchor: TrekAnchor;
  endAnchor: TrekAnchor;
  sidePoint?: TrekSidePoint;
};

export type ForecastRequestPoint = {
  id: string;
  lat: number;
  lng: number;
  elevationM?: number;
  timeIso: string;
};

export type TimedWaypoint = RoutePoint & {
  analysisSequence: number;
  etaIso: string;
  elapsedHours: number;
  dayIndex: number;
  dayPlanId?: string;
};

export type WeatherForecastPoint = {
  timeIso: string;
  temperatureC: number;
  precipitationMm: number;
  snowfallCm: number;
  windSpeedKph: number;
  weatherCode: number;
  isDay: boolean;
};

export type RiskBreakdown = {
  level: RiskLevel;
  totalScore: number;
  windScore: number;
  rainScore: number;
  snowScore: number;
  freezingScore: number;
  reasons: string[];
};

export type AnalyzedWaypoint = TimedWaypoint & {
  weather: WeatherForecastPoint;
  risk: RiskBreakdown;
};

export type LocationForecastSummary = {
  id: string;
  label: string;
  kind: "start-anchor" | "end-anchor" | "side-point";
  lat: number;
  lng: number;
  elevationM?: number;
  etaIso: string;
  weather: WeatherForecastPoint;
  risk: RiskBreakdown;
};

export type RouteParseResponse = {
  name: string;
  rawPoints: RoutePoint[];
  sampledPoints: RoutePoint[];
  totalDistanceKm: number;
  bounds: RouteBounds;
  warnings: string[];
};

export type SceneryQueryInput = {
  dayPlanId: string;
  dayNumber: number;
  dayLabel: string;
  startLabel: string;
  endLabel: string;
  routeDisplayName: string;
  region: string;
  country: string;
  season: string;
  routeDistanceKm: number;
  elevationBand: "low" | "mid" | "high";
  terrainTag: string;
  weatherMood: string;
  viewQuality: string;
  trailCondition: string;
};

export type SceneryPhoto = {
  id: string;
  alt: string;
  description: string;
  width: number;
  height: number;
  color?: string;
  thumbUrl: string;
  smallUrl: string;
  regularUrl: string;
  photographerName: string;
  photographerUsername: string;
  photographerProfileUrl: string;
  unsplashUrl: string;
};

export type DayScenerySummary = {
  dayPlanId: string;
  dayNumber: number;
  sceneryOutlook: string;
  weatherMood: string;
  viewQuality: string;
  trailCondition: string;
  terrainTag: string;
  queryUsed: string;
  confidence: SceneryConfidence | null;
  representativeLabel: string;
  photos: SceneryPhoto[];
};

export type RouteAnalysisSummary = {
  totalDistanceKm: number;
  estimatedMovingHours: number;
  estimatedDays: number;
  stageCount: number;
  startTimeIso: string;
  endTimeIso: string;
  maxRiskLevel: RiskLevel;
  maxWindSpeedKph: number;
  maxPrecipitationMm: number;
  minTemperatureC: number;
};

export type RouteAnalysisDaySummary = {
  dayNumber: number;
  dayPlanId: string;
  label: string;
  startLabel: string;
  endLabel: string;
  startAnchor: TrekAnchor;
  endAnchor: TrekAnchor;
  routeStartWaypointSequence: number;
  routeEndWaypointSequence: number;
  startTimeIso: string;
  endTimeIso: string;
  distanceKm: number;
  waypointCount: number;
  maxRiskLevel: RiskLevel;
  maxWindSpeedKph: number;
  maxPrecipitationMm: number;
  minTemperatureC: number;
  isOverDailyLimit: boolean;
  startAnchorForecast?: LocationForecastSummary;
  endAnchorForecast?: LocationForecastSummary;
  sidePointForecast?: LocationForecastSummary;
};

export type RouteAnalysisResponse = {
  planningMode: PlanningMode;
  provider: WeatherProviderName;
  waypoints: AnalyzedWaypoint[];
  daySummaries: RouteAnalysisDaySummary[];
  summary: RouteAnalysisSummary;
  warnings: string[];
};

export type SavedPlanSummary = {
  id: string;
  title: string;
  routeName: string;
  planningMode: PlanningMode;
  stageCount: number;
  maxRiskLevel: RiskLevel | null;
  updatedAt: string;
  createdAt: string;
  shareToken: string;
};

export type SavedPlanPayload = {
  id: string;
  title: string;
  ownerMode: PlanOwnerMode;
  shareToken: string;
  uploadedFileName: string;
  snapshotVersion: number;
  route: RouteParseResponse | null;
  planningMode: PlanningMode;
  assumptions: TrekAssumptions;
  trekContext: TrekContext;
  weatherProvider: WeatherProviderName;
  dayPlans: TrekDayPlan[];
  analysis: RouteAnalysisResponse | null;
  dayScenery: Record<string, DayScenerySummary | undefined>;
  createdAt: string;
  updatedAt: string;
};

export type SavePlanRequest = {
  title: string;
  uploadedFileName: string;
  route: RouteParseResponse | null;
  planningMode: PlanningMode;
  assumptions: TrekAssumptions;
  trekContext: TrekContext;
  weatherProvider: WeatherProviderName;
  dayPlans: TrekDayPlan[];
  analysis: RouteAnalysisResponse | null;
  dayScenery: DayScenerySummary[];
};
