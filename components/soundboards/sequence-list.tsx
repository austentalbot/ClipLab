"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatClipDuration } from "@/lib/clips/format";

export type SequenceListItem = {
  clipId: string;
  title: string;
  durationMs: number | null;
  unavailable?: boolean;
};

type SequenceListProps = {
  clips: SequenceListItem[];
  onRemove: (index: number) => void;
  onReorder: (from: number, to: number) => void;
};

export function SequenceList({
  clips,
  onRemove,
  onReorder,
}: SequenceListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sequence</CardTitle>
      </CardHeader>
      <CardContent>
        {clips.length === 0 ? (
          <div className="rounded-2xl border border-border bg-muted/30 px-4 py-4 text-sm text-muted-foreground">
            Add clips to build your soundboard sequence.
          </div>
        ) : (
          <ol className="space-y-3">
            {clips.map((clip, index) => (
              <li
                key={`${clip.clipId}-${index}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/20 px-4 py-3"
              >
                <div className="min-w-0 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {index + 1}
                    </span>
                    <p className="truncate text-sm font-medium text-foreground">
                      {clip.title}
                    </p>
                  </div>
                  {clip.unavailable ? (
                    <Badge variant="destructive">Clip unavailable</Badge>
                  ) : clip.durationMs !== null ? (
                    <Badge variant="outline">
                      {formatClipDuration(clip.durationMs)}
                    </Badge>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => onReorder(index, index - 1)}
                    disabled={index === 0}
                    className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Up
                  </button>
                  <button
                    onClick={() => onReorder(index, index + 1)}
                    disabled={index === clips.length - 1}
                    className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Down
                  </button>
                  <button
                    onClick={() => onRemove(index)}
                    className="rounded-md border border-destructive/30 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/5"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
