/**
 * Event-loop visualization model.
 * Playback is driven by an ExecutionTrace recorded from instrumented user code —
 * not decorative fake steps.
 */

export type QueueTaskKind =
  | 'setTimeout'
  | 'setInterval'
  | 'Promise.then'
  | 'Promise.catch'
  | 'Promise.finally'
  | 'queueMicrotask'
  | 'await'
  | 'fetch'
  | 'raf'
  | 'MessageChannel'
  | 'script'
  | 'callback';

export type WebApiEntry = {
  id: string;
  label: string;
  kind: QueueTaskKind;
  detail?: string;
};

export type QueueEntry = {
  id: string;
  label: string;
  kind: QueueTaskKind;
};

export type TraceSnapshot = {
  callStack: string[];
  webApis: WebApiEntry[];
  microtasks: QueueEntry[];
  macrotasks: QueueEntry[];
  consoleLines: string[];
  /** 1-based line in user source, if known */
  activeLine: number | null;
  eventLoopPhase: 'idle' | 'sync' | 'microtasks' | 'macrotask' | 'webapis';
  highlightPath?: 'stack-to-webapi' | 'webapi-to-macro' | 'stack-to-micro' | 'micro-to-stack' | 'macro-to-stack' | null;
};

export type TraceStep = {
  id: string;
  index: number;
  title: string;
  explanation: string;
  snapshot: TraceSnapshot;
};

export type ExecutionTrace = {
  steps: TraceStep[];
  /** Original user source (kept with the trace; editor highlights active lines). */
  source: string;
  error?: string;
};

export type TraceSpeed = 0.25 | 0.5 | 1 | 2;
