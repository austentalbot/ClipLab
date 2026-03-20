import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { FilterConfig } from "@/lib/audio/filter-registry";

const mockFilteredAudioPlayer = jest.fn();

jest.mock("@/components/clips/filtered-audio-player", () => ({
  FilteredAudioPlayer: (props: {
    autoPlay?: boolean;
    filters: FilterConfig[];
    onEnded?: () => void;
    onPlaybackChange?: (isPlaying: boolean) => void;
    src: string;
  }) => {
    mockFilteredAudioPlayer(props);

    return (
      <div>
        <div data-testid="mock-player">{props.src}</div>
        <button onClick={() => props.onPlaybackChange?.(true)}>
          emit-play
        </button>
        <button onClick={() => props.onPlaybackChange?.(false)}>
          emit-pause
        </button>
        <button onClick={() => props.onEnded?.()}>emit-ended</button>
      </div>
    );
  },
}));

import {
  SoundboardPlayer,
  type SoundboardResolvedClip,
} from "./soundboard-player";

const filters: FilterConfig[] = [
  { type: "gain", enabled: true, params: { gain: 1.5 } },
  { type: "lowpass", enabled: false, params: { frequency: 1000, Q: 1 } },
  { type: "highpass", enabled: false, params: { frequency: 500, Q: 1 } },
  {
    type: "compressor",
    enabled: false,
    params: { threshold: -24, ratio: 4 },
  },
  { type: "delay", enabled: false, params: { time: 0.3 } },
];

const makeClip = (
  overrides: Partial<SoundboardResolvedClip> = {}
): SoundboardResolvedClip => ({
  id: "clip-1",
  title: "Warm intro",
  durationMs: 12000,
  filters,
  src: "/uploads/clip-1.webm",
  ...overrides,
});

describe("SoundboardPlayer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("starts playback from the first clip when play all is clicked", async () => {
    render(
      <SoundboardPlayer
        clips={[
          makeClip(),
          makeClip({
            id: "clip-2",
            title: "Second pass",
            durationMs: 4000,
            src: "/uploads/clip-2.webm",
          }),
        ]}
      />
    );

    await userEvent.click(screen.getByText("Play all"));

    expect(mockFilteredAudioPlayer.mock.lastCall?.[0]).toEqual(
      expect.objectContaining({
        autoPlay: true,
        src: "/uploads/clip-1.webm",
      })
    );
    expect(screen.getByText("Now playing: Warm intro")).toBeInTheDocument();
  });

  it("advances to the next clip when the current clip ends", async () => {
    render(
      <SoundboardPlayer
        clips={[
          makeClip(),
          makeClip({
            id: "clip-2",
            title: "Second pass",
            durationMs: 4000,
            src: "/uploads/clip-2.webm",
          }),
        ]}
      />
    );

    await userEvent.click(screen.getByText("Play all"));
    await userEvent.click(screen.getByText("emit-ended"));

    expect(screen.getByText("Now playing: Second pass")).toBeInTheDocument();
    expect(mockFilteredAudioPlayer.mock.lastCall?.[0]).toEqual(
      expect.objectContaining({
        autoPlay: true,
        src: "/uploads/clip-2.webm",
      })
    );
  });

  it("treats manual playback as an active sequence for auto-advance", async () => {
    render(
      <SoundboardPlayer
        clips={[
          makeClip(),
          makeClip({
            id: "clip-2",
            title: "Second pass",
            durationMs: 4000,
            src: "/uploads/clip-2.webm",
          }),
        ]}
      />
    );

    await userEvent.click(screen.getByText("emit-play"));
    await userEvent.click(screen.getByText("emit-ended"));

    expect(screen.getByText("Now playing: Second pass")).toBeInTheDocument();
    expect(mockFilteredAudioPlayer.mock.lastCall?.[0]).toEqual(
      expect.objectContaining({
        autoPlay: true,
        src: "/uploads/clip-2.webm",
      })
    );
  });

  it("stops at the end of the sequence", async () => {
    render(<SoundboardPlayer clips={[makeClip()]} />);

    await userEvent.click(screen.getByText("Play all"));
    await userEvent.click(screen.getByText("emit-ended"));

    expect(screen.getByText("Ready")).toBeInTheDocument();
  });
});
