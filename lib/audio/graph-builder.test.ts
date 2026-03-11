import { applyParams, buildGraph } from "./graph-builder";
import type { FilterConfig } from "./filter-registry";

class FakeAudioParam {
  value = 0;

  setValueAtTime(value: number) {
    this.value = value;
  }
}

class FakeAudioNode {
  connections: FakeAudioNode[] = [];
  context: FakeAudioContext;

  constructor(context: FakeAudioContext) {
    this.context = context;
  }

  connect(node: FakeAudioNode) {
    this.connections.push(node);
    return node;
  }

  disconnect() {
    this.connections = [];
  }
}

class FakeBufferSourceNode extends FakeAudioNode {
  buffer: AudioBuffer | null = null;
  onended: (() => void) | null = null;
  startArgs: [number, number] | null = null;

  start(when = 0, offset = 0) {
    this.startArgs = [when, offset];
  }

  stop() {}
}

class FakeGainNode extends FakeAudioNode {
  gain = new FakeAudioParam();
}

class FakeBiquadFilterNode extends FakeAudioNode {
  type: BiquadFilterType = "lowpass";
  frequency = new FakeAudioParam();
  Q = new FakeAudioParam();
}

class FakeDelayNode extends FakeAudioNode {
  delayTime = new FakeAudioParam();
}

class FakeAudioContext {
  currentTime = 1.5;
  destination: FakeAudioNode;

  constructor() {
    this.destination = new FakeAudioNode(this);
  }

  createBufferSource() {
    return new FakeBufferSourceNode(this);
  }

  createGain() {
    return new FakeGainNode(this);
  }

  createBiquadFilter() {
    return new FakeBiquadFilterNode(this);
  }

  createDelay() {
    return new FakeDelayNode(this);
  }
}

describe("graph-builder", () => {
  it("only inserts enabled filters into the audio chain", () => {
    const ctx = new FakeAudioContext() as unknown as AudioContext;
    const buffer = { duration: 2 } as AudioBuffer;
    const filters: FilterConfig[] = [
      { type: "gain", enabled: true, params: { gain: 2 } },
      { type: "lowpass", enabled: false, params: { frequency: 1000, Q: 1 } },
      { type: "highpass", enabled: true, params: { frequency: 250, Q: 1 } },
      { type: "delay", enabled: false, params: { time: 0.3 } },
    ];

    const graph = buildGraph(ctx, buffer, filters);
    const source = graph.source as unknown as FakeBufferSourceNode;
    const gain = graph.nodes.get("gain") as unknown as FakeGainNode;
    const highpass = graph.nodes.get(
      "highpass"
    ) as unknown as FakeBiquadFilterNode;

    expect(graph.nodes.has("lowpass")).toBe(false);
    expect(graph.nodes.has("delay")).toBe(false);
    expect(source.connections).toEqual([gain]);
    expect(gain.connections).toEqual([highpass]);
    expect(highpass.connections).toEqual([
      (ctx as unknown as FakeAudioContext).destination,
    ]);
  });

  it("applies live parameter updates to each supported node type", () => {
    const ctx = new FakeAudioContext();

    const gain = ctx.createGain();
    applyParams(gain as unknown as AudioNode, "gain", { gain: 1.8 });
    expect(gain.gain.value).toBe(1.8);

    const lowpass = ctx.createBiquadFilter();
    applyParams(lowpass as unknown as AudioNode, "lowpass", {
      frequency: 1400,
      Q: 2.5,
    });
    expect(lowpass.frequency.value).toBe(1400);
    expect(lowpass.Q.value).toBe(2.5);

    const delay = ctx.createDelay();
    applyParams(delay as unknown as AudioNode, "delay", { time: 0.45 });
    expect(delay.delayTime.value).toBe(0.45);
  });
});
