import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { Clip } from "@/lib/clips/types";

const mockGetClips = jest.fn<Promise<Clip[]>, []>();
const mockCreateSoundboard = jest.fn();
const mockReplace = jest.fn();

jest.mock("@/lib/clips/api", () => ({
  getClips: (...args: []) => mockGetClips(...args),
}));

jest.mock("@/lib/soundboards/api", () => ({
  createSoundboard: (...args: unknown[]) => mockCreateSoundboard(...args),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
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

import NewSoundboardPage from "./page";

const makeClip = (overrides: Partial<Clip> = {}): Clip => ({
  id: "clip-1",
  title: "Warm intro",
  filename: "rec-1.webm",
  durationMs: 12000,
  createdAt: new Date().toISOString(),
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

describe("NewSoundboardPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetClips.mockResolvedValue([
      makeClip(),
      makeClip({ id: "clip-2", title: "Second pass", durationMs: 4000 }),
    ]);
    mockCreateSoundboard.mockResolvedValue({
      id: "board-1",
      name: "My board",
      entries: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  it("adds clips, reorders them, and saves the soundboard", async () => {
    render(<NewSoundboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Warm intro")).toBeInTheDocument();
    });

    await userEvent.type(screen.getByLabelText("Soundboard name"), "My board");
    await userEvent.click(screen.getAllByText("Add")[0]);
    await userEvent.click(screen.getAllByText("Add")[1]);

    expect(screen.getByText("Preview")).toBeInTheDocument();
    expect(screen.getByText("Now playing: Warm intro")).toBeInTheDocument();

    await userEvent.click(screen.getAllByText("Up")[1]);

    expect(screen.getByText("Now playing: Second pass")).toBeInTheDocument();

    await userEvent.click(screen.getByText("Save soundboard"));

    await waitFor(() => {
      expect(mockCreateSoundboard).toHaveBeenCalledWith({
        name: "My board",
        entries: [
          { clipId: "clip-2", position: 0 },
          { clipId: "clip-1", position: 1 },
        ],
      });
    });

    expect(mockReplace).toHaveBeenCalledWith("/soundboards");
  });

  it("filters clips by search query", async () => {
    render(<NewSoundboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Warm intro")).toBeInTheDocument();
    });

    await userEvent.type(
      screen.getByPlaceholderText("Search clips by title"),
      "second"
    );

    expect(screen.queryByText("Warm intro")).not.toBeInTheDocument();
    expect(screen.getByText("Second pass")).toBeInTheDocument();
  });

  it("shows save error when creation fails", async () => {
    mockCreateSoundboard.mockRejectedValueOnce(
      new Error("Failed to create soundboard")
    );

    render(<NewSoundboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Warm intro")).toBeInTheDocument();
    });

    await userEvent.type(screen.getByLabelText("Soundboard name"), "My board");
    await userEvent.click(screen.getAllByText("Add")[0]);
    await userEvent.click(screen.getByText("Save soundboard"));

    await waitFor(() => {
      expect(
        screen.getByText("Failed to create soundboard")
      ).toBeInTheDocument();
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });
});
