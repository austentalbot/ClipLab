import type { FilterConfig } from "@/lib/audio/filter-registry";
import type { Clip } from "./types";

export async function uploadClip(
  blob: Blob,
  durationMs: number,
  filters: FilterConfig[]
): Promise<Clip> {
  const form = new FormData();
  form.append("file", blob, "recording.webm");
  form.append("durationMs", String(durationMs));
  form.append("filters", JSON.stringify(filters));

  const res = await fetch("/api/clips", { method: "POST", body: form });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(
      (body as { error?: string } | null)?.error ?? "Upload failed"
    );
  }

  return res.json() as Promise<Clip>;
}
