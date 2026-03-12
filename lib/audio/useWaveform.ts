import { useCallback, useEffect, useState } from "react";

/**
 * Decodes a Blob into an AudioBuffer for waveform rendering and tracks
 * playback progress. Returns the decoded buffer, current progress (0–1),
 * a timeupdate handler for the player, and a reset function.
 */
export function useWaveform(blob: Blob | null) {
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!blob) {
      setAudioBuffer(null);
      setProgress(0);
      return;
    }

    if (typeof AudioContext === "undefined") return;

    let cancelled = false;
    const ctx = new AudioContext();

    blob
      .arrayBuffer()
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
  }, [blob]);

  const handleTimeUpdate = useCallback(
    (currentTime: number, duration: number) => {
      setProgress(currentTime / duration);
    },
    []
  );

  const resetWaveform = useCallback(() => {
    setAudioBuffer(null);
    setProgress(0);
  }, []);

  return { audioBuffer, progress, handleTimeUpdate, resetWaveform };
}
