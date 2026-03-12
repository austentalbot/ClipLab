import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { filterRegistry } from "@/lib/audio/filter-registry";
import type { Clip } from "@/lib/clips/types";
import { formatClipDuration, formatRelativeTime } from "@/lib/clips/format";

type ClipCardProps = {
  clip: Clip;
};

export function ClipCard({ clip }: ClipCardProps) {
  const enabledFilters = clip.filters.filter((f) => f.enabled);
  const filterLabels = enabledFilters.map((f) => {
    const def = filterRegistry.find((d) => d.type === f.type);
    return def?.label ?? f.type;
  });

  return (
    <Link href={`/clips/${clip.id}`} className="block">
      <Card className="transition-colors hover:border-foreground/20 hover:shadow-sm">
        <CardContent className="flex items-start justify-between gap-4 py-4">
          <div className="min-w-0 space-y-3">
            <p className="truncate text-base font-semibold text-foreground">
              {clip.title}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline">
                {formatClipDuration(clip.durationMs)}
              </Badge>
              {filterLabels.map((label) => (
                <Badge key={label} variant="secondary">
                  {label}
                </Badge>
              ))}
            </div>
          </div>
          <span className="shrink-0 text-sm text-muted-foreground">
            {formatRelativeTime(clip.createdAt)}
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
