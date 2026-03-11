import { type FilterConfig } from "@/lib/audio/filter-registry";

export type Clip = {
  id: string;
  filename: string;
  durationMs: number;
  filters: FilterConfig[];
  createdAt: string;
};
