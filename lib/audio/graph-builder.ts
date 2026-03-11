import {
  type FilterConfig,
  type FilterType,
  filterRegistry,
} from "./filter-registry";

export type AudioGraph = {
  source: AudioBufferSourceNode;
  nodes: Map<FilterType, AudioNode>;
  start: (offset?: number) => void;
  stop: () => void;
};

/**
 * Builds a Web Audio graph: source → [enabled filters] → destination.
 */
export function buildGraph(
  ctx: AudioContext,
  buffer: AudioBuffer,
  filters: FilterConfig[]
): AudioGraph {
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const nodes = new Map<FilterType, AudioNode>();
  const enabledFilters = filters.filter((filter) => filter.enabled);

  for (const def of filterRegistry) {
    const config = filters.find((f) => f.type === def.type);
    if (!config?.enabled) continue;
    const node = def.createNode(ctx, config.params);
    nodes.set(def.type, node);
  }

  const chain: AudioNode[] = [source];
  for (const filter of enabledFilters) {
    const node = nodes.get(filter.type);
    if (node) chain.push(node);
  }
  chain.push(ctx.destination);

  for (let i = 0; i < chain.length - 1; i++) {
    chain[i].connect(chain[i + 1] as AudioNode);
  }

  return {
    source,
    nodes,
    start(offset = 0) {
      source.start(0, offset);
    },
    stop() {
      try {
        source.onended = null;
        source.stop();
      } catch {
        // Already stopped
      }
      source.disconnect();
      for (const node of nodes.values()) {
        node.disconnect();
      }
    },
  };
}

/**
 * Apply params to a live node without rebuilding the graph.
 */
export function applyParams(
  node: AudioNode,
  filterType: FilterType,
  params: Record<string, number>
) {
  const atTime = node.context.currentTime;

  if (filterType === "gain") {
    (node as GainNode).gain.setValueAtTime(params.gain, atTime);
  } else if (filterType === "lowpass" || filterType === "highpass") {
    const bq = node as BiquadFilterNode;
    if (params.frequency !== undefined) {
      bq.frequency.setValueAtTime(params.frequency, atTime);
    }
    if (params.Q !== undefined) {
      bq.Q.setValueAtTime(params.Q, atTime);
    }
  } else if (filterType === "delay") {
    (node as DelayNode).delayTime.setValueAtTime(params.time, atTime);
  }
}
