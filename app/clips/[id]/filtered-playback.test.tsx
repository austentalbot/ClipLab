import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { FilteredPlayback } from "./filtered-playback";

const audioEngineState = {
  isPlaying: false,
  preview: jest.fn(),
  stop: jest.fn(),
  syncFilters: jest.fn(),
  decodeBlob: jest.fn(),
};

jest.mock("@/lib/audio/use-audio-engine", () => ({
  useAudioEngine: () => audioEngineState,
}));

describe("FilteredPlayback", () => {
  const filters = [
    { type: "gain", enabled: true, params: { gain: 1.5 } },
    { type: "lowpass", enabled: false, params: { frequency: 1000, Q: 1 } },
    { type: "highpass", enabled: false, params: { frequency: 500, Q: 1 } },
    { type: "delay", enabled: false, params: { time: 0.3 } },
  ] as const;

  beforeEach(() => {
    jest.clearAllMocks();
    audioEngineState.isPlaying = false;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(["saved-audio"], { type: "audio/webm" }),
    }) as jest.Mock;
  });

  it("loads the saved audio file and previews it with the stored filters", async () => {
    render(
      <FilteredPlayback filters={[...filters]} src="/uploads/test.webm" />
    );

    await waitFor(() => {
      expect(screen.getByText("Play filtered clip")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("Play filtered clip"));

    await waitFor(() => {
      expect(audioEngineState.preview).toHaveBeenCalledTimes(1);
    });
    expect(audioEngineState.preview.mock.calls[0][1]).toEqual(filters);
    expect(global.fetch).toHaveBeenCalledWith("/uploads/test.webm");
  });
});
