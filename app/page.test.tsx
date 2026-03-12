import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RecorderStatus } from "./record-page-state";
import RecordPage from "./page";

const mockReplace = jest.fn();

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

jest.mock("@/lib/audio/useRecorder", () => ({
  useRecorder: () => recorderState,
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
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
    mockUploadClip.mockReset();
  });

  it("shows an awaiting permission badge while microphone access is pending", () => {
    recorderState.status = "requesting-permission";

    render(<RecordPage />);

    expect(screen.getByText("Allow mic")).toBeInTheDocument();
    expect(screen.getByText("Allow microphone access.")).toBeInTheDocument();
    expect(screen.queryByText("Recording")).not.toBeInTheDocument();
  });

  it("shows previewing state while the preview player is active", () => {
    setRecorded();

    render(<RecordPage />);

    const player = screen.getByLabelText("Clip preview");
    fireEvent.play(player);

    expect(screen.getByText("Previewing")).toBeInTheDocument();
    expect(screen.getByLabelText("Filter controls")).toBeInTheDocument();
    expect(player).toBeInTheDocument();
  });

  it("shows title input and save action in recorded state", async () => {
    setRecorded();
    render(<RecordPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue(/Clip from/)).toBeInTheDocument();
    });

    expect(screen.getByLabelText("Clip title")).toBeInTheDocument();
    expect(screen.getByText("Save clip")).toBeInTheDocument();
  });

  it("keeps an edited title across preview-state rerenders", async () => {
    setRecorded();
    render(<RecordPage />);

    const titleInput = await screen.findByLabelText("Clip title");
    await waitFor(() => {
      expect((titleInput as HTMLInputElement).value).toMatch(/Clip from/);
    });

    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "Morning memo");

    fireEvent.play(screen.getByLabelText("Clip preview"));

    expect(screen.getByLabelText("Clip title")).toHaveValue("Morning memo");
  });

  it("shows loading state while uploading and only navigates after success", async () => {
    setRecorded();
    let resolveUpload: ((value: { id: string }) => void) | undefined;
    mockUploadClip.mockReturnValue(
      new Promise<{ id: string }>((resolve) => {
        resolveUpload = resolve;
      })
    );
    render(<RecordPage />);

    const titleInput = await screen.findByLabelText("Clip title");
    const player = screen.getByLabelText("Clip preview");
    const startOverButton = screen.getByText("Start over");
    await userEvent.click(screen.getByText("Save clip"));

    expect(screen.getByText("Saving clip...")).toBeInTheDocument();
    expect(screen.getByText("Saving clip...")).toBeDisabled();
    expect(titleInput).toBeDisabled();
    expect(startOverButton).toBeDisabled();
    expect(player).toHaveClass("pointer-events-none");
    expect(mockReplace).not.toHaveBeenCalled();

    resolveUpload?.({ id: "abc-123" });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/clips/abc-123");
    });
  });

  it("submits the chosen title and shows success state after upload", async () => {
    setRecorded();
    mockUploadClip.mockResolvedValue({ id: "abc-123" });
    render(<RecordPage />);

    const titleInput = await screen.findByLabelText("Clip title");
    await waitFor(() => {
      expect((titleInput as HTMLInputElement).value).toMatch(/Clip from/);
    });
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "Morning memo");
    await userEvent.click(screen.getByText("Save clip"));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/clips/abc-123");
    });
    expect(mockUploadClip).toHaveBeenCalledWith(
      expect.any(Blob),
      "Morning memo",
      3000,
      expect.any(Array)
    );
    expect(screen.queryByText("Saved to your clips.")).not.toBeInTheDocument();
  });

  it("shows upload errors inline and lets the user try saving again", async () => {
    setRecorded();
    mockUploadClip
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({ id: "retry-123" });
    render(<RecordPage />);

    await userEvent.click(screen.getByText("Save clip"));

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Clip preview")).toBeInTheDocument();

    await userEvent.click(screen.getByText("Save clip"));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/clips/retry-123");
    });
  });
});
