import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/clips/format";
import type { Soundboard } from "@/lib/soundboards/types";

type SoundboardCardProps = {
  href?: string;
  soundboard: Soundboard;
};

function SoundboardCardBody({ soundboard }: { soundboard: Soundboard }) {
  const clipCount = soundboard.entries.length;

  return (
    <Card className="transition-colors hover:border-foreground/20 hover:shadow-sm">
      <CardContent className="flex items-start justify-between gap-4 py-4">
        <div className="min-w-0 space-y-3">
          <p className="truncate text-base font-semibold text-foreground">
            {soundboard.name}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline">
              {clipCount} {clipCount === 1 ? "clip" : "clips"}
            </Badge>
          </div>
        </div>
        <span className="shrink-0 text-sm text-muted-foreground">
          {formatRelativeTime(soundboard.updatedAt)}
        </span>
      </CardContent>
    </Card>
  );
}

export function SoundboardCard({ href, soundboard }: SoundboardCardProps) {
  if (!href) {
    return <SoundboardCardBody soundboard={soundboard} />;
  }

  return (
    <Link href={href} className="block">
      <SoundboardCardBody soundboard={soundboard} />
    </Link>
  );
}
