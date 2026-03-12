/**
 * Extracts peak amplitude values from an AudioBuffer for waveform rendering.
 * Divides channel 0 into equal-sized buckets (default 120) and returns the
 * max absolute amplitude per bucket, normalized to 0–1.
 */
export function extractPeaks(
  audioBuffer: AudioBuffer,
  bucketCount = 120
): number[] {
  const data = audioBuffer.getChannelData(0);
  const length = data.length;

  if (length === 0) {
    return new Array(bucketCount).fill(0);
  }

  const bucketSize = length / bucketCount;
  const peaks: number[] = [];

  for (let i = 0; i < bucketCount; i++) {
    const start = Math.floor(i * bucketSize);
    const end = Math.floor((i + 1) * bucketSize);
    let max = 0;

    for (let j = start; j < end; j++) {
      const abs = Math.abs(data[j]);
      if (abs > max) {
        max = abs;
      }
    }

    peaks.push(max);
  }

  return peaks;
}
