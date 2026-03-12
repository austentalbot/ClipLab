/**
 * @jest-environment node
 */

import { GET, POST } from "./route";

jest.mock("crypto", () => ({
  randomUUID: jest.fn(() => "clip-test-id"),
}));

const mockAddClip = jest.fn();
const mockListClips = jest.fn();

jest.mock("@/lib/clips/store", () => ({
  addClip: (...args: unknown[]) => mockAddClip(...args),
  listClips: (...args: unknown[]) => mockListClips(...args),
}));

const mockMkdir = jest.fn();
const mockRm = jest.fn();
const mockWriteFile = jest.fn();

jest.mock("fs/promises", () => ({
  mkdir: (...args: unknown[]) => mockMkdir(...args),
  rm: (...args: unknown[]) => mockRm(...args),
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
}));

describe("/api/clips route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMkdir.mockResolvedValue(undefined);
    mockRm.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockAddClip.mockResolvedValue(undefined);
    mockListClips.mockResolvedValue([]);
  });

  it("returns 400 for malformed filters metadata", async () => {
    const formData = new FormData();
    formData.append("file", new Blob(["audio"], { type: "audio/webm" }));
    formData.append("title", "My clip");
    formData.append("durationMs", "3000");
    formData.append("filters", "{bad-json");

    const request = {
      formData: async () => formData,
    } as Request;

    const response = await POST(request);

    await expect(response.json()).resolves.toEqual({
      error: "Invalid filters payload",
    });
    expect(response.status).toBe(400);
    expect(mockWriteFile).not.toHaveBeenCalled();
    expect(mockAddClip).not.toHaveBeenCalled();
  });

  it("removes the uploaded file when metadata persistence fails", async () => {
    mockAddClip.mockRejectedValue(new Error("disk full"));

    const formData = new FormData();
    formData.append("file", new Blob(["audio"], { type: "audio/webm" }));
    formData.append("title", "My clip");
    formData.append("durationMs", "3000");
    formData.append("filters", "[]");

    const request = {
      formData: async () => formData,
    } as Request;

    const response = await POST(request);

    await expect(response.json()).resolves.toEqual({
      error: "Failed to save clip",
    });
    expect(response.status).toBe(500);
    expect(mockRm).toHaveBeenCalledWith(
      expect.stringContaining("/public/uploads/clip-test-id.webm"),
      { force: true }
    );
  });

  it("returns clips from GET", async () => {
    mockListClips.mockResolvedValue([
      {
        id: "clip-2",
        title: "Second clip",
        filename: "clip-2.webm",
        durationMs: 2000,
        filters: [],
        createdAt: "2025-02-01T00:00:00.000Z",
      },
      {
        id: "clip-1",
        title: "First clip",
        filename: "clip-1.webm",
        durationMs: 1000,
        filters: [],
        createdAt: "2025-01-01T00:00:00.000Z",
      },
    ]);

    const response = await GET();

    await expect(response.json()).resolves.toEqual([
      {
        id: "clip-2",
        title: "Second clip",
        filename: "clip-2.webm",
        durationMs: 2000,
        filters: [],
        createdAt: "2025-02-01T00:00:00.000Z",
      },
      {
        id: "clip-1",
        title: "First clip",
        filename: "clip-1.webm",
        durationMs: 1000,
        filters: [],
        createdAt: "2025-01-01T00:00:00.000Z",
      },
    ]);
    expect(response.status).toBe(200);
  });

  it("returns 400 for filter with unknown type", async () => {
    const formData = new FormData();
    formData.append("file", new Blob(["audio"], { type: "audio/webm" }));
    formData.append("title", "My clip");
    formData.append("durationMs", "3000");
    formData.append(
      "filters",
      JSON.stringify([{ type: "reverb", enabled: true, params: { mix: 0.5 } }])
    );

    const request = { formData: async () => formData } as Request;
    const response = await POST(request);

    await expect(response.json()).resolves.toEqual({
      error: "Invalid filters payload",
    });
    expect(response.status).toBe(400);
  });

  it("returns 400 for filter with non-boolean enabled", async () => {
    const formData = new FormData();
    formData.append("file", new Blob(["audio"], { type: "audio/webm" }));
    formData.append("title", "My clip");
    formData.append("durationMs", "3000");
    formData.append(
      "filters",
      JSON.stringify([{ type: "gain", enabled: "yes", params: { gain: 1 } }])
    );

    const request = { formData: async () => formData } as Request;
    const response = await POST(request);

    await expect(response.json()).resolves.toEqual({
      error: "Invalid filters payload",
    });
    expect(response.status).toBe(400);
  });

  it("returns 400 for filter with missing params", async () => {
    const formData = new FormData();
    formData.append("file", new Blob(["audio"], { type: "audio/webm" }));
    formData.append("title", "My clip");
    formData.append("durationMs", "3000");
    formData.append(
      "filters",
      JSON.stringify([{ type: "gain", enabled: true, params: {} }])
    );

    const request = { formData: async () => formData } as Request;
    const response = await POST(request);

    await expect(response.json()).resolves.toEqual({
      error: "Invalid filters payload",
    });
    expect(response.status).toBe(400);
  });

  it("returns 400 when title is missing", async () => {
    const formData = new FormData();
    formData.append("file", new Blob(["audio"], { type: "audio/webm" }));
    formData.append("durationMs", "3000");
    formData.append("filters", "[]");

    const request = {
      formData: async () => formData,
    } as Request;

    const response = await POST(request);

    await expect(response.json()).resolves.toEqual({
      error: "Missing clip title",
    });
    expect(response.status).toBe(400);
  });
});
