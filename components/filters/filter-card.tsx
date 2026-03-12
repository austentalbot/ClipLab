"use client";

import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { formatParamValue } from "@/lib/format";
import type {
  FilterDef,
  FilterConfig,
  FilterType,
} from "@/lib/audio/filter-registry";

type FilterCardProps = {
  def: FilterDef;
  config: FilterConfig;
  disabled?: boolean;
  onToggle: (type: FilterType) => void;
  onParamChange: (type: FilterType, param: string, value: number) => void;
};

export function FilterCard({
  def,
  config,
  disabled = false,
  onToggle,
  onParamChange,
}: FilterCardProps) {
  const enabled = config.enabled;

  return (
    <div
      className={`rounded-2xl border border-border p-4 transition-colors ${
        enabled ? "border-primary/25 bg-primary/5" : "bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant={enabled ? "default" : "outline"}>{def.label}</Badge>
            <InfoTooltip text={def.description} />
            <span className="text-xs font-medium text-muted-foreground">
              {enabled ? "On" : "Off"}
            </span>
          </div>
        </div>
        <Switch
          checked={enabled}
          disabled={disabled}
          onCheckedChange={() => onToggle(def.type)}
          aria-label={`Toggle ${def.label}`}
        />
      </div>

      {enabled ? (
        <div className="mt-4 space-y-4">
          {Object.entries(def.paramRanges).map(([paramName, range]) => {
            const value =
              config.params[paramName] ?? def.defaultParams[paramName];

            return (
              <div key={paramName} className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-foreground">
                    {range.label ?? paramName}
                  </span>
                  <span className="font-mono text-muted-foreground">
                    {formatParamValue(value, range.unit)}
                  </span>
                </div>
                <Slider
                  aria-label={range.label ?? paramName}
                  disabled={disabled}
                  min={range.min}
                  max={range.max}
                  step={range.step}
                  value={[value]}
                  onValueChange={([v]) => onParamChange(def.type, paramName, v)}
                />
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
