import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { Clip } from "@/lib/clips/types";
import type { Soundboard } from "@/lib/soundboards/types";

const mockGetClips = jest.fn<Promise<Clip[]>, []>();
const mockGetSoundboardById = jest.fn<Promise<Soundboard>, [string]>();
const mockUpdateSoundboardApi = jest.fn();
const mockReplace = jest.fn();
const mockRefresh = jest.fn();

jest.mock("@/lib/clips/api", () => ({
  getClips: (...args: []) => mockGetClips(...args),
}));

jest.mock("@/lib/soundboards/api", () => ({
  getSoundboardById: (...args: [string]) => mockGetSoundboardById(...args),
  updateSoundboardApi: (...args: unknown[]) => mockUpdateSoundboardApi(...args),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    refresh: mockRefresh,
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

import EditSoundboardPage from "./page";

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

const makeSoundboard = (overrides: Partial<Soundboard> = {}): Soundboard => ({
  id: "board-1",
  name: "Morning set",
  entries: [
    { clipId: "clip-1", position: 0 },
    { clipId: "missing-clip", position: 1 },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe("EditSoundboardPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSoundboardById.mockResolvedValue(makeSoundboard());
    mockGetClips.mockResolvedValue([makeClip()]);
    mockUpdateSoundboardApi.mockResolvedValue({
      id: "board-1",
      name: "Updated set",
      entries: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  it("prepopulates the editor and preserves unavailable clips until save", async () => {
    render(<EditSoundboardPage params={{ id: "board-1" }} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Morning set")).toBeInTheDocument();
    });

    expect(screen.getAllByText("Clip unavailable").length).toBeGreaterThan(0);

    await userEvent.clear(screen.getByLabelText("Soundboard name"));
    await userEvent.type(
      screen.getByLabelText("Soundboard name"),
      "Updated set"
    );
    await userEvent.click(screen.getByText("Save changes"));

    await waitFor(() => {
      expect(mockUpdateSoundboardApi).toHaveBeenCalledWith("board-1", {
        name: "Updated set",
        entries: [
          { clipId: "clip-1", position: 0 },
          { clipId: "missing-clip", position: 1 },
        ],
      });
    });

    expect(mockReplace).toHaveBeenCalledWith("/soundboards/board-1");
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });
});
