"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRecorder } from "@/lib/audio/useRecorder";
import { useAudioEngine } from "@/lib/audio/use-audio-engine";
import {
  type FilterConfig,
  type FilterType,
  filterRegistry,
  getDefaultFilters,
} from "@/lib/audio/filter-registry";

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function formatParamValue(value: number, unit?: string): string {
  const formatted = Number.isInteger(value)
    ? value.toString()
    : value.toFixed(2);
  return unit ? `${formatted}${unit}` : formatted;
}

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={text}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-border text-[10px] font-medium leading-none text-muted-foreground outline-none transition-colors hover:border-foreground hover:text-foreground focus:border-foreground focus:text-foreground"
      >
        i
      </button>
      <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 hidden w-56 -translate-x-1/2 rounded-md border border-border bg-background px-2 py-1.5 text-left text-xs leading-snug text-foreground shadow-md group-focus-within:block group-hover:block">
        {text}
      </span>
    </span>
  );
}

export default function RecordPage() {
  const {
    status,
    durationMs,
    blobUrl,
    blob,
    error,
    startRecording,
    stopRecording,
    reset,
  } = useRecorder();

  const { isPlaying, preview, stop, syncFilters } = useAudioEngine();
  const [filters, setFilters] = useState<FilterConfig[]>(getDefaultFilters);

  useEffect(() => {
    void syncFilters(filters);
  }, [filters, syncFilters]);

  const handleToggleFilter = useCallback((type: FilterType) => {
    setFilters((prev) => {
      return prev.map((f) => {
        if (f.type !== type) return f;
        return { ...f, enabled: !f.enabled };
      });
    });
  }, []);

  const handleParamChange = useCallback(
    (type: FilterType, paramName: string, value: number) => {
      setFilters((prev) => {
        return prev.map((filter) => {
          if (filter.type !== type) return filter;
          return {
            ...filter,
            params: {
              ...filter.params,
              [paramName]: value,
            },
          };
        });
      });
    },
    []
  );

  const handlePreview = useCallback(async () => {
    if (!blob) return;
    await preview(blob, filters);
  }, [blob, filters, preview]);

  const handleReset = useCallback(() => {
    stop();
    setFilters(getDefaultFilters());
    reset();
  }, [reset, stop]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Record
        </h1>
        <p className="text-sm text-muted-foreground">
          Record audio, apply filters, and save clips.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recording workspace</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* ── Idle ── */}
          {status === "idle" && (
            <button
              onClick={startRecording}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Record
            </button>
          )}

          {/* ── Requesting permission ── */}
          {status === "requesting-permission" && (
            <p className="text-sm text-muted-foreground">
              Requesting microphone access…
            </p>
          )}

          {/* ── Recording ── */}
          {status === "recording" && (
            <div className="flex items-center gap-4">
              <button
                onClick={stopRecording}
                className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
              >
                Stop
              </button>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                <span className="font-mono text-sm text-foreground">
                  {formatDuration(durationMs)}
                </span>
              </div>
            </div>
          )}

          {/* ── Recorded ── */}
          {status === "recorded" && blobUrl && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Recorded {formatDuration(durationMs)}</span>
              </div>
              <audio controls src={blobUrl} className="w-full" />

              {/* Playback controls */}
              <div className="flex items-center gap-2">
                {isPlaying ? (
                  <button
                    onClick={stop}
                    className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
                  >
                    Stop Preview
                  </button>
                ) : (
                  <button
                    onClick={handlePreview}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Preview
                  </button>
                )}
                <button
                  onClick={handleReset}
                  className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                >
                  Reset
                </button>
              </div>

              {/* Filter controls */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Filters</p>
                <div className="space-y-3">
                  {filterRegistry.map((def) => {
                    const config = filters.find((f) => f.type === def.type);
                    const enabled = config?.enabled ?? false;
                    return (
                      <div
                        key={def.type}
                        className="space-y-3 rounded-lg border border-border p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                              <span>{def.label}</span>
                              <InfoTooltip text={def.description} />
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {enabled ? "Enabled" : "Bypassed"}
                            </p>
                          </div>
                          <button
                            onClick={() => handleToggleFilter(def.type)}
                            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                              enabled
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-border text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            {enabled ? "On" : "Off"}
                          </button>
                        </div>

                        {Object.entries(def.paramRanges).map(
                          ([paramName, range]) => {
                            const inputId = `${def.type}-${paramName}`;
                            const value =
                              config?.params[paramName] ??
                              def.defaultParams[paramName];

                            return (
                              <div key={paramName} className="space-y-2">
                                <div className="flex items-center justify-between gap-3 text-sm">
                                  <div className="flex items-center gap-2 text-foreground">
                                    <label htmlFor={inputId}>
                                      {range.label ?? paramName}
                                    </label>
                                    {range.description ? (
                                      <InfoTooltip text={range.description} />
                                    ) : null}
                                  </div>
                                  <span className="font-mono text-muted-foreground">
                                    {formatParamValue(value, range.unit)}
                                  </span>
                                </div>
                                <input
                                  id={inputId}
                                  type="range"
                                  aria-label={range.label ?? paramName}
                                  min={range.min}
                                  max={range.max}
                                  step={range.step}
                                  value={value}
                                  onChange={(event) =>
                                    handleParamChange(
                                      def.type,
                                      paramName,
                                      Number(event.target.value)
                                    )
                                  }
                                  className="w-full"
                                />
                              </div>
                            );
                          }
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Error ── */}
          {status === "error" && (
            <div className="space-y-3">
              <p className="text-sm text-red-500">{error}</p>
              <button
                onClick={handleReset}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Try again
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
