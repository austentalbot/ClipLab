"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { SignalChain } from "@/components/filters/signal-chain";
import {
  filterRegistry,
  type FilterConfig,
  type FilterNodeResult,
} from "@/lib/audio/filter-registry";

const MEDIA_ELEMENT_SOURCE_KEY = Symbol.for(
  "cliplab.media-element-audio-source"
);

type MediaElementSourceEntry = {
  ctx: AudioContext;
  source: MediaElementAudioSourceNode;
};

function getStoredMediaElementEntry(
  audio: HTMLAudioElement
): MediaElementSourceEntry | null {
  const attached = (
    audio as HTMLAudioElement & {
      [MEDIA_ELEMENT_SOURCE_KEY]?: MediaElementSourceEntry;
    }
  )[MEDIA_ELEMENT_SOURCE_KEY];

  return attached ?? null;
}

function storeMediaElementEntry(
  audio: HTMLAudioElement,
  entry: MediaElementSourceEntry
) {
  (
    audio as HTMLAudioElement & {
      [MEDIA_ELEMENT_SOURCE_KEY]?: MediaElementSourceEntry;
    }
  )[MEDIA_ELEMENT_SOURCE_KEY] = entry;
}

async function resumeContextIfPlaying(
  audio: HTMLAudioElement,
  ctx: AudioContext
) {
  if (audio.paused || ctx.state !== "suspended") {
    return;
  }

  await ctx.resume();
}

type FilteredAudioPlayerProps = {
  ariaLabel?: string;
  autoPlay?: boolean;
  disabled?: boolean;
  filters: FilterConfig[];
  onEnded?: () => void;
  onPlaybackChange?: (isPlaying: boolean) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  src: string;
};

export function FilteredAudioPlayer({
  ariaLabel = "Filtered playback",
  autoPlay = false,
  disabled = false,
  filters,
  onEnded,
  onPlaybackChange,
  onTimeUpdate,
  src,
}: FilteredAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const nodesRef = useRef<AudioNode[]>([]);
  const disposersRef = useRef<(() => void)[]>([]);
  const stopCallbacksRef = useRef<(() => void)[]>([]);
  const playCallbacksRef = useRef<(() => void)[]>([]);
  const nodeMapRef = useRef<Map<string, FilterNodeResult>>(new Map());
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onEndedRef = useRef(onEnded);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onPlaybackChangeRef = useRef(onPlaybackChange);

  // Stable string that only changes when the set of enabled filter types changes
  const graphKey = useMemo(
    () =>
      filters
        .filter((f) => f.enabled)
        .map((f) => f.type)
        .join(","),
    [filters]
  );

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
  }, [onTimeUpdate]);

  useEffect(() => {
    onPlaybackChangeRef.current = onPlaybackChange;
  }, [onPlaybackChange]);

  useEffect(() => {
    onPlaybackChange?.(isPlaying);
  }, [isPlaying, onPlaybackChange]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    (
      audio as HTMLAudioElement & {
        disableRemotePlayback?: boolean;
      }
    ).disableRemotePlayback = true;

    const handlePlay = () => {
      setIsPlaying(true);
      playCallbacksRef.current.forEach((cb) => cb());
      if (ctxRef.current?.state === "suspended") {
        void ctxRef.current.resume().catch(() => undefined);
      }
    };
    const handlePause = () => {
      setIsPlaying(false);
      stopCallbacksRef.current.forEach((cb) => cb());
    };
    const handleEnded = () => {
      setIsPlaying(false);
      stopCallbacksRef.current.forEach((cb) => cb());
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        onTimeUpdateRef.current?.(audio.duration, audio.duration);
      }
      onEndedRef.current?.();
    };
    const handleError = () => setError("Audio file could not be loaded");
    const handleTimeUpdate = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        onTimeUpdateRef.current?.(audio.currentTime, audio.duration);
      }
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, []);

  useEffect(() => {
    setError(null);
  }, [src]);

  useEffect(() => {
    if (!disabled) return;

    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    setIsPlaying(false);
  }, [disabled]);

  useEffect(() => {
    if (!autoPlay || disabled) {
      return;
    }

    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    void audio.play().catch(() => undefined);
  }, [autoPlay, disabled, src]);

  // Graph-rebuild effect: only fires when the set of enabled filters changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const existingEntry = getStoredMediaElementEntry(audio);
    const source = sourceRef.current;
    if (source) {
      source.disconnect();
    }
    nodesRef.current.forEach((node) => node.disconnect());
    nodesRef.current = [];
    disposersRef.current.forEach((dispose) => dispose());
    disposersRef.current = [];
    stopCallbacksRef.current = [];
    playCallbacksRef.current = [];
    nodeMapRef.current.clear();
    setError(null);

    const enabledFilters = filters.filter((f) => f.enabled);

    if (enabledFilters.length === 0) {
      if (existingEntry) {
        ctxRef.current = existingEntry.ctx;
        sourceRef.current = existingEntry.source;
        existingEntry.source.connect(existingEntry.ctx.destination);
        void resumeContextIfPlaying(audio, existingEntry.ctx).catch(
          () => undefined
        );
      } else {
        ctxRef.current = null;
        sourceRef.current = null;
      }

      return;
    }

    try {
      let entry = existingEntry;
      if (!entry) {
        const ctx = new AudioContext();
        const source = ctx.createMediaElementSource(audio);
        entry = { ctx, source };
        storeMediaElementEntry(audio, entry);
      }

      ctxRef.current = entry.ctx;
      sourceRef.current = entry.source;

      const chain: AudioNode[] = [entry.source];
      for (const filter of enabledFilters) {
        const def = filterRegistry.find((item) => item.type === filter.type);
        if (!def) continue;
        const result = def.createNode(entry.ctx, filter.params);
        nodeMapRef.current.set(filter.type, result);
        // Connect previous → node (input), use output for next link
        chain.push(result.node);
        if (result.output) {
          chain.push(result.output);
          nodesRef.current.push(result.node, result.output);
        } else {
          nodesRef.current.push(result.node);
        }
        if (result.dispose) {
          disposersRef.current.push(result.dispose);
        }
        if (result.onStop) {
          stopCallbacksRef.current.push(result.onStop);
        }
        if (result.onPlay) {
          playCallbacksRef.current.push(result.onPlay);
        }
      }
      chain.push(entry.ctx.destination);

      for (let index = 0; index < chain.length - 1; index += 1) {
        chain[index].connect(chain[index + 1] as AudioNode);
      }

      void resumeContextIfPlaying(audio, entry.ctx).catch(() => undefined);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Failed to enable filtered playback"
      );
    }

    const nodeMap = nodeMapRef.current;
    return () => {
      nodesRef.current.forEach((node) => node.disconnect());
      nodesRef.current = [];
      disposersRef.current.forEach((dispose) => dispose());
      disposersRef.current = [];
      stopCallbacksRef.current = [];
      playCallbacksRef.current = [];
      nodeMap.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphKey]);

  // Param-update effect: updates AudioParam values in-place without rebuilding
  useEffect(() => {
    for (const filter of filters) {
      if (!filter.enabled) continue;
      const result = nodeMapRef.current.get(filter.type);
      result?.update?.(filter.params);
    }
  }, [filters]);

  // Unmount cleanup: disconnect nodes but preserve the element-attached source entry.
  // A MediaElementSourceNode can only be created once per HTMLAudioElement,
  // so remounts must reuse the stored source/context pair for that element.
  useEffect(() => {
    return () => {
      sourceRef.current?.disconnect();
      nodesRef.current.forEach((node) => node.disconnect());
      nodesRef.current = [];
      disposersRef.current.forEach((dispose) => dispose());
      disposersRef.current = [];
      onPlaybackChangeRef.current?.(false);
      ctxRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3">
      <audio
        ref={audioRef}
        aria-label={ariaLabel}
        className={
          disabled ? "pointer-events-none w-full opacity-60" : "w-full"
        }
        controls
        controlsList="nodownload noremoteplayback"
        preload="metadata"
        src={src}
      />

      <SignalChain filters={filters} isPlaying={isPlaying} />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
