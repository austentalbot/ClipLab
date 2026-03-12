import { extractPeaks } from "./waveform";

function makeAudioBuffer(data: Float32Array): AudioBuffer {
  return {
    getChannelData: () => data,
    length: data.length,
    numberOfChannels: 1,
    sampleRate: 44100,
    duration: data.length / 44100,
    copyFromChannel: jest.fn(),
    copyToChannel: jest.fn(),
  } as unknown as AudioBuffer;
}

describe("extractPeaks", () => {
  it("returns the correct number of buckets", () => {
    const buffer = makeAudioBuffer(new Float32Array(1000));
    const peaks = extractPeaks(buffer, 50);

    expect(peaks).toHaveLength(50);
  });

  it("finds peak amplitudes per bucket", () => {
    // 4 samples, 2 buckets: bucket 0 = [0.2, 0.8], bucket 1 = [0.4, 0.1]
    const data = new Float32Array([0.2, 0.8, 0.4, 0.1]);
    const buffer = makeAudioBuffer(data);
    const peaks = extractPeaks(buffer, 2);

    expect(peaks[0]).toBeCloseTo(0.8);
    expect(peaks[1]).toBeCloseTo(0.4);
  });

  it("handles negative sample values", () => {
    const data = new Float32Array([0.1, -0.9, 0.3, -0.2]);
    const buffer = makeAudioBuffer(data);
    const peaks = extractPeaks(buffer, 2);

    expect(peaks[0]).toBeCloseTo(0.9);
    expect(peaks[1]).toBeCloseTo(0.3);
  });

  it("returns all zeros for silent audio", () => {
    const buffer = makeAudioBuffer(new Float32Array(100));
    const peaks = extractPeaks(buffer, 10);

    expect(peaks.every((p) => p === 0)).toBe(true);
  });

  it("returns all zeros for empty buffer", () => {
    const buffer = makeAudioBuffer(new Float32Array(0));
    const peaks = extractPeaks(buffer, 5);

    expect(peaks).toHaveLength(5);
    expect(peaks.every((p) => p === 0)).toBe(true);
  });
});
