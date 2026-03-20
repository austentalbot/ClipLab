import crypto from "crypto";
import { NextResponse } from "next/server";

import { addSoundboard, readSoundboards } from "@/lib/soundboards/store";
import type { Soundboard, SoundboardEntry } from "@/lib/soundboards/types";

type CreateSoundboardBody = {
  name?: unknown;
  entries?: unknown;
};

function validateEntries(entries: unknown): entries is SoundboardEntry[] {
  if (!Array.isArray(entries)) {
    return false;
  }

  return entries.every((entry, index) => {
    if (typeof entry !== "object" || entry === null) {
      return false;
    }

    const nextEntry = entry as Record<string, unknown>;
    return (
      typeof nextEntry.clipId === "string" &&
      nextEntry.clipId.trim().length > 0 &&
      typeof nextEntry.position === "number" &&
      Number.isInteger(nextEntry.position) &&
      nextEntry.position === index
    );
  });
}

function parseCreateBody(body: CreateSoundboardBody) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return { error: "Missing soundboard name" } as const;
  }

  if (!validateEntries(body.entries)) {
    return { error: "Invalid soundboard entries" } as const;
  }

  return {
    name,
    entries: body.entries,
  } as const;
}

export async function GET() {
  try {
    const soundboards = await readSoundboards();
    return NextResponse.json(soundboards);
  } catch {
    return NextResponse.json(
      { error: "Failed to read soundboards" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  let body: CreateSoundboardBody;

  try {
    body = (await request.json()) as CreateSoundboardBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid soundboard payload" },
      { status: 400 }
    );
  }

  const parsed = parseCreateBody(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const timestamp = new Date().toISOString();
  const soundboard: Soundboard = {
    id: crypto.randomUUID(),
    name: parsed.name,
    entries: parsed.entries,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  try {
    await addSoundboard(soundboard);
    return NextResponse.json(soundboard, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to save soundboard" },
      { status: 500 }
    );
  }
}
