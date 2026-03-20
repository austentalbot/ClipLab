import { render, screen } from "@testing-library/react";

import type { Clip } from "@/lib/clips/types";
import type { Soundboard } from "@/lib/soundboards/types";

const mockGetSoundboard = jest.fn<Promise<Soundboard | null>, [string]>();
const mockReadClips = jest.fn<Promise<Clip[]>, []>();
const mockNotFound = jest.fn<never, []>(() => {
  throw new Error("NEXT_NOT_FOUND");
});

jest.mock("@/lib/soundboards/store", () => ({
  getSoundboard: (...args: [string]) => mockGetSoundboard(...args),
}));

jest.mock("@/lib/clips/store", () => ({
  readClips: (...args: []) => mockReadClips(...args),
}));

jest.mock("@/lib/clips/urls", () => ({
  getClipFileUrl: (filename: string) =>
    `/uploads/${encodeURIComponent(filename)}`,
}));

jest.mock("next/navigation", () => ({
  notFound: () => mockNotFound(),
}));

jest.mock("next/link", () => {
  return function MockLink({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return <a href={href}>{children}</a>;
  };
});

jest.mock("@/components/soundboards/soundboard-player", () => ({
  SoundboardPlayer: ({ clips }: { clips: unknown[] }) => (
    <div data-testid="soundboard-player">{JSON.stringify(clips)}</div>
  ),
}));

import SoundboardDetailPage from "./page";

const makeClip = (overrides: Partial<Clip> = {}): Clip => ({
  id: "clip-1",
  title: "Warm intro",
  filename: "rec-1.webm",
  durationMs: 12000,
  createdAt: "2025-03-05T10:30:00.000Z",
  filters: [
    { type: "gain", enabled: true, params: { gain: 1.5 } },
    { type: "lowpass", enabled: false, params: { frequency: 1000, Q: 1 } },
    { type: "highpass", enabled: false, params: { frequency: 500, Q: 1 } },
    {
      type: "compressor",
      enabled: false,
      params: { threshold: -24, ratio: 4 },
    },
    { type: "delay", enabled: false, params: { time: 0.3 } },
  ],
  ...overrides,
});

const makeSoundboard = (overrides: Partial<Soundboard> = {}): Soundboard => ({
  id: "board-1",
  name: "Morning set",
  entries: [
    { clipId: "clip-2", position: 1 },
    { clipId: "clip-1", position: 0 },
  ],
  createdAt: "2025-03-05T10:30:00.000Z",
  updatedAt: "2025-03-05T11:00:00.000Z",
  ...overrides,
});

describe("SoundboardDetailPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders soundboard metadata and resolved clips in position order", async () => {
    mockGetSoundboard.mockResolvedValue(makeSoundboard());
    mockReadClips.mockResolvedValue([
      makeClip({ id: "clip-1", title: "Warm intro" }),
      makeClip({ id: "clip-2", title: "Second pass" }),
    ]);

    render(await SoundboardDetailPage({ params: { id: "board-1" } }));

    expect(screen.getByText("Morning set")).toBeInTheDocument();
    expect(screen.getByText("About this soundboard")).toBeInTheDocument();
    expect(screen.getByTestId("soundboard-player")).toHaveTextContent(
      '"title":"Warm intro"'
    );
    expect(screen.getByTestId("soundboard-player")).toHaveTextContent(
      '"title":"Second pass"'
    );
    expect(mockGetSoundboard).toHaveBeenCalledWith("board-1");
    expect(mockReadClips).toHaveBeenCalledTimes(1);
  });

  it("shows unavailable clip entries separately and skips them in playback", async () => {
    mockGetSoundboard.mockResolvedValue(
      makeSoundboard({
        entries: [
          { clipId: "clip-1", position: 0 },
          { clipId: "missing-clip", position: 1 },
        ],
      })
    );
    mockReadClips.mockResolvedValue([
      makeClip({ id: "clip-1", title: "Warm intro" }),
    ]);

    render(await SoundboardDetailPage({ params: { id: "board-1" } }));

    expect(screen.getByText("Unavailable clips")).toBeInTheDocument();
    expect(screen.getByText("Clip unavailable")).toBeInTheDocument();
    expect(screen.getByTestId("soundboard-player")).toHaveTextContent(
      '"title":"Warm intro"'
    );
    expect(screen.getByTestId("soundboard-player")).not.toHaveTextContent(
      "missing-clip"
    );
  });

  it("calls notFound when the soundboard is missing", async () => {
    mockGetSoundboard.mockResolvedValue(null);

    await expect(
      SoundboardDetailPage({ params: { id: "board-1" } })
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockNotFound).toHaveBeenCalledTimes(1);
  });
});
