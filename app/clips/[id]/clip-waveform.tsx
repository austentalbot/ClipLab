"use client";

import { useEffect, useState } from "react";

import { WaveformDisplay } from "@/components/audio/waveform-display";

type ClipWaveformProps = {
  src: string;
  progress: number;
};

export function ClipWaveform({ src, progress }: ClipWaveformProps) {
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);

  useEffect(() => {
    setAudioBuffer(null);

    if (
      typeof AudioContext === "undefined" ||
      typeof globalThis.fetch === "undefined"
    )
      return;

    let cancelled = false;
    const ctx = new AudioContext();

    fetch(src)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch audio");
        return res.arrayBuffer();
      })
      .then((buffer) => ctx.decodeAudioData(buffer))
      .then((decoded) => {
        if (!cancelled) setAudioBuffer(decoded);
      })
      .catch(() => {
        // Decode failure is non-fatal for waveform
      })
      .finally(() => {
        void ctx.close();
      });

    return () => {
      cancelled = true;
      void ctx.close();
    };
  }, [src]);

  return <WaveformDisplay audioBuffer={audioBuffer} progress={progress} />;
}
