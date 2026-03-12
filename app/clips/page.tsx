"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { ClipCard } from "@/components/clips/clip-card";
import { getClips } from "@/lib/clips/api";
import type { Clip } from "@/lib/clips/types";

export default function ClipsPage() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClips = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getClips();
      setClips(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load clips");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchClips();
  }, [fetchClips]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Clips
        </h1>
        <p className="text-sm text-muted-foreground">Saved clips.</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-12 animate-pulse rounded-full bg-muted" />
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
              onClick={fetchClips}
              className="mt-3 text-sm font-medium text-primary hover:underline"
            >
              Try again
            </button>
          </CardContent>
        </Card>
      ) : clips.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-sm text-muted-foreground">No clips yet.</p>
            <Link
              href="/"
              className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
            >
              Record your first clip
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {clips.map((clip) => (
            <ClipCard key={clip.id} clip={clip} />
          ))}
        </div>
      )}
    </div>
  );
}
