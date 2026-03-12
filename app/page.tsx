"use client";

import {
  useReducer,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WaveformDisplay } from "@/components/audio/waveform-display";
import { FilteredAudioPlayer } from "@/components/clips/filtered-audio-player";
import { useRecorder } from "@/lib/audio/useRecorder";
import { useWaveform } from "@/lib/audio/useWaveform";
import { type FilterType } from "@/lib/audio/filter-registry";
import { FilterPanel } from "@/components/filters/filter-panel";
import { uploadClip } from "@/lib/clips/api";
import { createClipTitle, formatClipDuration } from "@/lib/clips/format";
import { initialPageState, pageReducer } from "./record-page-state";

const STATUS_BADGES = {
  idle: { label: "Ready", variant: "outline" as const },
  "requesting-permission": { label: "Allow mic", variant: "outline" as const },
  recording: { label: "Recording", variant: "recording" as const },
  recorded: { label: "Recorded", variant: "secondary" as const },
  previewing: { label: "Previewing", variant: "default" as const },
  uploading: { label: "Saving clip", variant: "secondary" as const },
  error: { label: "Error", variant: "destructive" as const },
};

export default function RecordPage() {
  const router = useRouter();
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

  const [state, dispatch] = useReducer(pageReducer, initialPageState);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const {
    audioBuffer,
    progress: waveformProgress,
    handleTimeUpdate,
    resetWaveform,
  } = useWaveform(blob);
  const isSavingRef = useRef(false);

  useEffect(() => {
    dispatch({
      type: "SYNC_RECORDER",
      recorderStatus,
      blobUrl,
      isPlaying: isPreviewing,
      error,
    });
  }, [blobUrl, error, isPreviewing, recorderStatus]);

  const hasCapturedAudio =
    (state.status === "recorded" ||
      state.status === "previewing" ||
      state.status === "uploading" ||
      (state.status === "error" && Boolean(blobUrl))) &&
    blobUrl;

  const handleToggle = useCallback((type: FilterType) => {
    dispatch({ type: "TOGGLE_FILTER", filterType: type });
  }, []);

  const handleParamChange = useCallback(
    (type: FilterType, param: string, value: number) => {
      dispatch({ type: "SET_PARAM", filterType: type, param, value });
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (!blob || state.status === "uploading" || isSavingRef.current) return;
    isSavingRef.current = true;
    const nextTitle = state.title.trim() || createClipTitle(new Date());
    dispatch({ type: "UPLOAD_START" });
    try {
      const clip = await uploadClip(blob, nextTitle, durationMs, state.filters);
      router.replace(`/clips/${clip.id}`);
    } catch (err) {
      dispatch({
        type: "UPLOAD_ERROR",
        error: err instanceof Error ? err.message : "Upload failed",
      });
    } finally {
      isSavingRef.current = false;
    }
  }, [blob, durationMs, router, state.filters, state.status, state.title]);

  const handleReset = useCallback(() => {
    dispatch({ type: "RESET_PAGE" });
    reset();
    setIsPreviewing(false);
    resetWaveform();
  }, [reset, resetWaveform]);

  const handleTitleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      dispatch({ type: "SET_TITLE", title: event.target.value });
    },
    []
  );

  const statusBadge = STATUS_BADGES[state.status];
  const activeFiltersCount = state.filters.filter(
    (filter) => filter.enabled
  ).length;
  const isSaving = state.status === "uploading";

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Record
        </h1>
        <p className="text-sm text-muted-foreground">
          Record, tune, and save a clip.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Create a clip</CardTitle>
            <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {state.status === "idle" && (
            <button
              onClick={startRecording}
              className="rounded-md bg-recording px-5 py-2.5 text-sm font-medium text-recording-foreground hover:opacity-90"
            >
              Start recording
            </button>
          )}

          {state.status === "requesting-permission" && (
            <p className="text-sm text-muted-foreground">
              Allow microphone access.
            </p>
          )}

          {state.status === "recording" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-recording" />
                <span>Recording now</span>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={stopRecording}
                  className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:opacity-90"
                >
                  Stop recording
                </button>
                <span className="font-mono text-sm text-foreground">
                  {formatClipDuration(durationMs)}
                </span>
              </div>
            </div>
          )}

          {hasCapturedAudio && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label
                  htmlFor="clip-title"
                  className="text-sm font-medium text-foreground"
                >
                  Clip title
                </label>
                <input
                  id="clip-title"
                  type="text"
                  value={state.title}
                  onChange={handleTitleChange}
                  disabled={isSaving}
                  placeholder="Give this clip a short name"
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <section className="space-y-4 rounded-3xl border border-border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">
                  {formatClipDuration(durationMs)} ·{" "}
                  {activeFiltersCount === 0
                    ? "No filters on"
                    : `${activeFiltersCount} filter${
                        activeFiltersCount === 1 ? "" : "s"
                      } on`}
                </p>

                <div className="space-y-2">
                  <WaveformDisplay
                    audioBuffer={audioBuffer}
                    progress={waveformProgress}
                  />
                  <FilteredAudioPlayer
                    ariaLabel="Clip preview"
                    disabled={isSaving}
                    filters={state.filters}
                    onPlaybackChange={setIsPreviewing}
                    onTimeUpdate={handleTimeUpdate}
                    src={blobUrl}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {state.status === "uploading" ? (
                    <button
                      disabled
                      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground opacity-60"
                    >
                      Saving clip...
                    </button>
                  ) : (
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Save clip
                    </button>
                  )}
                  <button
                    onClick={handleReset}
                    disabled={isSaving}
                    className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Start over
                  </button>
                </div>

                {state.status === "error" && state.error ? (
                  <p className="text-sm text-destructive">{state.error}</p>
                ) : null}
              </section>

              <section className="space-y-3" aria-label="Filter controls">
                <FilterPanel
                  filters={state.filters}
                  disabled={isSaving}
                  onToggle={handleToggle}
                  onParamChange={handleParamChange}
                />
              </section>
            </div>
          )}

          {state.status === "error" && !hasCapturedAudio && (
            <div className="space-y-3">
              <p className="text-sm text-destructive">
                {state.error ?? "Something went wrong."}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                >
                  Try again
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
