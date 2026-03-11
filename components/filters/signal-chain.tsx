import { Badge } from "@/components/ui/badge";
import { filterRegistry, type FilterConfig } from "@/lib/audio/filter-registry";

type SignalChainProps = {
  filters: FilterConfig[];
  isPlaying: boolean;
};

export function SignalChain({ filters, isPlaying }: SignalChainProps) {
  const enabledDefs = filterRegistry.filter((def) =>
    filters.some((f) => f.type === def.type && f.enabled)
  );

  return (
    <div className="flex items-center gap-2 overflow-x-auto py-1 text-sm text-muted-foreground">
      <span className={isPlaying ? "animate-pulse text-foreground" : ""}>
        mic
      </span>
      <span>→</span>

      {enabledDefs.length === 0 ? (
        <span className="italic">no filters</span>
      ) : (
        enabledDefs.map((def) => (
          <span key={def.type} className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={isPlaying ? "animate-pulse" : ""}
            >
              {def.label}
            </Badge>
            <span>→</span>
          </span>
        ))
      )}

      <span className={isPlaying ? "animate-pulse text-foreground" : ""}>
        speaker
      </span>
    </div>
  );
}
