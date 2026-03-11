"use client";

import { useReducer, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRecorder } from "@/lib/audio/useRecorder";
import { useAudioEngine } from "@/lib/audio/use-audio-engine";
import { type FilterType } from "@/lib/audio/filter-registry";
import { FilterPanel } from "@/components/filters/filter-panel";
import { SignalChain } from "@/components/filters/signal-chain";
import { initialPageState, pageReducer } from "./record-page-state";

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export default function RecordPage() {
  const {
    status: recorderStatus,
    durationMs,
    blobUrl,
    blob,
    error,
    startRecording,
    stopRecording,
    reset,
  } = useRecorder();

  const { isPlaying, preview, stop, syncFilters } = useAudioEngine();
  const [state, dispatch] = useReducer(pageReducer, initialPageState);

  useEffect(() => {
    dispatch({
      type: "SYNC_RECORDER",
      recorderStatus,
      isPlaying,
      error,
    });
  }, [error, isPlaying, recorderStatus]);

  useEffect(() => {
    void syncFilters(state.filters);
  }, [state.filters, syncFilters]);

  const handleToggle = useCallback((type: FilterType) => {
    dispatch({ type: "TOGGLE_FILTER", filterType: type });
  }, []);

  const handleParamChange = useCallback(
    (type: FilterType, param: string, value: number) => {
      dispatch({ type: "SET_PARAM", filterType: type, param, value });
    },
    []
  );

  const handlePreview = useCallback(async () => {
    if (!blob) return;
    await preview(blob, state.filters);
  }, [blob, state.filters, preview]);

  const handleReset = useCallback(() => {
    stop();
    dispatch({ type: "RESET_PAGE" });
    reset();
  }, [reset, stop]);

  const statusBadge = {
    idle: { label: "Idle", variant: "outline" as const },
    "requesting-permission": {
      label: "Awaiting Permission",
      variant: "outline" as const,
    },
    recording: { label: "Recording", variant: "destructive" as const },
    recorded: { label: "Recorded", variant: "secondary" as const },
    previewing: { label: "Previewing", variant: "default" as const },
    error: { label: "Error", variant: "destructive" as const },
  }[state.status];

  const hasCapturedAudio =
    (state.status === "recorded" || state.status === "previewing") && blobUrl;

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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>Recording workspace</CardTitle>
              <p className="text-sm text-muted-foreground">
                Record, shape the signal chain, then preview the processed
                result.
              </p>
            </div>
            <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {state.status === "idle" && (
            <button
              onClick={startRecording}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Record
            </button>
          )}

          {state.status === "requesting-permission" && (
            <p className="text-sm text-muted-foreground">
              Requesting microphone access…
            </p>
          )}

          {state.status === "recording" && (
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

          {hasCapturedAudio && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Recorded {formatDuration(durationMs)}</span>
              </div>

              <SignalChain filters={state.filters} isPlaying={isPlaying} />

              <section className="space-y-3" aria-label="Filter controls">
                <FilterPanel
                  filters={state.filters}
                  onToggle={handleToggle}
                  onParamChange={handleParamChange}
                />
              </section>

              <section className="space-y-3" aria-label="Playback controls">
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

                <audio controls src={blobUrl} className="w-full" />
              </section>
            </div>
          )}

          {state.status === "error" && (
            <div className="space-y-3">
              <p className="text-sm text-red-500">{state.error}</p>
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
