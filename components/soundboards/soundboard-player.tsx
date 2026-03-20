"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { FilteredAudioPlayer } from "@/components/clips/filtered-audio-player";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatClipDuration } from "@/lib/clips/format";
import type { FilterConfig } from "@/lib/audio/filter-registry";

export type SoundboardResolvedClip = {
  id: string;
  title: string;
  durationMs: number;
  filters: FilterConfig[];
  src: string;
};

type SoundboardPlayerProps = {
  clips: SoundboardResolvedClip[];
};

export function SoundboardPlayer({ clips }: SoundboardPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSequencePlaying, setIsSequencePlaying] = useState(false);
  const [isClipPlaying, setIsClipPlaying] = useState(false);

  useEffect(() => {
    setCurrentIndex(0);
    setIsSequencePlaying(false);
    setIsClipPlaying(false);
  }, [clips]);

  const currentClip = clips[currentIndex] ?? null;

  const canPlay = clips.length > 0;
  const summary = useMemo(() => {
    const totalDurationMs = clips.reduce(
      (sum, clip) => sum + clip.durationMs,
      0
    );
    return {
      clipCount: clips.length,
      totalDurationMs,
    };
  }, [clips]);

  const handleEnded = useCallback(() => {
    if (currentIndex >= clips.length - 1) {
      setIsSequencePlaying(false);
      setIsClipPlaying(false);
      return;
    }

    setCurrentIndex(currentIndex + 1);
  }, [clips.length, currentIndex]);

  const handlePlayAll = useCallback(() => {
    if (!canPlay) {
      return;
    }

    setCurrentIndex(0);
    setIsSequencePlaying(true);
  }, [canPlay]);

  const handleStop = useCallback(() => {
    setIsSequencePlaying(false);
    setIsClipPlaying(false);
    setCurrentIndex(0);
  }, []);

  const handlePlaybackChange = useCallback((nextIsPlaying: boolean) => {
    setIsClipPlaying(nextIsPlaying);

    if (nextIsPlaying) {
      setIsSequencePlaying(true);
    }
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <CardTitle>Playback</CardTitle>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline">
                {summary.clipCount} {summary.clipCount === 1 ? "clip" : "clips"}
              </Badge>
              <Badge variant="outline">
                {formatClipDuration(summary.totalDurationMs)}
              </Badge>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handlePlayAll}
              disabled={!canPlay}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Play all
            </button>
            <button
              onClick={handleStop}
              disabled={!canPlay}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              Stop
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {currentClip ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">
                Now playing: {currentClip.title}
              </p>
              <FilteredAudioPlayer
                key={currentIndex}
                autoPlay={isSequencePlaying}
                filters={currentClip.filters}
                onEnded={handleEnded}
                onPlaybackChange={handlePlaybackChange}
                src={currentClip.src}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Add clips to this soundboard to enable playback.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sequence</CardTitle>
        </CardHeader>
        <CardContent>
          {clips.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              This soundboard has no clips yet.
            </p>
          ) : (
            <ol className="space-y-3">
              {clips.map((clip, index) => {
                const isCurrent = index === currentIndex;

                return (
                  <li
                    key={`${clip.id}-${index}`}
                    className={`rounded-2xl border px-4 py-3 transition-colors ${
                      isCurrent
                        ? "border-primary bg-primary/5"
                        : "border-border bg-muted/20"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {index + 1}
                          </span>
                          <p className="truncate text-sm font-medium text-foreground">
                            {clip.title}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {formatClipDuration(clip.durationMs)}
                        </Badge>
                      </div>
                      {isCurrent ? (
                        <Badge
                          variant={isClipPlaying ? "default" : "secondary"}
                        >
                          {isClipPlaying
                            ? "Playing"
                            : isSequencePlaying
                              ? "Queued"
                              : "Ready"}
                        </Badge>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
