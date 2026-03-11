import Link from "next/link";
import { notFound } from "next/navigation";

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
  getClip,
  getClipFileUrl,
} from "@/lib/clips/store";
import { FilteredPlayback } from "./filtered-playback";

type ClipDetailPageProps = {
  params: {
    id: string;
  };
};

export default async function ClipDetailPage({ params }: ClipDetailPageProps) {
  const clip = await getClip(params.id);

  if (!clip) {
    notFound();
  }

  const activeFilters = clip.filters.filter((filter) => filter.enabled);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Clip detail
        </h1>
        <p className="text-sm text-muted-foreground">{clip.id}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Saved recording</CardTitle>
          <CardDescription>
            Verify the saved file and metadata from local disk storage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium text-foreground">Created</dt>
              <dd className="text-muted-foreground">
                {formatClipCreatedAt(clip.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Duration</dt>
              <dd className="text-muted-foreground">
                {formatClipDuration(clip.durationMs)}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Filename</dt>
              <dd className="break-all text-muted-foreground">
                {clip.filename}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Saved path</dt>
              <dd className="break-all text-muted-foreground">
                {getClipFileUrl(clip.filename)}
              </dd>
            </div>
          </dl>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Playback</p>
            <FilteredPlayback
              filters={clip.filters}
              src={getClipFileUrl(clip.filename)}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Filters</p>
            {activeFilters.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No filters enabled.
              </p>
            ) : (
              <ul className="space-y-2 text-sm text-muted-foreground">
                {activeFilters.map((filter) => (
                  <li
                    key={filter.type}
                    className="rounded-xl border border-border bg-muted/40 px-3 py-2"
                  >
                    <span className="font-medium capitalize text-foreground">
                      {filter.type}
                    </span>{" "}
                    {Object.entries(filter.params)
                      .map(([key, value]) => `${key}: ${value}`)
                      .join(", ")}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Link
            href="/clips"
            className="inline-flex text-sm font-medium text-primary hover:text-primary/80 hover:underline"
          >
            Back to clips
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
