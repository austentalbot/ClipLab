"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { SignalChain } from "@/components/filters/signal-chain";
import { filterRegistry, type FilterConfig } from "@/lib/audio/filter-registry";

const mediaElementSourceStore = new WeakMap<
  HTMLAudioElement,
  {
    ctx: AudioContext;
    source: MediaElementAudioSourceNode;
  }
>();

type FilteredAudioPlayerProps = {
  ariaLabel?: string;
  disabled?: boolean;
  filters: FilterConfig[];
  onPlaybackChange?: (isPlaying: boolean) => void;
  src: string;
};

export function FilteredAudioPlayer({
  ariaLabel = "Filtered playback",
  disabled = false,
  filters,
  onPlaybackChange,
  src,
}: FilteredAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const nodesRef = useRef<AudioNode[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enabledFilters = useMemo(
    () => filters.filter((filter) => filter.enabled),
    [filters]
  );

  const resumeContextIfPlaying = async (
    audio: HTMLAudioElement,
    ctx: AudioContext
  ) => {
    if (audio.paused || ctx.state !== "suspended") {
      return;
    }

    await ctx.resume();
  };

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
      if (ctxRef.current?.state === "suspended") {
        void ctxRef.current.resume().catch(() => undefined);
      }
    };
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  useEffect(() => {
    if (!disabled) return;

    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    setIsPlaying(false);
  }, [disabled]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const existingEntry = mediaElementSourceStore.get(audio) ?? null;
    const source = sourceRef.current;
    if (source) {
      source.disconnect();
    }
    nodesRef.current.forEach((node) => node.disconnect());
    nodesRef.current = [];
    setError(null);

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
        mediaElementSourceStore.set(audio, entry);
      }

      ctxRef.current = entry.ctx;
      sourceRef.current = entry.source;

      const chain: AudioNode[] = [entry.source];
      for (const filter of enabledFilters) {
        const def = filterRegistry.find((item) => item.type === filter.type);
        if (!def) continue;
        const node = def.createNode(entry.ctx, filter.params);
        chain.push(node);
        nodesRef.current.push(node);
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

    return () => {
      nodesRef.current.forEach((node) => node.disconnect());
      nodesRef.current = [];
    };
  }, [enabledFilters]);

  useEffect(() => {
    return () => {
      sourceRef.current?.disconnect();
      nodesRef.current.forEach((node) => node.disconnect());
      nodesRef.current = [];
      onPlaybackChange?.(false);
    };
  }, [onPlaybackChange]);

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
