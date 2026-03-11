"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";

// ── State machine ──────────────────────────────────────────────

type Status =
  | "idle"
  | "requesting-permission"
  | "recording"
  | "recorded"
  | "error";

type State = {
  status: Status;
  durationMs: number;
  blobUrl: string | null;
  blob: Blob | null;
  error: string | null;
};

type Action =
  | { type: "REQUEST_PERMISSION" }
  | { type: "PERMISSION_GRANTED" }
  | { type: "TICK" }
  | { type: "STOP"; blobUrl: string; blob: Blob }
  | { type: "ERROR"; error: string }
  | { type: "RESET" };

const initialState: State = {
  status: "idle",
  durationMs: 0,
  blobUrl: null,
  blob: null,
  error: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "REQUEST_PERMISSION":
      return { ...initialState, status: "requesting-permission" };
    case "PERMISSION_GRANTED":
      return { ...state, status: "recording", durationMs: 0 };
    case "TICK":
      return { ...state, durationMs: state.durationMs + 1000 };
    case "STOP":
      return {
        ...state,
        status: "recorded",
        blobUrl: action.blobUrl,
        blob: action.blob,
      };
    case "ERROR":
      return { ...initialState, status: "error", error: action.error };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

// ── Hook ───────────────────────────────────────────────────────

export function useRecorder() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const isStartingRef = useRef(false);
  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);

  // Cleanup helpers
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const revokeBlobUrl = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  const clearRecorder = useCallback(() => {
    const recorder = mediaRecorderRef.current;

    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onerror = null;
      recorder.onstop = null;

      if (recorder.state !== "inactive") {
        recorder.stop();
      }
    }

    mediaRecorderRef.current = null;
  }, []);

  // ── Start ──

  const startRecording = useCallback(async () => {
    if (
      isStartingRef.current ||
      state.status === "requesting-permission" ||
      state.status === "recording"
    ) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      dispatch({
        type: "ERROR",
        error: "Your browser does not support audio recording.",
      });
      return;
    }

    isStartingRef.current = true;
    const requestId = ++requestIdRef.current;
    dispatch({ type: "REQUEST_PERMISSION" });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      if (!isMountedRef.current || requestId !== requestIdRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        isStartingRef.current = false;
        return;
      }

      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onerror = () => {
        stopTimer();
        stopTracks();
        isStartingRef.current = false;
        mediaRecorderRef.current = null;
        dispatch({ type: "ERROR", error: "Recording failed unexpectedly." });
      };

      recorder.start();
      isStartingRef.current = false;
      dispatch({ type: "PERMISSION_GRANTED" });

      // Duration timer
      timerRef.current = setInterval(() => dispatch({ type: "TICK" }), 1000);
    } catch (err) {
      isStartingRef.current = false;
      stopTracks();
      const message =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Microphone permission was denied."
          : "Could not start recording.";
      dispatch({ type: "ERROR", error: message });
    }
  }, [state.status, stopTimer, stopTracks]);

  // ── Stop ──

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    // Listen for the final onstop to assemble blob
    recorder.onstop = () => {
      stopTimer();
      stopTracks();
      isStartingRef.current = false;

      const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;
      mediaRecorderRef.current = null;

      dispatch({ type: "STOP", blobUrl: url, blob });
    };

    recorder.stop();
  }, [stopTimer, stopTracks]);

  // ── Reset ──

  const reset = useCallback(() => {
    requestIdRef.current += 1;
    isStartingRef.current = false;
    clearRecorder();
    stopTimer();
    stopTracks();
    revokeBlobUrl();
    chunksRef.current = [];
    dispatch({ type: "RESET" });
  }, [clearRecorder, stopTimer, stopTracks, revokeBlobUrl]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      requestIdRef.current += 1;
      isStartingRef.current = false;
      clearRecorder();
      stopTimer();
      stopTracks();
      revokeBlobUrl();
    };
  }, [clearRecorder, stopTimer, stopTracks, revokeBlobUrl]);

  return {
    status: state.status,
    durationMs: state.durationMs,
    blobUrl: state.blobUrl,
    blob: state.blob,
    error: state.error,
    startRecording,
    stopRecording,
    reset,
  } as const;
}
