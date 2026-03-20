import type { Soundboard, SoundboardEntry } from "./types";

type SoundboardPayload = {
  name: string;
  entries: SoundboardEntry[];
};

async function readJsonOrNull(response: Response) {
  return response.json().catch(() => null) as Promise<{
    error?: string;
  } | null>;
}

export async function getSoundboards(): Promise<Soundboard[]> {
  const response = await fetch("/api/soundboards");

  if (!response.ok) {
    throw new Error("Failed to load soundboards");
  }

  return response.json();
}

export async function getSoundboardById(id: string): Promise<Soundboard> {
  const response = await fetch(`/api/soundboards/${id}`);

  if (!response.ok) {
    const body = await readJsonOrNull(response);
    throw new Error(body?.error ?? "Failed to load soundboard");
  }

  return response.json();
}

export async function createSoundboard(
  payload: SoundboardPayload
): Promise<Soundboard> {
  const response = await fetch("/api/soundboards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await readJsonOrNull(response);
    throw new Error(body?.error ?? "Failed to create soundboard");
  }

  return response.json();
}

export async function updateSoundboardApi(
  id: string,
  payload: SoundboardPayload
): Promise<Soundboard> {
  const response = await fetch(`/api/soundboards/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await readJsonOrNull(response);
    throw new Error(body?.error ?? "Failed to update soundboard");
  }

  return response.json();
}
