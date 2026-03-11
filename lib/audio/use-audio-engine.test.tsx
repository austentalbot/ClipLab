import { renderHook, act, waitFor } from "@testing-library/react";
import type { FilterConfig } from "./filter-registry";
import { useAudioEngine } from "./use-audio-engine";

const buildGraph = jest.fn();
const applyParams = jest.fn();

jest.mock("./graph-builder", () => ({
  buildGraph: (...args: unknown[]) => buildGraph(...args),
  applyParams: (...args: unknown[]) => applyParams(...args),
}));

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

class FakeAudioContext {
  state: AudioContextState = "running";
  currentTime = 10;
  decodeAudioData = jest.fn<Promise<AudioBuffer>, [ArrayBuffer]>();
  resume = jest.fn<Promise<void>, []>();
  close = jest.fn<Promise<void>, []>();

  constructor(private readonly decodedBuffer: AudioBuffer) {
    this.decodeAudioData.mockResolvedValue(decodedBuffer);
    this.resume.mockResolvedValue();
    this.close.mockResolvedValue();
  }
}

describe("useAudioEngine", () => {
  const enabledGainFilters: FilterConfig[] = [
    { type: "gain", enabled: true, params: { gain: 1 } },
    { type: "lowpass", enabled: false, params: { frequency: 1000, Q: 1 } },
    { type: "highpass", enabled: false, params: { frequency: 500, Q: 1 } },
    { type: "delay", enabled: false, params: { time: 0.3 } },
  ];

  let blob: Blob;
  let decodedBuffer: AudioBuffer;
  let fakeContext: FakeAudioContext;
  let AudioContextMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    blob = {
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
    } as unknown as Blob;
    decodedBuffer = { duration: 5 } as AudioBuffer;
    fakeContext = new FakeAudioContext(decodedBuffer);
    AudioContextMock = jest.fn(() => fakeContext);
    global.AudioContext = AudioContextMock as unknown as typeof AudioContext;
  });

  it("caches decoded blobs per blob instance", async () => {
    const { result } = renderHook(() => useAudioEngine());

    await act(async () => {
      await result.current.decodeBlob(blob);
      await result.current.decodeBlob(blob);
    });

    expect(AudioContextMock).toHaveBeenCalledTimes(1);
    expect(fakeContext.decodeAudioData).toHaveBeenCalledTimes(1);
  });

  it("previews audio, applies live param updates, and rebuilds when enabled filters change", async () => {
    const graphA = {
      source: { onended: null as (() => void) | null },
      nodes: new Map([["gain", { id: "gain-node" } as unknown as AudioNode]]),
      start: jest.fn(),
      stop: jest.fn(),
    };
    const graphB = {
      source: { onended: null as (() => void) | null },
      nodes: new Map<FilterConfig["type"], AudioNode>(),
      start: jest.fn(),
      stop: jest.fn(),
    };

    buildGraph.mockReturnValueOnce(graphA).mockReturnValueOnce(graphB);

    const { result } = renderHook(() => useAudioEngine());

    await act(async () => {
      await result.current.preview(blob, enabledGainFilters);
    });

    expect(buildGraph).toHaveBeenCalledTimes(1);
    expect(buildGraph).toHaveBeenLastCalledWith(
      fakeContext,
      decodedBuffer,
      enabledGainFilters
    );
    expect(graphA.start).toHaveBeenCalledWith(0);
    expect(result.current.isPlaying).toBe(true);

    const changedGain = enabledGainFilters.map((filter) =>
      filter.type === "gain" ? { ...filter, params: { gain: 1.8 } } : filter
    );

    await act(async () => {
      await result.current.syncFilters(changedGain);
    });

    expect(applyParams).toHaveBeenCalledWith(
      graphA.nodes.get("gain"),
      "gain",
      changedGain[0].params
    );
    expect(buildGraph).toHaveBeenCalledTimes(1);

    fakeContext.currentTime = 12.5;
    const disabledGain = changedGain.map((filter) =>
      filter.type === "gain" ? { ...filter, enabled: false } : filter
    );

    await act(async () => {
      await result.current.syncFilters(disabledGain);
    });

    expect(graphA.stop).toHaveBeenCalledTimes(1);
    expect(buildGraph).toHaveBeenCalledTimes(2);
    expect(buildGraph).toHaveBeenLastCalledWith(
      fakeContext,
      decodedBuffer,
      disabledGain
    );
    expect(graphB.start).toHaveBeenCalledWith(2.5);
  });

  it("ignores stale async filter updates after stop", async () => {
    const graph = {
      source: { onended: null as (() => void) | null },
      nodes: new Map([["gain", { id: "gain-node" } as unknown as AudioNode]]),
      start: jest.fn(),
      stop: jest.fn(),
    };

    buildGraph.mockReturnValue(graph);

    const { result } = renderHook(() => useAudioEngine());

    await act(async () => {
      await result.current.preview(blob, enabledGainFilters);
    });

    const resumeGate = deferred<void>();
    fakeContext.state = "suspended";
    fakeContext.resume.mockImplementation(() => resumeGate.promise);

    const syncPromise = act(async () => {
      await result.current.syncFilters(
        enabledGainFilters.map((filter) =>
          filter.type === "gain" ? { ...filter, params: { gain: 2.2 } } : filter
        )
      );
    });

    act(() => {
      result.current.stop();
    });

    resumeGate.resolve();

    await expect(syncPromise).resolves.toBeUndefined();
    await waitFor(() => expect(graph.stop).toHaveBeenCalledTimes(1));
    expect(applyParams).not.toHaveBeenCalled();
    expect(buildGraph).toHaveBeenCalledTimes(1);
  });
});
