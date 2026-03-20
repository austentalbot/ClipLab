import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import type { Soundboard } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const SOUNDBOARDS_FILE = path.join(DATA_DIR, "soundboards.json");

function sortSoundboardsByUpdatedAtDesc(
  soundboards: Soundboard[]
): Soundboard[] {
  return [...soundboards].sort((a, b) => {
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export async function readSoundboards(): Promise<Soundboard[]> {
  try {
    const raw = await readFile(SOUNDBOARDS_FILE, "utf-8");
    return sortSoundboardsByUpdatedAtDesc(JSON.parse(raw) as Soundboard[]);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

export async function getSoundboard(id: string): Promise<Soundboard | null> {
  const soundboards = await readSoundboards();
  return soundboards.find((soundboard) => soundboard.id === id) ?? null;
}

export async function writeSoundboards(
  soundboards: Soundboard[]
): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(
    SOUNDBOARDS_FILE,
    JSON.stringify(sortSoundboardsByUpdatedAtDesc(soundboards), null, 2)
  );
}

export async function addSoundboard(soundboard: Soundboard): Promise<void> {
  const soundboards = await readSoundboards();
  soundboards.unshift(soundboard);
  await writeSoundboards(soundboards);
}

export async function updateSoundboard(soundboard: Soundboard): Promise<void> {
  const soundboards = await readSoundboards();
  const index = soundboards.findIndex((entry) => entry.id === soundboard.id);

  if (index === -1) {
    throw new Error(`Soundboard not found: ${soundboard.id}`);
  }

  soundboards[index] = soundboard;
  await writeSoundboards(soundboards);
}
