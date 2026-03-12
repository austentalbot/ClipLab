import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { filterRegistry } from "@/lib/audio/filter-registry";
import { formatClipCreatedAt, formatClipDuration } from "@/lib/clips/format";
import { getClip, getClipFileUrl } from "@/lib/clips/store";
import { FilteredPlayback } from "./filtered-playback";

type ClipDetailPageProps = {
  params: {
    id: string;
  };
};

function formatFilterParams(
  params: Record<string, number>,
  type: string
): string[] {
  const def = filterRegistry.find((item) => item.type === type);

  return Object.entries(params).map(([key, value]) => {
    const range = def?.paramRanges[key];
    const label = range?.label ?? key;
    const unit = range?.unit ?? "";
    return `${label}: ${value}${unit}`;
  });
}

export default async function ClipDetailPage({ params }: ClipDetailPageProps) {
  const clip = await getClip(params.id);

  if (!clip) {
    notFound();
  }

  const activeFilters = clip.filters.filter((f) => f.enabled);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          {clip.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {formatClipDuration(clip.durationMs)} ·{" "}
          {formatClipCreatedAt(clip.createdAt)}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Playback</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          <FilteredPlayback
            filters={clip.filters}
            src={getClipFileUrl(clip.filename)}
          />

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              Applied filters
            </p>
            {activeFilters.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No filters were saved for this clip.
              </p>
            ) : (
              <ul className="space-y-3">
                {activeFilters.map((filter) => {
                  const def = filterRegistry.find(
                    (d) => d.type === filter.type
                  );
                  const label = def?.label ?? filter.type;
                  const paramsList = formatFilterParams(
                    filter.params,
                    filter.type
                  );

                  return (
                    <li
                      key={filter.type}
                      className="rounded-xl border border-border bg-muted/40 px-3 py-3"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{label}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {paramsList.join(", ")}
                      </p>
                    </li>
                  );
                })}
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
