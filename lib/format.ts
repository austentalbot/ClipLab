export function formatParamValue(value: number, unit?: string): string {
  const formatted = Number.isInteger(value)
    ? value.toString()
    : value.toFixed(2);
  return unit ? `${formatted}${unit}` : formatted;
}
