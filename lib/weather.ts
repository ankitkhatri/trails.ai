import type {
  ForecastRequestPoint,
  WeatherForecastPoint,
  WeatherProviderName,
} from "@/lib/types";

export interface WeatherProvider {
  readonly name: WeatherProviderName;
  getForecastForTargets(targets: ForecastRequestPoint[]): Promise<WeatherForecastPoint[]>;
}

type OpenMeteoHourlySeries = {
  latitude: number;
  longitude: number;
  startDate: string;
  endDate: string;
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation: number[];
    snowfall: number[];
    wind_speed_10m: number[];
    weather_code: number[];
    is_day: number[];
  };
  hourlyUnits?: {
    snowfall?: string;
  };
};

type ForecastBucket = {
  latitude: number;
  longitude: number;
  startDate: string;
  endDate: string;
};

function roundCoordinate(value: number) {
  return Math.round(value * 20) / 20;
}

function weatherCodeFor(precipitationMm: number, snowfallCm: number) {
  if (snowfallCm >= 1) {
    return 71;
  }

  if (precipitationMm >= 6) {
    return 65;
  }

  if (precipitationMm >= 1) {
    return 61;
  }

  return 1;
}

export class MockWeatherProvider implements WeatherProvider {
  readonly name = "mock" as const;

  async getForecastForTargets(targets: ForecastRequestPoint[]) {
    return targets.map((target) => {
      const eta = new Date(target.timeIso);
      const hour = eta.getUTCHours() + eta.getUTCMinutes() / 60;
      const daylightBoost = Math.cos(((hour - 13) / 12) * Math.PI);
      const altitudeCooling = (target.elevationM ?? 0) / 220;
      const temperatureC =
        10 + Math.sin(target.lat * 6) * 4 + daylightBoost * 5 - altitudeCooling;
      const precipitationMm = Math.max(
        0,
        2.5 * Math.sin(target.lng * 7 + hour / 3) +
          1.8 * Math.cos(target.lat * 5) +
          1.5
      );
      const snowfallCm =
        temperatureC <= 1.5 ? Math.max(0, precipitationMm * 0.65) : 0;
      const windSpeedKph = Math.max(
        6,
        18 +
          Math.abs(Math.sin((target.lat + target.lng) * 8)) * 24 +
          Math.max(0, (target.elevationM ?? 0) / 600)
      );

      return {
        timeIso: target.timeIso,
        temperatureC,
        precipitationMm,
        snowfallCm,
        windSpeedKph,
        weatherCode: weatherCodeFor(precipitationMm, snowfallCm),
        isDay: hour >= 6 && hour <= 18,
      };
    });
  }
}

type OpenMeteoResponse = {
  hourly_units?: {
    snowfall?: string;
  };
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    precipitation?: number[];
    snowfall?: number[];
    wind_speed_10m?: number[];
    weather_code?: number[];
    is_day?: number[];
  };
};

export class OpenMeteoWeatherProvider implements WeatherProvider {
  readonly name = "open-meteo" as const;
  private readonly cache = new Map<string, Promise<OpenMeteoHourlySeries>>();

  async getForecastForTargets(targets: ForecastRequestPoint[]) {
    if (targets.length === 0) {
      return [];
    }

    const buckets = this.groupTargets(targets);
    const seriesEntries = await Promise.all(
      [...buckets.entries()].map(async ([bucketKey, bucket]) => [
        bucketKey,
        await this.fetchBucketForecast(bucket),
      ] as const)
    );
    const seriesByBucket = new Map(seriesEntries);

    return targets.map((target) => {
      const bucketKey = this.coordinateBucketKey(target);
      const series = seriesByBucket.get(bucketKey);

      if (!series) {
        throw new Error("Open-Meteo bucket forecast was not available.");
      }

      return this.resolveTargetForecast(target, series);
    });
  }

  private groupTargets(targets: ForecastRequestPoint[]) {
    const buckets = new Map<string, ForecastBucket>();

    targets.forEach((target) => {
      const bucketKey = this.coordinateBucketKey(target);
      const day = target.timeIso.slice(0, 10);
      const existing = buckets.get(bucketKey);

      if (!existing) {
        buckets.set(bucketKey, {
          latitude: roundCoordinate(target.lat),
          longitude: roundCoordinate(target.lng),
          startDate: day,
          endDate: day,
        });
        return;
      }

      existing.startDate = day < existing.startDate ? day : existing.startDate;
      existing.endDate = day > existing.endDate ? day : existing.endDate;
    });

    return buckets;
  }

  private coordinateBucketKey(target: Pick<ForecastRequestPoint, "lat" | "lng">) {
    return [roundCoordinate(target.lat), roundCoordinate(target.lng)].join(":");
  }

  private bucketCacheKey(bucket: ForecastBucket) {
    return [
      bucket.latitude,
      bucket.longitude,
      bucket.startDate,
      bucket.endDate,
    ].join(":");
  }

  private fetchBucketForecast(bucket: ForecastBucket) {
    const cacheKey = this.bucketCacheKey(bucket);
    const cached = this.cache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const request = this.fetchHourlySeries(bucket).catch((error) => {
      this.cache.delete(cacheKey);
      throw error;
    });

    this.cache.set(cacheKey, request);
    return request;
  }

  private async fetchHourlySeries(bucket: ForecastBucket): Promise<OpenMeteoHourlySeries> {
    const url = new URL("https://api.open-meteo.com/v1/forecast");

    url.searchParams.set("latitude", String(bucket.latitude));
    url.searchParams.set("longitude", String(bucket.longitude));
    url.searchParams.set(
      "hourly",
      "temperature_2m,precipitation,snowfall,wind_speed_10m,weather_code,is_day"
    );
    url.searchParams.set("timezone", "UTC");
    url.searchParams.set("start_date", bucket.startDate);
    url.searchParams.set("end_date", bucket.endDate);

    const response = await fetch(url.toString(), {
      next: { revalidate: 1800 },
    });

    if (!response.ok) {
      throw new Error("Open-Meteo request failed.");
    }

    const data = (await response.json()) as OpenMeteoResponse;
    const hourly = data.hourly;

    if (
      !hourly?.time ||
      !hourly.temperature_2m ||
      !hourly.precipitation ||
      !hourly.snowfall ||
      !hourly.wind_speed_10m ||
      !hourly.weather_code ||
      !hourly.is_day
    ) {
      throw new Error("Open-Meteo response was missing hourly forecast fields.");
    }

    return {
      latitude: bucket.latitude,
      longitude: bucket.longitude,
      startDate: bucket.startDate,
      endDate: bucket.endDate,
      hourly: {
        time: hourly.time,
        temperature_2m: hourly.temperature_2m,
        precipitation: hourly.precipitation,
        snowfall: hourly.snowfall,
        wind_speed_10m: hourly.wind_speed_10m,
        weather_code: hourly.weather_code,
        is_day: hourly.is_day,
      },
      hourlyUnits: data.hourly_units,
    };
  }

  private resolveTargetForecast(
    target: ForecastRequestPoint,
    series: OpenMeteoHourlySeries
  ): WeatherForecastPoint {
    const targetTime = new Date(target.timeIso);
    let bestIndex = 0;
    let bestDelta = Number.POSITIVE_INFINITY;

    series.hourly.time.forEach((time, index) => {
      const delta = Math.abs(new Date(time).getTime() - targetTime.getTime());

      if (delta < bestDelta) {
        bestDelta = delta;
        bestIndex = index;
      }
    });

    const snowfallValue = series.hourly.snowfall[bestIndex];
    const snowfallCm =
      series.hourlyUnits?.snowfall === "cm" ? snowfallValue : snowfallValue / 10;

    return {
      timeIso: new Date(series.hourly.time[bestIndex]).toISOString(),
      temperatureC: series.hourly.temperature_2m[bestIndex],
      precipitationMm: series.hourly.precipitation[bestIndex],
      snowfallCm,
      windSpeedKph: series.hourly.wind_speed_10m[bestIndex],
      weatherCode: series.hourly.weather_code[bestIndex],
      isDay: Boolean(series.hourly.is_day[bestIndex]),
    };
  }
}

export function getWeatherProvider(
  requestedProvider = process.env.WEATHER_PROVIDER
): WeatherProvider {
  if (requestedProvider === "open-meteo") {
    return new OpenMeteoWeatherProvider();
  }

  return new MockWeatherProvider();
}
