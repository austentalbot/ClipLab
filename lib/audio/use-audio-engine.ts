"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { type FilterConfig } from "./filter-registry";
import { type AudioGraph, buildGraph, applyParams } from "./graph-builder";

function cloneFilters(filters: FilterConfig[]): FilterConfig[] {
  return filters.map((filter) => ({
    ...filter,
    params: { ...filter.params },
  }));
}

function haveEnabledFiltersChanged(
  prev: FilterConfig[],
  next: FilterConfig[]
): boolean {
  if (prev.length !== next.length) return true;

  return prev.some((filter, index) => {
    const nextFilter = next[index];
    return !nextFilter || filter.enabled !== nextFilter.enabled;
  });
}

export function useAudioEngine() {
  const ctxRef = useRef<AudioContext | null>(null);
  const graphRef = useRef<AudioGraph | null>(null);
  const bufferCacheRef = useRef<WeakMap<Blob, AudioBuffer>>(new WeakMap());
  const bufferRef = useRef<AudioBuffer | null>(null);
  const filtersRef = useRef<FilterConfig[]>([]);
  const startedAtRef = useRef(0);
  const previewTokenRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const stopGraph = useCallback(() => {
    if (graphRef.current) {
      graphRef.current.stop();
      graphRef.current = null;
    }
  }, []);

  const startGraph = useCallback(
    (
      ctx: AudioContext,
      buffer: AudioBuffer,
      filters: FilterConfig[],
      offset = 0,
      token = previewTokenRef.current
    ) => {
      stopGraph();

      const safeOffset = Math.max(0, Math.min(offset, buffer.duration));
      const graph = buildGraph(ctx, buffer, filters);
      graphRef.current = graph;
      bufferRef.current = buffer;
      filtersRef.current = cloneFilters(filters);
      startedAtRef.current = ctx.currentTime - safeOffset;

      graph.source.onended = () => {
        if (previewTokenRef.current !== token || graphRef.current !== graph)
          return;
        graphRef.current = null;
        setIsPlaying(false);
      };

      graph.start(safeOffset);
      setIsPlaying(true);
    },
    [stopGraph]
  );

  // Lazily create or resume AudioContext
  const getCtx = useCallback(async () => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    if (ctxRef.current.state === "suspended") {
      await ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const decodeBlob = useCallback(
    async (blob: Blob): Promise<AudioBuffer> => {
      const cached = bufferCacheRef.current.get(blob);
      if (cached) return cached;

      const ctx = await getCtx();
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      bufferCacheRef.current.set(blob, audioBuffer);
      return audioBuffer;
    },
    [getCtx]
  );

  const stop = useCallback(() => {
    previewTokenRef.current += 1;
    stopGraph();
    setIsPlaying(false);
  }, [stopGraph]);

  const preview = useCallback(
    async (blob: Blob, filters: FilterConfig[]) => {
      const token = previewTokenRef.current + 1;
      previewTokenRef.current = token;
      stopGraph();
      setIsPlaying(false);

      const ctx = await getCtx();
      const buffer = await decodeBlob(blob);
      if (previewTokenRef.current !== token) return;

      startGraph(ctx, buffer, filters, 0, token);
    },
    [decodeBlob, getCtx, startGraph, stopGraph]
  );

  const syncFilters = useCallback(
    async (filters: FilterConfig[]) => {
      const currentGraph = graphRef.current;
      const currentBuffer = bufferRef.current;
      const previousFilters = filtersRef.current;
      if (!currentGraph || !currentBuffer) return;

      const ctx = await getCtx();
      if (
        graphRef.current !== currentGraph ||
        bufferRef.current !== currentBuffer
      ) {
        return;
      }

      if (haveEnabledFiltersChanged(previousFilters, filters)) {
        const offset = ctx.currentTime - startedAtRef.current;
        if (offset >= currentBuffer.duration) {
          stop();
          return;
        }

        const token = previewTokenRef.current + 1;
        previewTokenRef.current = token;
        startGraph(ctx, currentBuffer, filters, offset, token);
        return;
      }

      filtersRef.current = cloneFilters(filters);

      for (const filter of filters) {
        if (!filter.enabled) continue;
        const node = currentGraph.nodes.get(filter.type);
        if (!node) continue;
        applyParams(node, filter.type, filter.params);
      }
    },
    [getCtx, startGraph, stop]
  );

  useEffect(() => {
    return () => {
      previewTokenRef.current += 1;
      stopGraph();
      if (ctxRef.current) {
        void ctxRef.current.close();
        ctxRef.current = null;
      }
    };
  }, [stopGraph]);

  return {
    isPlaying,
    preview,
    stop,
    syncFilters,
    decodeBlob,
  } as const;
}
