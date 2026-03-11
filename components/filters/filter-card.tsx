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
  onToggle: (type: FilterType) => void;
  onParamChange: (type: FilterType, param: string, value: number) => void;
};

export function FilterCard({
  def,
  config,
  onToggle,
  onParamChange,
}: FilterCardProps) {
  const enabled = config.enabled;

  return (
    <div
      className={`space-y-3 rounded-lg border border-border p-3 transition-opacity ${
        enabled ? "opacity-100" : "opacity-60"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant={enabled ? "default" : "outline"}>{def.label}</Badge>
          <InfoTooltip text={def.description} />
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={() => onToggle(def.type)}
          aria-label={`Toggle ${def.label}`}
        />
      </div>

      {Object.entries(def.paramRanges).map(([paramName, range]) => {
        const value = config.params[paramName] ?? def.defaultParams[paramName];

        return (
          <div key={paramName} className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2 text-foreground">
                <span>{range.label ?? paramName}</span>
                {range.description ? (
                  <InfoTooltip text={range.description} />
                ) : null}
              </div>
              <span className="font-mono text-muted-foreground">
                {formatParamValue(value, range.unit)}
              </span>
            </div>
            <Slider
              aria-label={range.label ?? paramName}
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
  );
}
