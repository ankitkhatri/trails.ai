"use client";

import { useState } from "react";
import type { RouteParseResponse } from "@/lib/types";

type GpxUploaderProps = {
  uploadedFileName: string;
  onParsed: (route: RouteParseResponse, fileName: string) => void;
  onError: (message: string) => void;
  disabled?: boolean;
};

export function GpxUploader({
  uploadedFileName,
  onParsed,
  onError,
  disabled = false,
}: GpxUploaderProps) {
  const [isParsing, setIsParsing] = useState(false);

  async function handleFileChange(file: File | null) {
    if (!file) {
      return;
    }

    setIsParsing(true);

    try {
      const gpxText = await file.text();
      const response = await fetch("/api/route/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ gpxText }),
      });

      const data = (await response.json()) as RouteParseResponse | { error: string };

      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "GPX parsing failed.");
      }

      onParsed(data, file.name);
    } catch (caughtError) {
      onError(caughtError instanceof Error ? caughtError.message : "GPX parsing failed.");
    } finally {
      setIsParsing(false);
    }
  }

  return (
    <section className="panel p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-storm-900">GPX Uploader</h2>
          <p className="mt-1 text-sm text-storm-600">
            Upload a trek track or route. The server will sample the geometry at
            roughly every kilometer.
          </p>
        </div>
        {uploadedFileName ? (
          <span className="rounded-full bg-ridge-100 px-3 py-1 text-xs font-semibold text-ridge-800">
            {uploadedFileName}
          </span>
        ) : null}
      </div>

      <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[1.75rem] border border-dashed border-ridge-300 bg-ridge-50/70 px-5 py-10 text-center transition hover:border-ridge-500 hover:bg-ridge-50">
        <span className="text-sm font-semibold text-ridge-900">
          {disabled ? "GPX upload disabled in shared view" : isParsing ? "Parsing GPX..." : "Choose a `.gpx` file"}
        </span>
        <span className="max-w-sm text-sm leading-6 text-storm-600">
          Supports GPX tracks and routes. Elevation is preserved when available.
        </span>
        <input
          type="file"
          accept=".gpx,application/gpx+xml"
          className="hidden"
          disabled={disabled || isParsing}
          onChange={(event) => {
            void handleFileChange(event.target.files?.[0] ?? null);
            event.currentTarget.value = "";
          }}
        />
      </label>
    </section>
  );
}
