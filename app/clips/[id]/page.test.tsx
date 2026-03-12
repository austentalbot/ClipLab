import { render, screen } from "@testing-library/react";

import type { Clip } from "@/lib/clips/types";

const mockGetClip = jest.fn<Promise<Clip | null>, [string]>();
const mockNotFound = jest.fn<never, []>(() => {
  throw new Error("NEXT_NOT_FOUND");
});

jest.mock("@/lib/clips/store", () => ({
  getClip: (...args: [string]) => mockGetClip(...args),
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

jest.mock("./filtered-playback", () => ({
  FilteredPlayback: () => <div data-testid="filtered-playback" />,
}));

import ClipDetailPage from "./page";

const makeClip = (overrides: Partial<Clip> = {}): Clip => ({
  id: "clip-1",
  title: "Late night idea",
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

describe("ClipDetailPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders clip metadata and visible filter params", async () => {
    mockGetClip.mockResolvedValue(makeClip());

    render(await ClipDetailPage({ params: { id: "clip-1" } }));

    expect(screen.getByText("Late night idea")).toBeInTheDocument();
    expect(screen.getByText("Playback")).toBeInTheDocument();
    expect(screen.getByText("Gain")).toBeInTheDocument();
    expect(screen.getByText("Gain: 1.5x")).toBeInTheDocument();
    expect(screen.getByTestId("filtered-playback")).toBeInTheDocument();
    expect(mockGetClip).toHaveBeenCalledWith("clip-1");
  });

  it("calls notFound when getClip returns null", async () => {
    mockGetClip.mockResolvedValue(null);

    await expect(ClipDetailPage({ params: { id: "clip-1" } })).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );
    expect(mockNotFound).toHaveBeenCalledTimes(1);
  });
});
