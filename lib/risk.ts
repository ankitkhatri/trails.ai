import type { RiskBreakdown, RiskLevel, WeatherForecastPoint } from "@/lib/types";

function windScore(windSpeedKph: number) {
  if (windSpeedKph >= 60) {
    return 3;
  }

  if (windSpeedKph >= 40) {
    return 2;
  }

  if (windSpeedKph >= 25) {
    return 1;
  }

  return 0;
}

function rainScore(precipitationMm: number) {
  if (precipitationMm >= 8) {
    return 3;
  }

  if (precipitationMm >= 4) {
    return 2;
  }

  if (precipitationMm >= 1) {
    return 1;
  }

  return 0;
}

function snowScore(snowfallCm: number) {
  if (snowfallCm >= 3) {
    return 3;
  }

  if (snowfallCm >= 1) {
    return 2;
  }

  if (snowfallCm >= 0.2) {
    return 1;
  }

  return 0;
}

function freezingScore(temperatureC: number) {
  if (temperatureC <= -8) {
    return 3;
  }

  if (temperatureC <= 0) {
    return 2;
  }

  if (temperatureC <= 2) {
    return 1;
  }

  return 0;
}

function levelFromScore(
  totalScore: number,
  peakScore: number,
  hasMultipleSignals: boolean
): RiskLevel {
  if (peakScore >= 3 || totalScore >= 7) {
    return "extreme";
  }

  if (peakScore >= 2 || totalScore >= 4 || (hasMultipleSignals && totalScore >= 3)) {
    return "high";
  }

  if (peakScore >= 1 || totalScore >= 2) {
    return "moderate";
  }

  return "low";
}

export function scoreWeatherRisk(weather: WeatherForecastPoint): RiskBreakdown {
  const wind = windScore(weather.windSpeedKph);
  const rain = rainScore(weather.precipitationMm);
  const snow = snowScore(weather.snowfallCm);
  const freezing = freezingScore(weather.temperatureC);
  const scores = [wind, rain, snow, freezing];
  const totalScore = scores.reduce((sum, score) => sum + score, 0);
  const peakScore = Math.max(...scores);
  const reasons: string[] = [];

  if (wind > 0) {
    reasons.push(`wind ${weather.windSpeedKph.toFixed(0)} km/h`);
  }

  if (rain > 0) {
    reasons.push(`rain ${weather.precipitationMm.toFixed(1)} mm`);
  }

  if (snow > 0) {
    reasons.push(`snow ${weather.snowfallCm.toFixed(1)} cm`);
  }

  if (freezing > 0) {
    reasons.push(`temperature ${weather.temperatureC.toFixed(1)} C`);
  }

  return {
    level: levelFromScore(
      totalScore,
      peakScore,
      scores.filter((score) => score > 0).length >= 2
    ),
    totalScore,
    windScore: wind,
    rainScore: rain,
    snowScore: snow,
    freezingScore: freezing,
    reasons,
  };
}
