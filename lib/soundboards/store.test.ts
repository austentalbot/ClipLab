import {
  addSoundboard,
  getSoundboard,
  readSoundboards,
  updateSoundboard,
  writeSoundboards,
} from "./store";
import type { Soundboard } from "./types";

jest.mock("fs/promises", () => {
  let store: Record<string, string> = {};
  return {
    readFile: jest.fn(async (p: string) => {
      if (store[p] !== undefined) return store[p];
      const err = new Error("ENOENT") as NodeJS.ErrnoException;
      err.code = "ENOENT";
      throw err;
    }),
    writeFile: jest.fn(async (p: string, data: string) => {
      store[p] = data;
    }),
    mkdir: jest.fn(async () => undefined),
    __reset: () => {
      store = {};
    },
    __getStore: () => store,
  };
});

const fs = jest.requireMock("fs/promises") as {
  __reset: () => void;
  __getStore: () => Record<string, string>;
};

function makeSoundboard(overrides: Partial<Soundboard> = {}): Soundboard {
  return {
    id: "soundboard-1",
    name: "Morning queue",
    entries: [{ clipId: "clip-1", position: 0 }],
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("soundboard store", () => {
  beforeEach(() => {
    fs.__reset();
  });

  it("readSoundboards returns [] when file does not exist", async () => {
    const soundboards = await readSoundboards();
    expect(soundboards).toEqual([]);
  });

  it("readSoundboards throws when the metadata file is corrupted", async () => {
    await writeSoundboards([makeSoundboard()]);
    const store = fs.__getStore();
    const soundboardsFile = Object.keys(store)[0];
    store[soundboardsFile] = "{not-json";

    await expect(readSoundboards()).rejects.toThrow();
  });

  it("addSoundboard creates the file and writes the soundboard", async () => {
    const soundboard = makeSoundboard();
    await addSoundboard(soundboard);

    const soundboards = await readSoundboards();
    expect(soundboards).toEqual([soundboard]);
  });

  it("readSoundboards returns soundboards sorted by updatedAt desc", async () => {
    await writeSoundboards([
      makeSoundboard({ id: "oldest", updatedAt: "2025-01-01T00:00:00.000Z" }),
      makeSoundboard({ id: "newest", updatedAt: "2025-03-01T00:00:00.000Z" }),
      makeSoundboard({ id: "middle", updatedAt: "2025-02-01T00:00:00.000Z" }),
    ]);

    const soundboards = await readSoundboards();
    expect(soundboards.map((soundboard) => soundboard.id)).toEqual([
      "newest",
      "middle",
      "oldest",
    ]);
  });

  it("getSoundboard finds by ID", async () => {
    await addSoundboard(makeSoundboard({ id: "target" }));
    await addSoundboard(makeSoundboard({ id: "other" }));

    const soundboard = await getSoundboard("target");
    expect(soundboard).not.toBeNull();
    expect(soundboard!.id).toBe("target");
  });

  it("getSoundboard returns null for missing ID", async () => {
    await addSoundboard(makeSoundboard({ id: "exists" }));
    const soundboard = await getSoundboard("nope");
    expect(soundboard).toBeNull();
  });

  it("updateSoundboard overwrites an existing soundboard", async () => {
    await addSoundboard(makeSoundboard({ id: "target", name: "Old name" }));

    await updateSoundboard(
      makeSoundboard({
        id: "target",
        name: "New name",
        updatedAt: "2025-04-01T00:00:00.000Z",
      })
    );

    const soundboards = await readSoundboards();
    expect(soundboards).toHaveLength(1);
    expect(soundboards[0].name).toBe("New name");
    expect(soundboards[0].updatedAt).toBe("2025-04-01T00:00:00.000Z");
  });

  it("updateSoundboard throws when the soundboard is missing", async () => {
    await expect(updateSoundboard(makeSoundboard())).rejects.toThrow(
      "Soundboard not found: soundboard-1"
    );
  });
});
