import {
  filterRegistry,
  getDefaultFilters,
  getFilterDef,
  type FilterType,
} from "./filter-registry";

describe("filter-registry", () => {
  it("builds disabled default filters with cloned param objects", () => {
    const defaults = getDefaultFilters();

    expect(defaults).toHaveLength(filterRegistry.length);
    expect(defaults.map((filter) => filter.type)).toEqual(
      filterRegistry.map((filter) => filter.type)
    );
    expect(defaults.every((filter) => filter.enabled === false)).toBe(true);

    defaults[0].params.gain = 2;

    expect(filterRegistry[0].defaultParams.gain).toBe(1);
    expect(getDefaultFilters()[0].params.gain).toBe(1);
  });

  it.each(filterRegistry.map((filter) => filter.type) as FilterType[])(
    "exposes the UI metadata needed for %s",
    (type) => {
      const def = getFilterDef(type);

      expect(def.type).toBe(type);
      expect(def.label.length).toBeGreaterThan(0);
      expect(def.description.length).toBeGreaterThan(0);
      expect(Object.keys(def.paramRanges).length).toBeGreaterThan(0);
    }
  );

  describe("update callbacks", () => {
    it("returns an update function for every filter type", () => {
      for (const def of filterRegistry) {
        const mockCtx = {
          createGain: () => ({
            gain: { value: 0 },
            connect: jest.fn(),
            disconnect: jest.fn(),
          }),
          createBiquadFilter: () => ({
            type: "",
            frequency: { value: 0 },
            Q: { value: 0 },
            connect: jest.fn(),
            disconnect: jest.fn(),
          }),
          createDynamicsCompressor: () => ({
            threshold: { value: 0 },
            ratio: { value: 0 },
            connect: jest.fn(),
            disconnect: jest.fn(),
          }),
          createDelay: () => ({
            delayTime: { value: 0 },
            connect: jest.fn(),
            disconnect: jest.fn(),
          }),
        } as unknown as BaseAudioContext;

        const result = def.createNode(mockCtx, def.defaultParams);
        expect(result.update).toBeDefined();
      }
    });

    it("gain update sets gain value", () => {
      const gainParam = { value: 1 };
      const mockCtx = {
        createGain: () => ({
          gain: gainParam,
          connect: jest.fn(),
          disconnect: jest.fn(),
        }),
      } as unknown as BaseAudioContext;

      const result = getFilterDef("gain").createNode(mockCtx, { gain: 1 });
      result.update!({ gain: 2.5 });
      expect(gainParam.value).toBe(2.5);
    });

    it("lowpass update sets frequency and Q", () => {
      const freqParam = { value: 1000 };
      const qParam = { value: 1 };
      const mockCtx = {
        createBiquadFilter: () => ({
          type: "",
          frequency: freqParam,
          Q: qParam,
          connect: jest.fn(),
          disconnect: jest.fn(),
        }),
      } as unknown as BaseAudioContext;

      const result = getFilterDef("lowpass").createNode(mockCtx, {
        frequency: 1000,
        Q: 1,
      });
      result.update!({ frequency: 5000, Q: 3 });
      expect(freqParam.value).toBe(5000);
      expect(qParam.value).toBe(3);
    });

    it("compressor update sets threshold and ratio", () => {
      const thresholdParam = { value: -24 };
      const ratioParam = { value: 4 };
      const mockCtx = {
        createDynamicsCompressor: () => ({
          threshold: thresholdParam,
          ratio: ratioParam,
          connect: jest.fn(),
          disconnect: jest.fn(),
        }),
      } as unknown as BaseAudioContext;

      const result = getFilterDef("compressor").createNode(mockCtx, {
        threshold: -24,
        ratio: 4,
      });
      result.update!({ threshold: -10, ratio: 8 });
      expect(thresholdParam.value).toBe(-10);
      expect(ratioParam.value).toBe(8);
    });

    it("delay update sets delayTime", () => {
      const delayTimeParam = { value: 0.3 };
      const mockCtx = {
        createDelay: () => ({
          delayTime: delayTimeParam,
          connect: jest.fn(),
          disconnect: jest.fn(),
        }),
        createGain: () => ({
          gain: { value: 0 },
          connect: jest.fn(),
          disconnect: jest.fn(),
        }),
      } as unknown as BaseAudioContext;

      const result = getFilterDef("delay").createNode(mockCtx, { time: 0.3 });
      result.update!({ time: 0.7 });
      expect(delayTimeParam.value).toBe(0.7);
    });
  });

  describe("delay lifecycle callbacks", () => {
    it("zeros feedback and wet gain on stop and restores on play", () => {
      const feedbackGain = { value: 1 };
      const wetGain = { value: 1 };
      const gains = [feedbackGain, wetGain];
      let gainIndex = 0;

      const mockCtx = {
        createDelay: () => ({
          delayTime: { value: 0 },
          connect: jest.fn(),
          disconnect: jest.fn(),
        }),
        createGain: () => ({
          gain: gains[gainIndex++],
          connect: jest.fn(),
          disconnect: jest.fn(),
        }),
      } as unknown as BaseAudioContext;

      const def = getFilterDef("delay");
      const result = def.createNode(mockCtx, { time: 0.3 });

      expect(feedbackGain.value).toBe(0.3);
      expect(wetGain.value).toBe(1);
      expect(result.output).toBeDefined();

      result.onStop!();
      expect(feedbackGain.value).toBe(0);
      expect(wetGain.value).toBe(0);

      result.onPlay!();
      expect(feedbackGain.value).toBe(0.3);
      expect(wetGain.value).toBe(1);
    });
  });
});
