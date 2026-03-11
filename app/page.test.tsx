import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

const mockUploadClip = jest.fn();
jest.mock("@/lib/clips/api", () => ({
  uploadClip: (...args: unknown[]) => mockUploadClip(...args),
}));

describe("RecordPage", () => {
  function setRecorded() {
    recorderState.status = "recorded";
    recorderState.durationMs = 3_000;
    recorderState.blobUrl = "blob:preview";
    recorderState.blob = new Blob(["audio"], { type: "audio/webm" });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    recorderState.status = "idle";
    recorderState.durationMs = 0;
    recorderState.blobUrl = null;
    recorderState.blob = null;
    recorderState.error = null;
    audioEngineState.isPlaying = false;
    mockUploadClip.mockReset();
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
    setRecorded();
    audioEngineState.isPlaying = true;

    render(<RecordPage />);

    expect(screen.getByText("Previewing")).toBeInTheDocument();
    expect(screen.getByLabelText("Filter controls")).toBeInTheDocument();
    expect(screen.getByLabelText("Playback controls")).toBeInTheDocument();
    expect(screen.getByText("Stop Preview")).toBeInTheDocument();
  });

  it("shows Save Clip button in recorded state", () => {
    setRecorded();
    render(<RecordPage />);
    expect(screen.getByText("Save Clip")).toBeInTheDocument();
  });

  it("shows loading state while uploading", async () => {
    setRecorded();
    // Never resolves during the test
    mockUploadClip.mockReturnValue(new Promise(() => {}));
    render(<RecordPage />);

    await userEvent.click(screen.getByText("Save Clip"));

    expect(screen.getByText("Saving…")).toBeInTheDocument();
    expect(screen.getByText("Saving…")).toBeDisabled();
  });

  it("shows success message and link after upload", async () => {
    setRecorded();
    mockUploadClip.mockResolvedValue({ id: "abc-123" });
    render(<RecordPage />);

    await userEvent.click(screen.getByText("Save Clip"));

    await waitFor(() => {
      expect(screen.getByText("Clip saved!")).toBeInTheDocument();
    });
    const link = screen.getByText("View clip");
    expect(link).toHaveAttribute("href", "/clips/abc-123");
  });

  it("shows error and retry on upload failure", async () => {
    setRecorded();
    mockUploadClip
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({ id: "retry-123" });
    render(<RecordPage />);

    await userEvent.click(screen.getByText("Save Clip"));

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Playback controls")).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();

    await userEvent.click(screen.getByText("Retry"));

    await waitFor(() => {
      expect(screen.getByText("Clip saved!")).toBeInTheDocument();
    });
  });
});
