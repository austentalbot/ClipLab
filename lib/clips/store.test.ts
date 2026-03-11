import { readClips, writeClips, addClip, getClip, listClips } from "./store";
import type { Clip } from "./types";

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

function makeClip(overrides: Partial<Clip> = {}): Clip {
  return {
    id: "clip-1",
    filename: "clip-1.webm",
    durationMs: 5000,
    filters: [],
    createdAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("clip store", () => {
  beforeEach(() => {
    fs.__reset();
  });

  it("readClips returns [] when file does not exist", async () => {
    const clips = await readClips();
    expect(clips).toEqual([]);
  });

  it("readClips throws when the metadata file is corrupted", async () => {
    await writeClips([makeClip()]);
    const store = fs.__getStore();
    const clipsFile = Object.keys(store)[0];
    store[clipsFile] = "{not-json";

    await expect(readClips()).rejects.toThrow();
  });

  it("addClip creates the file and writes the clip", async () => {
    const clip = makeClip();
    await addClip(clip);

    const clips = await readClips();
    expect(clips).toEqual([clip]);
  });

  it("addClip prepends to existing clips", async () => {
    const first = makeClip({ id: "clip-1" });
    const second = makeClip({ id: "clip-2" });

    await addClip(first);
    await addClip(second);

    const clips = await readClips();
    expect(clips[0].id).toBe("clip-2");
    expect(clips[1].id).toBe("clip-1");
  });

  it("listClips returns clips sorted by createdAt desc", async () => {
    await writeClips([
      makeClip({ id: "oldest", createdAt: "2025-01-01T00:00:00.000Z" }),
      makeClip({ id: "newest", createdAt: "2025-03-01T00:00:00.000Z" }),
      makeClip({ id: "middle", createdAt: "2025-02-01T00:00:00.000Z" }),
    ]);

    const clips = await listClips();
    expect(clips.map((clip) => clip.id)).toEqual([
      "newest",
      "middle",
      "oldest",
    ]);
  });

  it("getClip finds by ID", async () => {
    await addClip(makeClip({ id: "target" }));
    await addClip(makeClip({ id: "other" }));

    const clip = await getClip("target");
    expect(clip).not.toBeNull();
    expect(clip!.id).toBe("target");
  });

  it("getClip returns null for missing ID", async () => {
    await addClip(makeClip({ id: "exists" }));
    const clip = await getClip("nope");
    expect(clip).toBeNull();
  });

  it("writeClips overwrites existing data", async () => {
    await addClip(makeClip({ id: "old" }));
    await writeClips([makeClip({ id: "new" })]);

    const clips = await readClips();
    expect(clips).toHaveLength(1);
    expect(clips[0].id).toBe("new");
  });
});
