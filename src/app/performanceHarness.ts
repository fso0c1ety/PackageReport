"use client";

type Phase = "pointerdown" | "click" | "stateUpdate" | "render" | "mounted" | "layoutEffect" | "effect" | "raf1" | "raf2" | "visible";
type Sample = { id: number; kind: string; phases: Partial<Record<Phase, number>>; total?: number; visible?: boolean };

declare global {
  interface Window {
    __SM_PERF__?: {
      samples: Sample[];
      counters: Record<string, number>;
      start: (kind: string, target?: string) => number;
      mark: (phase: Phase, id?: number) => void;
      increment: (name: string, amount?: number) => void;
      latest: () => Sample | undefined;
      clear: () => void;
    };
  }
}

const isEnabled = () => {
  if (typeof window === "undefined") return false;
  if (process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development") return true;
  const host = window.location.hostname;
  return host.endsWith(".vercel.app") && host !== "package-report.vercel.app";
};

let nextId = 1;
let activeId: number | undefined;

const api = {
  samples: [] as Sample[],
  counters: {} as Record<string, number>,
  start(kind: string, target?: string) {
    if (!isEnabled()) return 0;
    const id = nextId++;
    const now = performance.now();
    const sample: Sample = { id, kind: target ? `${kind}:${target}` : kind, phases: { pointerdown: now } };
    this.samples.push(sample);
    this.samples = this.samples.slice(-200);
    activeId = id;
    requestAnimationFrame(() => this.mark("raf1", id));
    requestAnimationFrame(() => requestAnimationFrame(() => this.mark("raf2", id)));
    return id;
  },
  mark(phase: Phase, id = activeId) {
    if (!isEnabled() || !id) return;
    const sample = this.samples.find((entry) => entry.id === id);
    if (!sample || sample.phases[phase] !== undefined) return;
    sample.phases[phase] = performance.now();
    if (phase === "visible") {
      sample.visible = true;
      sample.total = sample.phases.visible! - sample.phases.pointerdown!;
      if (activeId === id) activeId = undefined;
    }
  },
  increment(name: string, amount = 1) {
    if (!isEnabled()) return;
    this.counters[name] = (this.counters[name] || 0) + amount;
  },
  latest() { return isEnabled() ? this.samples[this.samples.length - 1] : undefined; },
  clear() { if (isEnabled()) { this.samples.length = 0; this.counters = {}; activeId = undefined; } },
};

if (typeof window !== "undefined" && isEnabled()) window.__SM_PERF__ = api;

export const perfHarness = api;

export function markVisible(id?: number, selector?: string) {
  if (!isEnabled() || !id) return;
  const check = () => {
    const element = selector ? document.querySelector<HTMLElement>(selector) : document.querySelector<HTMLElement>("[role=\"presentation\"]");
    if (element && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden") perfHarness.mark("visible", id);
    else if (perfHarness.samples.some((sample) => sample.id === id && !sample.visible)) requestAnimationFrame(check);
  };
  requestAnimationFrame(check);
}
