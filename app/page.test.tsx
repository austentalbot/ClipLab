import { render, screen } from "@testing-library/react";
import type { RecorderStatus } from "./record-page-state";
import RecordPage from "./page";

const recorderState = {
  status: "idle" as RecorderStatus,
  durationMs: 0,
  blobUrl: null as string | null,
  blob: null as Blob | null,
  error: null as string | null,
  startRecording: jest.fn(),
  stopRecording: jest.fn(),
  reset: jest.fn(),
};

const audioEngineState = {
  isPlaying: false,
  preview: jest.fn(),
  stop: jest.fn(),
  syncFilters: jest.fn().mockResolvedValue(undefined),
};

jest.mock("@/lib/audio/useRecorder", () => ({
  useRecorder: () => recorderState,
}));

jest.mock("@/lib/audio/use-audio-engine", () => ({
  useAudioEngine: () => audioEngineState,
}));

describe("RecordPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    recorderState.status = "idle";
    recorderState.durationMs = 0;
    recorderState.blobUrl = null;
    recorderState.blob = null;
    recorderState.error = null;
    audioEngineState.isPlaying = false;
  });

  it("shows an awaiting permission badge while microphone access is pending", () => {
    recorderState.status = "requesting-permission";

    render(<RecordPage />);

    expect(screen.getByText("Awaiting Permission")).toBeInTheDocument();
    expect(
      screen.getByText("Requesting microphone access…")
    ).toBeInTheDocument();
    expect(screen.queryByText("Recording")).not.toBeInTheDocument();
  });

  it("shows previewing state and recorded sections while preview is active", () => {
    recorderState.status = "recorded";
    recorderState.durationMs = 3_000;
    recorderState.blobUrl = "blob:preview";
    recorderState.blob = new Blob(["audio"], { type: "audio/webm" });
    audioEngineState.isPlaying = true;

    render(<RecordPage />);

    expect(screen.getByText("Previewing")).toBeInTheDocument();
    expect(screen.getByLabelText("Filter controls")).toBeInTheDocument();
    expect(screen.getByLabelText("Playback controls")).toBeInTheDocument();
    expect(screen.getByText("Stop Preview")).toBeInTheDocument();
  });
});
