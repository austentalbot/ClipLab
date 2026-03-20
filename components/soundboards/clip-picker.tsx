"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getClips } from "@/lib/clips/api";
import { formatClipDuration } from "@/lib/clips/format";
import type { Clip } from "@/lib/clips/types";

type ClipPickerProps = {
  onSelect: (clip: Clip) => void;
};

export function ClipPicker({ onSelect }: ClipPickerProps) {
  const [clips, setClips] = useState<Clip[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClips = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getClips();
      setClips(data);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Failed to load clips"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchClips();
  }, [fetchClips]);

  const filteredClips = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return clips;
    }

    return clips.filter((clip) =>
      clip.title.toLowerCase().includes(normalizedQuery)
    );
  }, [clips, query]);

  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle>Add clips</CardTitle>
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search clips by title"
          className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-14 animate-pulse rounded-2xl bg-muted"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-border bg-muted/30 px-4 py-4">
            <p className="text-sm text-destructive">{error}</p>
            <button
              onClick={fetchClips}
              className="mt-3 text-sm font-medium text-primary hover:underline"
            >
              Try again
            </button>
          </div>
        ) : filteredClips.length === 0 ? (
          <div className="rounded-2xl border border-border bg-muted/30 px-4 py-4 text-sm text-muted-foreground">
            {clips.length === 0
              ? "No saved clips yet."
              : "No clips match that search."}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredClips.map((clip) => (
              <div
                key={clip.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/20 px-4 py-3"
              >
                <div className="min-w-0 space-y-2">
                  <p className="truncate text-sm font-medium text-foreground">
                    {clip.title}
                  </p>
                  <Badge variant="outline">
                    {formatClipDuration(clip.durationMs)}
                  </Badge>
                </div>
                <button
                  onClick={() => onSelect(clip)}
                  className="shrink-0 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
