/**
 * @jest-environment node
 */

import { GET, PUT } from "./route";

const mockGetSoundboard = jest.fn();
const mockUpdateSoundboard = jest.fn();

jest.mock("@/lib/soundboards/store", () => ({
  getSoundboard: (...args: unknown[]) => mockGetSoundboard(...args),
  updateSoundboard: (...args: unknown[]) => mockUpdateSoundboard(...args),
}));

describe("/api/soundboards/[id] route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateSoundboard.mockResolvedValue(undefined);
  });

  it("returns 404 from GET when soundboard is missing", async () => {
    mockGetSoundboard.mockResolvedValue(null);

    const response = await GET({} as Request, {
      params: { id: "missing" },
    });

    await expect(response.json()).resolves.toEqual({
      error: "Soundboard not found",
    });
    expect(response.status).toBe(404);
  });

  it("returns a soundboard from GET", async () => {
    mockGetSoundboard.mockResolvedValue({
      id: "board-1",
      name: "Board",
      entries: [{ clipId: "clip-1", position: 0 }],
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-02T00:00:00.000Z",
    });

    const response = await GET({} as Request, {
      params: { id: "board-1" },
    });

    await expect(response.json()).resolves.toEqual({
      id: "board-1",
      name: "Board",
      entries: [{ clipId: "clip-1", position: 0 }],
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-02T00:00:00.000Z",
    });
    expect(response.status).toBe(200);
  });

  it("returns 400 from PUT when JSON payload is invalid", async () => {
    const request = {
      json: async () => {
        throw new Error("bad json");
      },
    } as unknown as Request;

    const response = await PUT(request, { params: { id: "board-1" } });

    await expect(response.json()).resolves.toEqual({
      error: "Invalid soundboard payload",
    });
    expect(response.status).toBe(400);
  });

  it("returns 404 from PUT when soundboard is missing", async () => {
    mockGetSoundboard.mockResolvedValue(null);

    const request = {
      json: async () => ({ name: "Board", entries: [] }),
    } as unknown as Request;

    const response = await PUT(request, { params: { id: "missing" } });

    await expect(response.json()).resolves.toEqual({
      error: "Soundboard not found",
    });
    expect(response.status).toBe(404);
  });

  it("returns 400 from PUT when entries are malformed", async () => {
    const request = {
      json: async () => ({
        name: "Board",
        entries: [{ clipId: "clip-1", position: 4 }],
      }),
    } as unknown as Request;

    const response = await PUT(request, { params: { id: "board-1" } });

    await expect(response.json()).resolves.toEqual({
      error: "Invalid soundboard entries",
    });
    expect(response.status).toBe(400);
  });

  it("updates a soundboard from PUT", async () => {
    mockGetSoundboard.mockResolvedValue({
      id: "board-1",
      name: "Old name",
      entries: [{ clipId: "clip-1", position: 0 }],
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-02T00:00:00.000Z",
    });

    const request = {
      json: async () => ({
        name: "New name",
        entries: [
          { clipId: "clip-2", position: 0 },
          { clipId: "clip-3", position: 1 },
        ],
      }),
    } as unknown as Request;

    const response = await PUT(request, { params: { id: "board-1" } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe("board-1");
    expect(body.name).toBe("New name");
    expect(body.createdAt).toBe("2025-01-01T00:00:00.000Z");
    expect(body.entries).toEqual([
      { clipId: "clip-2", position: 0 },
      { clipId: "clip-3", position: 1 },
    ]);
    expect(typeof body.updatedAt).toBe("string");
    expect(body.updatedAt).not.toBe("2025-01-02T00:00:00.000Z");
    expect(mockUpdateSoundboard).toHaveBeenCalledWith(body);
  });
});
