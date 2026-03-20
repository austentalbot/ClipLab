import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { Soundboard } from "@/lib/soundboards/types";

const mockGetSoundboards = jest.fn<Promise<Soundboard[]>, []>();

jest.mock("@/lib/soundboards/api", () => ({
  getSoundboards: (...args: []) => mockGetSoundboards(...args),
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

import SoundboardsPage from "./page";

const makeSoundboard = (overrides: Partial<Soundboard> = {}): Soundboard => ({
  id: "board-1",
  name: "Warmup",
  entries: [{ clipId: "clip-1", position: 0 }],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe("SoundboardsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows loading skeletons then renders soundboards after fetch resolves", async () => {
    mockGetSoundboards.mockResolvedValue([makeSoundboard()]);

    render(<SoundboardsPage />);

    expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(
      0
    );

    await waitFor(() => {
      expect(screen.getByText("Warmup")).toBeInTheDocument();
    });

    expect(screen.getByText("1 clip")).toBeInTheDocument();
  });

  it("shows empty state when no soundboards returned", async () => {
    mockGetSoundboards.mockResolvedValue([]);

    render(<SoundboardsPage />);

    await waitFor(() => {
      expect(screen.getByText("No soundboards yet.")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Create your first soundboard")
    ).toBeInTheDocument();
  });

  it("shows error state with retry on fetch failure", async () => {
    mockGetSoundboards.mockRejectedValueOnce(
      new Error("Failed to load soundboards")
    );

    render(<SoundboardsPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load soundboards")
      ).toBeInTheDocument();
    });

    mockGetSoundboards.mockResolvedValueOnce([makeSoundboard()]);
    await userEvent.click(screen.getByText("Try again"));

    await waitFor(() => {
      expect(screen.getByText("Warmup")).toBeInTheDocument();
    });

    expect(mockGetSoundboards).toHaveBeenCalledTimes(2);
  });
});
