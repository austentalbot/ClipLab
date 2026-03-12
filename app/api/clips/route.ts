import { NextResponse } from "next/server";
import { mkdir, rm, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { addClip, readClips } from "@/lib/clips/store";
import type { Clip } from "@/lib/clips/types";
import {
  type FilterConfig,
  type FilterType,
  filterRegistry,
} from "@/lib/audio/filter-registry";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

function validateFilters(filters: unknown[]): filters is FilterConfig[] {
  for (const entry of filters) {
    if (typeof entry !== "object" || entry === null) return false;
    const f = entry as Record<string, unknown>;

    if (typeof f.type !== "string") return false;
    if (typeof f.enabled !== "boolean") return false;
    if (typeof f.params !== "object" || f.params === null) return false;

    const def = filterRegistry.find((d) => d.type === (f.type as FilterType));
    if (!def) return false;

    const params = f.params as Record<string, unknown>;
    for (const key of Object.keys(def.paramRanges)) {
      if (typeof params[key] !== "number") return false;
    }
  }
  return true;
}

export async function GET() {
  try {
    const clips = await readClips();
    return NextResponse.json(clips);
  } catch {
    return NextResponse.json(
      { error: "Failed to read clips" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const formData = await request.formData();

  const file = formData.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing audio file" }, { status: 400 });
  }

  const titleRaw = formData.get("title");
  const title = typeof titleRaw === "string" ? titleRaw.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "Missing clip title" }, { status: 400 });
  }

  const durationMs = Number(formData.get("durationMs"));
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return NextResponse.json({ error: "Invalid durationMs" }, { status: 400 });
  }

  let filters: FilterConfig[] = [];
  const filtersRaw = formData.get("filters");
  if (typeof filtersRaw === "string") {
    try {
      const parsed = JSON.parse(filtersRaw);
      if (!Array.isArray(parsed)) {
        return NextResponse.json(
          { error: "Invalid filters payload" },
          { status: 400 }
        );
      }
      if (!validateFilters(parsed)) {
        return NextResponse.json(
          { error: "Invalid filters payload" },
          { status: 400 }
        );
      }
      filters = parsed;
    } catch {
      return NextResponse.json(
        { error: "Invalid filters payload" },
        { status: 400 }
      );
    }
  }

  const id = crypto.randomUUID();
  const filename = `${id}.webm`;
  const uploadPath = path.join(UPLOADS_DIR, filename);

  try {
    await mkdir(UPLOADS_DIR, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(uploadPath, buffer);

    const clip: Clip = {
      id,
      title,
      filename,
      durationMs,
      filters,
      createdAt: new Date().toISOString(),
    };

    await addClip(clip);

    return NextResponse.json(clip, { status: 201 });
  } catch {
    await rm(uploadPath, { force: true }).catch(() => undefined);
    return NextResponse.json({ error: "Failed to save clip" }, { status: 500 });
  }
}
