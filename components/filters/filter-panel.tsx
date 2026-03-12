"use client";

import { FilterCard } from "@/components/filters/filter-card";
import {
  filterRegistry,
  type FilterConfig,
  type FilterType,
} from "@/lib/audio/filter-registry";

type FilterPanelProps = {
  filters: FilterConfig[];
  disabled?: boolean;
  onToggle: (type: FilterType) => void;
  onParamChange: (type: FilterType, param: string, value: number) => void;
};

export function FilterPanel({
  disabled = false,
  filters,
  onToggle,
  onParamChange,
}: FilterPanelProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">Filters</p>
      <div className="space-y-3">
        {filterRegistry.map((def) => {
          const config = filters.find((f) => f.type === def.type);
          if (!config) return null;

          return (
            <FilterCard
              key={def.type}
              def={def}
              config={config}
              disabled={disabled}
              onToggle={onToggle}
              onParamChange={onParamChange}
            />
          );
        })}
      </div>
    </div>
  );
}
