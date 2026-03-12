"use client";

import { useCallback, useEffect, useState } from "react";

import { FilteredAudioPlayer } from "@/components/clips/filtered-audio-player";
import { type FilterConfig } from "@/lib/audio/filter-registry";
import { ClipWaveform } from "./clip-waveform";

type FilteredPlaybackProps = {
  filters: FilterConfig[];
  src: string;
};

export function FilteredPlayback({ filters, src }: FilteredPlaybackProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(0);
  }, [src]);

  const handleTimeUpdate = useCallback(
    (currentTime: number, duration: number) => {
      setProgress(currentTime / duration);
    },
    []
  );

  return (
    <div className="space-y-2">
      <ClipWaveform src={src} progress={progress} />
      <FilteredAudioPlayer
        filters={filters}
        onTimeUpdate={handleTimeUpdate}
        src={src}
      />
    </div>
  );
}
