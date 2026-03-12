/**
 * @jest-environment node
 */

import { GET } from "./route";

const mockGetClip = jest.fn();

jest.mock("@/lib/clips/store", () => ({
  getClip: (...args: unknown[]) => mockGetClip(...args),
}));

describe("/api/clips/[id] route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the requested clip", async () => {
    mockGetClip.mockResolvedValue({
      id: "clip-123",
      title: "Playback draft",
      filename: "clip-123.webm",
      durationMs: 3200,
      filters: [],
      createdAt: "2025-01-01T00:00:00.000Z",
    });

    const response = await GET({} as Request, {
      params: Promise.resolve({ id: "clip-123" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      id: "clip-123",
      title: "Playback draft",
      filename: "clip-123.webm",
      durationMs: 3200,
      filters: [],
      createdAt: "2025-01-01T00:00:00.000Z",
    });
  });

  it("returns 404 when the clip is missing", async () => {
    mockGetClip.mockResolvedValue(null);

    const response = await GET({} as Request, {
      params: Promise.resolve({ id: "missing" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Clip not found",
    });
  });
});
