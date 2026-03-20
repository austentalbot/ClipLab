/**
 * @jest-environment node
 */

import { GET, POST } from "./route";

jest.mock("crypto", () => ({
  randomUUID: jest.fn(() => "soundboard-test-id"),
}));

const mockAddSoundboard = jest.fn();
const mockReadSoundboards = jest.fn();

jest.mock("@/lib/soundboards/store", () => ({
  addSoundboard: (...args: unknown[]) => mockAddSoundboard(...args),
  readSoundboards: (...args: unknown[]) => mockReadSoundboards(...args),
}));

describe("/api/soundboards route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddSoundboard.mockResolvedValue(undefined);
    mockReadSoundboards.mockResolvedValue([]);
  });

  it("returns [] from GET when there are no soundboards", async () => {
    const response = await GET();

    await expect(response.json()).resolves.toEqual([]);
    expect(response.status).toBe(200);
  });

  it("returns soundboards from GET", async () => {
    mockReadSoundboards.mockResolvedValue([
      {
        id: "soundboard-2",
        name: "Later",
        entries: [{ clipId: "clip-2", position: 0 }],
        createdAt: "2025-02-01T00:00:00.000Z",
        updatedAt: "2025-02-02T00:00:00.000Z",
      },
    ]);

    const response = await GET();

    await expect(response.json()).resolves.toEqual([
      {
        id: "soundboard-2",
        name: "Later",
        entries: [{ clipId: "clip-2", position: 0 }],
        createdAt: "2025-02-01T00:00:00.000Z",
        updatedAt: "2025-02-02T00:00:00.000Z",
      },
    ]);
    expect(response.status).toBe(200);
  });

  it("returns 400 when JSON payload is invalid", async () => {
    const request = {
      json: async () => {
        throw new Error("bad json");
      },
    } as unknown as Request;

    const response = await POST(request);

    await expect(response.json()).resolves.toEqual({
      error: "Invalid soundboard payload",
    });
    expect(response.status).toBe(400);
  });

  it("returns 400 when name is missing", async () => {
    const request = {
      json: async () => ({ entries: [] }),
    } as unknown as Request;

    const response = await POST(request);

    await expect(response.json()).resolves.toEqual({
      error: "Missing soundboard name",
    });
    expect(response.status).toBe(400);
  });

  it("returns 400 when entries are malformed", async () => {
    const request = {
      json: async () => ({
        name: "Board",
        entries: [{ clipId: "clip-1", position: 2 }],
      }),
    } as unknown as Request;

    const response = await POST(request);

    await expect(response.json()).resolves.toEqual({
      error: "Invalid soundboard entries",
    });
    expect(response.status).toBe(400);
  });

  it("creates a soundboard from POST", async () => {
    const request = {
      json: async () => ({
        name: "Board",
        entries: [
          { clipId: "clip-1", position: 0 },
          { clipId: "clip-2", position: 1 },
        ],
      }),
    } as unknown as Request;

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.id).toBe("soundboard-test-id");
    expect(body.name).toBe("Board");
    expect(body.entries).toEqual([
      { clipId: "clip-1", position: 0 },
      { clipId: "clip-2", position: 1 },
    ]);
    expect(typeof body.createdAt).toBe("string");
    expect(body.updatedAt).toBe(body.createdAt);
    expect(mockAddSoundboard).toHaveBeenCalledWith(body);
  });
});
