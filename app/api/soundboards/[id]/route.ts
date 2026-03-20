import { NextResponse } from "next/server";

import { getSoundboard, updateSoundboard } from "@/lib/soundboards/store";
import type { Soundboard, SoundboardEntry } from "@/lib/soundboards/types";

type SoundboardRouteContext = {
  params: {
    id: string;
  };
};

type UpdateSoundboardBody = {
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

function parseUpdateBody(body: UpdateSoundboardBody) {
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

export async function GET(_request: Request, context: SoundboardRouteContext) {
  try {
    const soundboard = await getSoundboard(context.params.id);

    if (!soundboard) {
      return NextResponse.json(
        { error: "Soundboard not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(soundboard);
  } catch {
    return NextResponse.json(
      { error: "Failed to read soundboard" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, context: SoundboardRouteContext) {
  let body: UpdateSoundboardBody;

  try {
    body = (await request.json()) as UpdateSoundboardBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid soundboard payload" },
      { status: 400 }
    );
  }

  const parsed = parseUpdateBody(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const existing = await getSoundboard(context.params.id);
    if (!existing) {
      return NextResponse.json(
        { error: "Soundboard not found" },
        { status: 404 }
      );
    }

    const nextSoundboard: Soundboard = {
      ...existing,
      name: parsed.name,
      entries: parsed.entries,
      updatedAt: new Date().toISOString(),
    };

    await updateSoundboard(nextSoundboard);
    return NextResponse.json(nextSoundboard);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === `Soundboard not found: ${context.params.id}`
    ) {
      return NextResponse.json(
        { error: "Soundboard not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update soundboard" },
      { status: 500 }
    );
  }
}
