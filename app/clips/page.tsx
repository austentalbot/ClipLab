import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatClipCreatedAt,
  formatClipDuration,
  listClips,
} from "@/lib/clips/store";

export default async function ClipsPage() {
  const clips = await listClips();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Clips
        </h1>
        <p className="text-sm text-muted-foreground">
          Recent saved clips from local disk storage.
        </p>
      </div>

      {clips.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No clips yet</CardTitle>
            <CardDescription>
              Record and save a clip to verify local file persistence.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4">
          {clips.map((clip) => (
            <Card key={clip.id}>
              <CardHeader>
                <CardTitle className="text-lg">{clip.id}</CardTitle>
                <CardDescription>
                  {formatClipCreatedAt(clip.createdAt)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <dl className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                  <div>
                    <dt className="font-medium text-foreground">Duration</dt>
                    <dd>{formatClipDuration(clip.durationMs)}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground">File</dt>
                    <dd>{clip.filename}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground">Filters</dt>
                    <dd>
                      {clip.filters.filter((filter) => filter.enabled).length}{" "}
                      active
                    </dd>
                  </div>
                </dl>

                <Link
                  href={`/clips/${clip.id}`}
                  className="text-sm font-medium text-primary hover:text-primary/80 hover:underline"
                >
                  Open clip
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
