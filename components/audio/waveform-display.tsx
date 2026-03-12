"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { extractPeaks } from "@/lib/audio/waveform";
import { cn } from "@/lib/utils";

type WaveformDisplayProps = {
  audioBuffer: AudioBuffer | null;
  progress?: number;
  bucketCount?: number;
  className?: string;
};

function resolvePrimaryColor(canvas: HTMLCanvasElement): string {
  const style = getComputedStyle(canvas);
  const raw = style.getPropertyValue("--primary").trim();
  if (!raw) return "hsl(220 70% 50%)";
  const parts = raw.split(/\s+/);
  if (parts.length >= 3) {
    return `hsl(${parts[0]} ${parts[1]} ${parts[2]})`;
  }
  return `hsl(${raw})`;
}

export function WaveformDisplay({
  audioBuffer,
  progress = 0,
  bucketCount = 120,
  className,
}: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorRef = useRef<string | null>(null);
  const sizeRef = useRef<{ w: number; h: number; dpr: number } | null>(null);
  const [ready, setReady] = useState(false);
  const [resizeVersion, setResizeVersion] = useState(0);

  const peaks = useMemo(
    () => (audioBuffer ? extractPeaks(audioBuffer, bucketCount) : null),
    [audioBuffer, bucketCount]
  );

  // Reset caches and fade state when new audio loads
  useEffect(() => {
    colorRef.current = null;
    sizeRef.current = null;
    setReady(false);
  }, [peaks]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === "undefined") return;

    const notifyResize = () => {
      sizeRef.current = null;
      setResizeVersion((value) => value + 1);
    };

    if (typeof ResizeObserver !== "undefined") {
      let frame = 0;
      const observer = new ResizeObserver(() => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(notifyResize);
      });
      observer.observe(canvas);

      return () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
      };
    }

    window.addEventListener("resize", notifyResize);
    return () => {
      window.removeEventListener("resize", notifyResize);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !peaks) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const needsResize =
      !sizeRef.current ||
      sizeRef.current.w !== rect.width ||
      sizeRef.current.h !== rect.height ||
      sizeRef.current.dpr !== dpr;

    if (needsResize) {
      sizeRef.current = { w: rect.width, h: rect.height, dpr };
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }

    if (!colorRef.current) {
      colorRef.current = resolvePrimaryColor(canvas);
    }

    const size = sizeRef.current;
    if (!size) return;

    const { w: width, h: height, dpr: scale } = size;
    const primaryColor = colorRef.current;

    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const barWidth = width / peaks.length;
    const gap = Math.max(0.5, barWidth * 0.12);
    const effectiveBarWidth = barWidth - gap;
    const radius = Math.min(effectiveBarWidth / 2, 1.5);
    const midY = height / 2;
    const maxHalfHeight = height * 0.45;
    const playedPosition = progress * peaks.length;

    ctx.fillStyle = primaryColor;

    // Pass 1: all bars at low opacity (unplayed)
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < peaks.length; i++) {
      const peak = peaks[i];
      const halfHeight = Math.max(1, peak * maxHalfHeight);
      const x = i * barWidth + gap / 2;

      ctx.beginPath();
      ctx.roundRect(
        x,
        midY - halfHeight,
        effectiveBarWidth,
        halfHeight * 2,
        radius
      );
      ctx.fill();
    }

    // Pass 2: overdraw played bars at full opacity
    ctx.globalAlpha = 1.0;
    const fullyPlayed = Math.floor(playedPosition);
    for (let i = 0; i < fullyPlayed; i++) {
      const peak = peaks[i];
      const halfHeight = Math.max(1, peak * maxHalfHeight);
      const x = i * barWidth + gap / 2;

      ctx.beginPath();
      ctx.roundRect(
        x,
        midY - halfHeight,
        effectiveBarWidth,
        halfHeight * 2,
        radius
      );
      ctx.fill();
    }

    // Playhead bar: fractional alpha
    if (playedPosition % 1 !== 0 && fullyPlayed < peaks.length) {
      const frac = playedPosition - fullyPlayed;
      ctx.globalAlpha = 0.25 + frac * 0.75;
      const peak = peaks[fullyPlayed];
      const halfHeight = Math.max(1, peak * maxHalfHeight);
      const x = fullyPlayed * barWidth + gap / 2;

      ctx.beginPath();
      ctx.roundRect(
        x,
        midY - halfHeight,
        effectiveBarWidth,
        halfHeight * 2,
        radius
      );
      ctx.fill();
    }

    ctx.globalAlpha = 1;

    if (!ready) setReady(true);
  }, [peaks, progress, ready, resizeVersion]);

  if (!audioBuffer) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn(
        "h-20 w-full transition-opacity duration-300",
        ready ? "opacity-100" : "opacity-0",
        className
      )}
    />
  );
}
