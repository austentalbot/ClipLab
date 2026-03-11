"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRecorder } from "@/lib/audio/useRecorder";

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export default function RecordPage() {
  const {
    status,
    durationMs,
    blobUrl,
    error,
    startRecording,
    stopRecording,
    reset,
  } = useRecorder();

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
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Recorded {formatDuration(durationMs)}</span>
              </div>
              <audio controls src={blobUrl} className="w-full" />
              <button
                onClick={reset}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Reset
              </button>
            </div>
          )}

          {/* ── Error ── */}
          {status === "error" && (
            <div className="space-y-3">
              <p className="text-sm text-red-500">{error}</p>
              <button
                onClick={reset}
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
