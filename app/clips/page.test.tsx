import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { Clip } from "@/lib/clips/types";

const mockGetClips = jest.fn<Promise<Clip[]>, []>();

jest.mock("@/lib/clips/api", () => ({
  getClips: (...args: []) => mockGetClips(...args),
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

import ClipsPage from "./page";

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
    { type: "delay", enabled: false, params: { time: 0.3 } },
  ],
  ...overrides,
});

describe("ClipsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows loading skeletons then renders clip cards after fetch resolves", async () => {
    mockGetClips.mockResolvedValue([makeClip()]);

    render(<ClipsPage />);

    // Loading state shows skeleton pulse elements
    const pulses = document.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBeGreaterThan(0);

    // After fetch resolves, clip card appears
    await waitFor(() => {
      expect(screen.getByText("0:12")).toBeInTheDocument();
    });

    expect(screen.getByText("Warm intro")).toBeInTheDocument();
    expect(screen.getByText("Gain")).toBeInTheDocument();
  });

  it("shows empty state when no clips returned", async () => {
    mockGetClips.mockResolvedValue([]);

    render(<ClipsPage />);

    await waitFor(() => {
      expect(screen.getByText("No clips yet.")).toBeInTheDocument();
    });

    expect(screen.getByText("Record your first clip")).toBeInTheDocument();
  });

  it("shows error message with retry on fetch failure", async () => {
    mockGetClips.mockRejectedValueOnce(new Error("Failed to load clips"));

    render(<ClipsPage />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load clips")).toBeInTheDocument();
    });

    // Retry
    mockGetClips.mockResolvedValueOnce([makeClip()]);
    await userEvent.click(screen.getByText("Try again"));

    await waitFor(() => {
      expect(screen.getByText("0:12")).toBeInTheDocument();
    });

    expect(mockGetClips).toHaveBeenCalledTimes(2);
  });
});
