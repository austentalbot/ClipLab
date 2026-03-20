"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { SoundboardCard } from "@/components/soundboards/soundboard-card";
import { Card, CardContent } from "@/components/ui/card";
import { getSoundboards } from "@/lib/soundboards/api";
import type { Soundboard } from "@/lib/soundboards/types";

export default function SoundboardsPage() {
  const [soundboards, setSoundboards] = useState<Soundboard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSoundboards = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getSoundboards();
      setSoundboards(data);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Failed to load soundboards"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSoundboards();
  }, [fetchSoundboards]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Soundboards
          </h1>
          <p className="text-sm text-muted-foreground">
            Build reusable playlists from your saved clips.
          </p>
        </div>
        <Link
          href="/soundboards/new"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          New soundboard
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-24 animate-pulse rounded-full bg-muted" />
                  <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <button
              onClick={fetchSoundboards}
              className="mt-3 text-sm font-medium text-primary hover:underline"
            >
              Try again
            </button>
          </CardContent>
        </Card>
      ) : soundboards.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-sm text-muted-foreground">No soundboards yet.</p>
            <Link
              href="/soundboards/new"
              className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
            >
              Create your first soundboard
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {soundboards.map((soundboard) => (
            <SoundboardCard
              key={soundboard.id}
              href={`/soundboards/${soundboard.id}`}
              soundboard={soundboard}
            />
          ))}
        </div>
      )}
    </div>
  );
}
