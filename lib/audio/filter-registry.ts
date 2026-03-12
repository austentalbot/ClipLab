// ── Types ──────────────────────────────────────────────────────

export type FilterType =
  | "gain"
  | "lowpass"
  | "highpass"
  | "compressor"
  | "delay";

export type FilterConfig = {
  type: FilterType;
  enabled: boolean;
  params: Record<string, number>;
};

export type FilterNodeResult = {
  node: AudioNode;
  /** When set, the chain connects from `output` instead of `node`. */
  output?: AudioNode;
  dispose?: () => void;
  onStop?: () => void;
  onPlay?: () => void;
  /** Update AudioParam values in-place without rebuilding the graph. */
  update?: (params: Record<string, number>) => void;
};

export type FilterDef = {
  type: FilterType;
  label: string;
  description: string;
  defaultParams: Record<string, number>;
  paramRanges: Record<
    string,
    {
      min: number;
      max: number;
      step: number;
      unit?: string;
      label?: string;
      description?: string;
    }
  >;
  createNode: (
    ctx: BaseAudioContext,
    params: Record<string, number>
  ) => FilterNodeResult;
};

// ── Registry ───────────────────────────────────────────────────

export const filterRegistry: FilterDef[] = [
  {
    type: "gain",
    label: "Gain",
    description: "Adjusts the overall playback level.",
    defaultParams: { gain: 1 },
    paramRanges: {
      gain: {
        min: 0,
        max: 3,
        step: 0.01,
        unit: "x",
        label: "Gain",
        description:
          "Multiplies the output volume. 1x leaves the level unchanged.",
      },
    },
    createNode(ctx, params) {
      const node = ctx.createGain();
      node.gain.value = params.gain;
      return {
        node,
        update(p) {
          node.gain.value = p.gain;
        },
      };
    },
  },
  {
    type: "lowpass",
    label: "Low-pass",
    description:
      "Keeps lower frequencies and reduces brighter high-end content.",
    defaultParams: { frequency: 1000, Q: 1 },
    paramRanges: {
      frequency: {
        min: 200,
        max: 20000,
        step: 10,
        unit: "Hz",
        label: "Cutoff",
        description:
          "Higher values let more treble through before the filter rolls it off.",
      },
      Q: {
        min: 0.1,
        max: 10,
        step: 0.1,
        label: "Resonance",
        description:
          "Boosts frequencies around the cutoff point for a sharper tone.",
      },
    },
    createNode(ctx, params) {
      const node = ctx.createBiquadFilter();
      node.type = "lowpass";
      node.frequency.value = params.frequency;
      node.Q.value = params.Q;
      return {
        node,
        update(p) {
          node.frequency.value = p.frequency;
          node.Q.value = p.Q;
        },
      };
    },
  },
  {
    type: "highpass",
    label: "High-pass",
    description: "Keeps higher frequencies and reduces low-end content.",
    defaultParams: { frequency: 500, Q: 1 },
    paramRanges: {
      frequency: {
        min: 20,
        max: 5000,
        step: 10,
        unit: "Hz",
        label: "Cutoff",
        description:
          "Higher values remove more bass before the signal passes through.",
      },
      Q: {
        min: 0.1,
        max: 10,
        step: 0.1,
        label: "Resonance",
        description:
          "Boosts frequencies around the cutoff point for a sharper tone.",
      },
    },
    createNode(ctx, params) {
      const node = ctx.createBiquadFilter();
      node.type = "highpass";
      node.frequency.value = params.frequency;
      node.Q.value = params.Q;
      return {
        node,
        update(p) {
          node.frequency.value = p.frequency;
          node.Q.value = p.Q;
        },
      };
    },
  },
  {
    type: "compressor",
    label: "Compressor",
    description: "Reduces the dynamic range by attenuating loud signals.",
    defaultParams: { threshold: -24, ratio: 4 },
    paramRanges: {
      threshold: {
        min: -50,
        max: 0,
        step: 1,
        unit: "dB",
        label: "Threshold",
        description:
          "The level above which compression begins. Lower values compress more of the signal.",
      },
      ratio: {
        min: 1,
        max: 20,
        step: 0.5,
        label: "Ratio",
        description:
          "How much the signal above the threshold is reduced. Higher values mean stronger compression.",
      },
    },
    createNode(ctx, params) {
      const node = ctx.createDynamicsCompressor();
      node.threshold.value = params.threshold;
      node.ratio.value = params.ratio;
      return {
        node,
        update(p) {
          node.threshold.value = p.threshold;
          node.ratio.value = p.ratio;
        },
      };
    },
  },
  {
    type: "delay",
    label: "Delay",
    description: "Adds a short echo with fixed feedback.",
    defaultParams: { time: 0.3 },
    paramRanges: {
      time: {
        min: 0.01,
        max: 1.0,
        step: 0.01,
        unit: "s",
        label: "Delay time",
        description:
          "Sets the gap between the dry signal and each repeated echo.",
      },
    },
    createNode(ctx, params) {
      const delay = ctx.createDelay(2.0);
      delay.delayTime.value = params.time;

      // Internal feedback loop: delay → feedbackGain → delay
      const feedbackLevel = 0.3;
      const feedback = ctx.createGain();
      feedback.gain.value = feedbackLevel;
      delay.connect(feedback);
      feedback.connect(delay);

      // Wet output gate: muted on stop to immediately silence the tail
      const wet = ctx.createGain();
      delay.connect(wet);

      return {
        node: delay,
        output: wet,
        dispose() {
          feedback.disconnect();
          wet.disconnect();
        },
        onStop() {
          feedback.gain.value = 0;
          wet.gain.value = 0;
        },
        onPlay() {
          feedback.gain.value = feedbackLevel;
          wet.gain.value = 1;
        },
        update(p) {
          delay.delayTime.value = p.time;
        },
      };
    },
  },
];

// ── Helpers ─────────────────────────────────────────────────────

export function getFilterDef(type: FilterType): FilterDef {
  const def = filterRegistry.find((f) => f.type === type);
  if (!def) throw new Error(`Unknown filter type: ${type}`);
  return def;
}

export function getDefaultFilters(): FilterConfig[] {
  return filterRegistry.map((def) => ({
    type: def.type,
    enabled: false,
    params: { ...def.defaultParams },
  }));
}
