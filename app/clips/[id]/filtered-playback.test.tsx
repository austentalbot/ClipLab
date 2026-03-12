import { StrictMode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { FilteredPlayback } from "./filtered-playback";

const mockResume = jest.fn();
const mockCreateMediaElementSource = jest.fn();
const mockSourceConnect = jest.fn();
const mockSourceDisconnect = jest.fn();
const mockNodeConnect = jest.fn();
const mockNodeDisconnect = jest.fn();

class FakeAudioContext {
  state: AudioContextState = "suspended";
  destination = { kind: "destination" } as unknown as AudioDestinationNode;

  createMediaElementSource() {
    mockCreateMediaElementSource();
    return {
      connect: mockSourceConnect,
      disconnect: mockSourceDisconnect,
    } as unknown as MediaElementAudioSourceNode;
  }

  createGain() {
    return {
      gain: { value: 1 },
      connect: mockNodeConnect,
      disconnect: mockNodeDisconnect,
    } as unknown as GainNode;
  }

  resume() {
    this.state = "running";
    mockResume();
    return Promise.resolve();
  }

  decodeAudioData() {
    return Promise.reject(new Error("Not supported in test"));
  }

  close() {
    return Promise.resolve();
  }
}

describe("FilteredPlayback", () => {
  const filters = [
    { type: "gain", enabled: true, params: { gain: 1.5 } },
    { type: "lowpass", enabled: false, params: { frequency: 1000, Q: 1 } },
    { type: "highpass", enabled: false, params: { frequency: 500, Q: 1 } },
    {
      type: "compressor",
      enabled: false,
      params: { threshold: -24, ratio: 4 },
    },
    { type: "delay", enabled: false, params: { time: 0.3 } },
  ] as const;

  beforeEach(() => {
    jest.clearAllMocks();
    global.AudioContext = FakeAudioContext as unknown as typeof AudioContext;
  });

  it("renders native audio controls and resumes the audio context on play", () => {
    render(
      <StrictMode>
        <FilteredPlayback filters={[...filters]} src="/uploads/test.webm" />
      </StrictMode>
    );

    const player = screen.getByLabelText("Filtered playback");
    expect(player).toHaveAttribute("src", "/uploads/test.webm");
    expect(player).toHaveAttribute(
      "controlsList",
      expect.stringContaining("nodownload")
    );
    expect(
      screen.queryByText("Play with saved filters")
    ).not.toBeInTheDocument();
    // StrictMode double-mounts; the player must reuse the existing media-element source
    expect(mockCreateMediaElementSource).toHaveBeenCalledTimes(1);

    fireEvent.play(player);

    expect(mockResume).toHaveBeenCalled();
  });

  it("skips audio graph setup when no filters are enabled", () => {
    render(
      <FilteredPlayback
        filters={filters.map((filter) => ({ ...filter, enabled: false }))}
        src="/uploads/test.webm"
      />
    );

    expect(screen.getByLabelText("Filtered playback")).toBeInTheDocument();
    expect(mockCreateMediaElementSource).not.toHaveBeenCalled();
  });

  it("keeps a bypass connection when filters are turned off after graph setup", () => {
    const { rerender } = render(
      <FilteredPlayback filters={[...filters]} src="/uploads/test.webm" />
    );

    rerender(
      <FilteredPlayback
        filters={filters.map((filter) => ({ ...filter, enabled: false }))}
        src="/uploads/test.webm"
      />
    );

    expect(mockCreateMediaElementSource).toHaveBeenCalledTimes(1);
    expect(mockSourceConnect).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: "destination" })
    );
  });

  it("does not rebuild the graph when only filter params change", () => {
    const { rerender } = render(
      <FilteredPlayback filters={[...filters]} src="/uploads/test.webm" />
    );

    const callCountAfterMount = mockCreateMediaElementSource.mock.calls.length;

    // Change only the gain param value, keep same enabled set
    const updatedFilters = filters.map((f) => ({
      ...f,
      params: { ...f.params },
    }));
    (updatedFilters[0].params as Record<string, number>).gain = 2.5;

    rerender(
      <FilteredPlayback filters={updatedFilters} src="/uploads/test.webm" />
    );

    expect(mockCreateMediaElementSource.mock.calls.length).toBe(
      callCountAfterMount
    );
  });

  it("reuses the same media element source when the clip src changes", () => {
    const { rerender } = render(
      <FilteredPlayback filters={[...filters]} src="/uploads/first.webm" />
    );

    expect(mockCreateMediaElementSource).toHaveBeenCalledTimes(1);

    rerender(
      <FilteredPlayback filters={[...filters]} src="/uploads/second.webm" />
    );

    expect(mockCreateMediaElementSource).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Filtered playback")).toHaveAttribute(
      "src",
      "/uploads/second.webm"
    );
  });

  it("resumes a new audio context when filters are enabled mid-playback", async () => {
    const disabledFilters = filters.map((filter) => ({
      ...filter,
      enabled: false,
    }));
    const { rerender } = render(
      <FilteredPlayback filters={disabledFilters} src="/uploads/test.webm" />
    );

    const player = screen.getByLabelText("Filtered playback");
    Object.defineProperty(player, "paused", {
      configurable: true,
      get: () => false,
    });

    fireEvent.play(player);
    rerender(
      <FilteredPlayback filters={[...filters]} src="/uploads/test.webm" />
    );

    await waitFor(() => {
      expect(mockResume).toHaveBeenCalledTimes(1);
    });
  });
});
