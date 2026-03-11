"use client";

import { useCallback, useEffect, useState } from "react";

import { useAudioEngine } from "@/lib/audio/use-audio-engine";
import { type FilterConfig } from "@/lib/audio/filter-registry";

type FilteredPlaybackProps = {
  filters: FilterConfig[];
  src: string;
};

export function FilteredPlayback({ filters, src }: FilteredPlaybackProps) {
  const { isPlaying, preview, stop } = useAudioEngine();
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    async function loadSavedClip() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(src);
        if (!response.ok) {
          throw new Error("Failed to load saved audio");
        }

        const nextBlob = await response.blob();
        if (isCancelled) return;
        setBlob(nextBlob);
      } catch (nextError) {
        if (isCancelled) return;
        setBlob(null);
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Failed to load saved audio"
        );
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSavedClip();

    return () => {
      isCancelled = true;
      stop();
    };
  }, [src, stop]);

  const handlePlay = useCallback(async () => {
    if (!blob) return;

    setError(null);

    try {
      await preview(blob, filters);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Playback failed"
      );
    }
  }, [blob, filters, preview]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {isPlaying ? (
          <button
            onClick={stop}
            className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:opacity-90"
          >
            Stop filtered playback
          </button>
        ) : (
          <button
            onClick={handlePlay}
            disabled={isLoading || !blob}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Loading saved audio…" : "Play filtered clip"}
          </button>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Playback uses the saved file with the stored filter chain applied in the
        browser.
      </p>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
