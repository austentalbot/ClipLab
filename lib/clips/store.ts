import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { Clip } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const CLIPS_FILE = path.join(DATA_DIR, "clips.json");

function sortClipsByCreatedAtDesc(clips: Clip[]): Clip[] {
  return [...clips].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export async function readClips(): Promise<Clip[]> {
  try {
    const raw = await readFile(CLIPS_FILE, "utf-8");
    return sortClipsByCreatedAtDesc(JSON.parse(raw) as Clip[]);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

export function getClipFileUrl(filename: string): string {
  return `/uploads/${encodeURIComponent(filename)}`;
}

export function formatClipDuration(durationMs: number): string {
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatClipCreatedAt(createdAt: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(createdAt));
}

export async function listClips(): Promise<Clip[]> {
  const clips = await readClips();
  return sortClipsByCreatedAtDesc(clips);
}

export async function getClip(id: string): Promise<Clip | null> {
  const clips = await readClips();
  return clips.find((c) => c.id === id) ?? null;
}

export async function writeClips(clips: Clip[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(
    CLIPS_FILE,
    JSON.stringify(sortClipsByCreatedAtDesc(clips), null, 2)
  );
}

export async function addClip(clip: Clip): Promise<void> {
  const clips = await readClips();
  clips.unshift(clip);
  await writeClips(clips);
}
