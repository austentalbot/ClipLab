import Link from "next/link";
import { notFound } from "next/navigation";

import { SoundboardPlayer } from "@/components/soundboards/soundboard-player";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/clips/format";
import { readClips } from "@/lib/clips/store";
import { getClipFileUrl } from "@/lib/clips/urls";
import { getSoundboard } from "@/lib/soundboards/store";

type SoundboardDetailPageProps = {
  params: {
    id: string;
  };
};

export default async function SoundboardDetailPage({
  params,
}: SoundboardDetailPageProps) {
  const soundboard = await getSoundboard(params.id);

  if (!soundboard) {
    notFound();
  }

  const orderedEntries = [...soundboard.entries].sort(
    (a, b) => a.position - b.position
  );
  const clipsById = new Map((await readClips()).map((clip) => [clip.id, clip]));

  const clips = orderedEntries
    .map((entry) => {
      const clip = clipsById.get(entry.clipId);
      if (!clip) {
        return null;
      }

      return {
        id: clip.id,
        title: clip.title,
        durationMs: clip.durationMs,
        filters: clip.filters,
        src: getClipFileUrl(clip.filename),
      };
    })
    .filter((clip): clip is NonNullable<typeof clip> => clip !== null);

  const missingEntries = orderedEntries.filter(
    (entry) => !clipsById.has(entry.clipId)
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          {soundboard.name}
        </h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>{formatRelativeTime(soundboard.updatedAt)}</span>
          <Badge variant="outline">
            {soundboard.entries.length}{" "}
            {soundboard.entries.length === 1 ? "clip" : "clips"}
          </Badge>
        </div>
        <Link
          href={`/soundboards/${soundboard.id}/edit`}
          className="inline-flex text-sm font-medium text-primary hover:text-primary/80 hover:underline"
        >
          Edit soundboard
        </Link>
      </div>

      <SoundboardPlayer clips={clips} />

      {missingEntries.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Unavailable clips</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {missingEntries.map((entry) => (
                <li
                  key={`${entry.clipId}-${entry.position}`}
                  className="rounded-2xl border border-border bg-muted/20 px-4 py-3"
                >
                  <p className="text-sm font-medium text-foreground">
                    Position {entry.position + 1}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Clip unavailable
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>About this soundboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Clips play in sequence using each clip&apos;s saved filters.
          </p>
          <Link
            href="/soundboards"
            className="inline-flex text-sm font-medium text-primary hover:text-primary/80 hover:underline"
          >
            Back to soundboards
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
