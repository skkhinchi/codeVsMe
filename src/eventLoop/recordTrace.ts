import type {
  ExecutionTrace,
  QueueTaskKind,
  TraceSnapshot,
  TraceStep,
} from './types';

type Micro = { id: string; label: string; kind: QueueTaskKind; run: () => void };
type Macro = { id: string; label: string; kind: QueueTaskKind; readyAt: number; run: () => void };
type Handler = ((v: unknown) => unknown) | undefined | null;

type PromiseHost = {
  state: 'pending' | 'fulfilled' | 'rejected';
  value: unknown;
  handlers: Array<{
    onFulfilled: Handler;
    onRejected: Handler;
    resolve: (v: unknown) => void;
    reject: (e: unknown) => void;
    siteLine: number | null;
  }>;
  then(onFulfilled?: Handler, onRejected?: Handler): PromiseHost;
  catch(onRejected?: Handler): PromiseHost;
  finally(onFinally?: (() => void) | null): PromiseHost;
};

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function cloneSnapshot(s: TraceSnapshot): TraceSnapshot {
  return {
    callStack: [...s.callStack],
    webApis: s.webApis.map((w) => ({ ...w })),
    microtasks: s.microtasks.map((m) => ({ ...m })),
    macrotasks: s.macrotasks.map((m) => ({ ...m })),
    consoleLines: [...s.consoleLines],
    activeLine: s.activeLine,
    eventLoopPhase: s.eventLoopPhase,
    highlightPath: s.highlightPath ?? null,
  };
}

/**
 * Runs user JS against a simulated host (timers, Promise, queueMicrotask, fetch, rAF)
 * and records an ExecutionTrace. Playback in the UI is driven only by these steps.
 */
export async function recordEventLoopTrace(userCode: string): Promise<ExecutionTrace> {
  const steps: TraceStep[] = [];
  const snapshot: TraceSnapshot = {
    callStack: [],
    webApis: [],
    microtasks: [],
    macrotasks: [],
    consoleLines: [],
    activeLine: null,
    eventLoopPhase: 'idle',
    highlightPath: null,
  };

  const microQ: Micro[] = [];
  const macroQ: Macro[] = [];
  let clock = 0;
  let stepIndex = 0;
  const MAX_STEPS = 400;
  const MAX_DRAIN = 200;
  /** `new Function` wraps body; with `"use strict";\\n` V8 maps user line N → anonymous N+3. */
  const FUNCTION_LINE_OFFSET = 3;

  const captureCallerLine = (): number | null => {
    const stack = new Error().stack ?? '';
    for (const raw of stack.split('\n')) {
      // Prefer the user Function/<anonymous> frame even when nested under recordTrace's eval host.
      const m =
        raw.match(/<anonymous>:(\d+):\d+/) ??
        raw.match(/\beval:(\d+):\d+/) ??
        raw.match(/\bFunction:(\d+):\d+/);
      if (!m) continue;
      // Ignore frames that are clearly our recorder helpers (no anonymous user line).
      if (
        raw.includes('at captureCallerLine') ||
        raw.includes('at pushStep') ||
        (raw.includes('/eventLoop/recordTrace') && !raw.includes('<anonymous>:'))
      ) {
        continue;
      }
      const anonLine = Number.parseInt(m[1], 10);
      if (!Number.isFinite(anonLine)) continue;
      const userLine = anonLine - FUNCTION_LINE_OFFSET;
      if (userLine > 0) return userLine;
    }
    return null;
  };

  const pushStep = (title: string, explanation: string, line?: number | null) => {
    if (steps.length >= MAX_STEPS) return;
    if (line != null && line > 0) {
      snapshot.activeLine = line;
    }
    steps.push({
      id: uid('step'),
      index: stepIndex++,
      title,
      explanation,
      snapshot: cloneSnapshot(snapshot),
    });
    snapshot.highlightPath = null;
  };

  const syncMicroVisual = () => {
    snapshot.microtasks = microQ.map(({ id, label, kind }) => ({ id, label, kind }));
  };
  const syncMacroVisual = () => {
    snapshot.macrotasks = macroQ.map(({ id, label, kind }) => ({ id, label, kind }));
  };

  const pushFrame = (name: string) => {
    snapshot.callStack.push(name);
  };
  const popFrame = () => {
    snapshot.callStack.pop();
  };

  const enqueueMicro = (
    label: string,
    kind: QueueTaskKind,
    run: () => void,
    explanation: string,
    atLine?: number | null,
  ) => {
    const id = uid('micro');
    microQ.push({ id, label, kind, run });
    syncMicroVisual();
    snapshot.highlightPath = 'stack-to-micro';
    if (snapshot.eventLoopPhase === 'idle') snapshot.eventLoopPhase = 'sync';
    pushStep(`Enqueue microtask · ${label}`, explanation, atLine ?? captureCallerLine());
  };

  const registerTimer = (
    ms: number,
    label: string,
    kind: QueueTaskKind,
    run: () => void,
    explainApi: string,
    explainQueue: string,
    atLine?: number | null,
  ) => {
    const siteLine = atLine ?? captureCallerLine();
    const apiId = uid('api');
    snapshot.webApis.push({ id: apiId, label, kind, detail: `${ms}ms` });
    snapshot.highlightPath = 'stack-to-webapi';
    snapshot.eventLoopPhase = 'webapis';
    pushStep(`Web API · ${label}`, explainApi, siteLine);

    snapshot.webApis = snapshot.webApis.filter((w) => w.id !== apiId);
    const id = uid('macro');
    macroQ.push({ id, label, kind, readyAt: clock + Math.max(0, ms), run });
    syncMacroVisual();
    snapshot.highlightPath = 'webapi-to-macro';
    pushStep(`Macrotask queued · ${label}`, explainQueue, siteLine);
  };

  const serialize = (value: unknown): string => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'function') return '[Function]';
    try {
      return JSON.stringify(value) ?? String(value);
    } catch {
      return String(value);
    }
  };

  const cons = {
    log: (...args: unknown[]) => {
      const line = args.map(serialize).join(' ');
      const at = captureCallerLine();
      snapshot.consoleLines.push(line);
      if (snapshot.eventLoopPhase === 'idle') snapshot.eventLoopPhase = 'sync';
      pushStep('console.log', `Output: ${line}`, at);
    },
    warn: (...args: unknown[]) => {
      const line = args.map(serialize).join(' ');
      const at = captureCallerLine();
      snapshot.consoleLines.push(`⚠ ${line}`);
      pushStep('console.warn', `Output: ${line}`, at);
    },
    error: (...args: unknown[]) => {
      const line = args.map(serialize).join(' ');
      const at = captureCallerLine();
      snapshot.consoleLines.push(`✖ ${line}`);
      pushStep('console.error', `Output: ${line}`, at);
    },
  };

  const settleHandlers = (p: PromiseHost) => {
    if (p.state === 'pending') return;
    const batch = p.handlers.splice(0);
    for (const h of batch) {
      const isRejectPath = p.state === 'rejected';
      const kind: QueueTaskKind = isRejectPath && h.onRejected ? 'Promise.catch' : 'Promise.then';
      const label = kind;
      const siteLine = h.siteLine;
      enqueueMicro(
        label,
        kind,
        () => {
          snapshot.highlightPath = 'micro-to-stack';
          pushFrame(label);
          snapshot.eventLoopPhase = 'microtasks';
          pushStep(`Run ${label}`, 'Microtask moved onto the Call Stack.', siteLine);
          try {
            if (p.state === 'fulfilled') {
              if (typeof h.onFulfilled === 'function') h.resolve(h.onFulfilled(p.value));
              else h.resolve(p.value);
            } else if (typeof h.onRejected === 'function') {
              h.resolve(h.onRejected(p.value));
            } else {
              h.reject(p.value);
            }
          } catch (err) {
            h.reject(err);
          } finally {
            popFrame();
            pushStep(`${label} done`, 'Promise reaction finished; Call Stack frame removed.', siteLine);
          }
        },
        'Promise reactions are microtasks and run before any setTimeout macrotask.',
        siteLine,
      );
    }
  };

  const fulfill = (p: PromiseHost, value: unknown) => {
    if (p.state !== 'pending') return;
    if (value && typeof value === 'object' && typeof (value as PromiseHost).then === 'function') {
      try {
        (value as PromiseHost).then(
          (v) => fulfill(p, v),
          (e) => reject(p, e),
        );
      } catch (err) {
        reject(p, err);
      }
      return;
    }
    p.state = 'fulfilled';
    p.value = value;
    settleHandlers(p);
  };

  const reject = (p: PromiseHost, reason: unknown) => {
    if (p.state !== 'pending') return;
    p.state = 'rejected';
    p.value = reason;
    settleHandlers(p);
  };

  const makePromise = (): PromiseHost => {
    const p: PromiseHost = {
      state: 'pending',
      value: undefined,
      handlers: [],
      then(onFulfilled, onRejected) {
        const next = makePromise();
        const siteLine = captureCallerLine();
        p.handlers.push({
          onFulfilled,
          onRejected,
          resolve: (v) => fulfill(next, v),
          reject: (e) => reject(next, e),
          siteLine,
        });
        settleHandlers(p);
        return next;
      },
      catch(onRejected) {
        return p.then(undefined, onRejected);
      },
      finally(onFinally) {
        return p.then(
          (v) => {
            onFinally?.();
            return v;
          },
          (e) => {
            onFinally?.();
            throw e;
          },
        );
      },
    };
    return p;
  };

  const PromiseSim = {
    resolve(value?: unknown) {
      const p = makePromise();
      fulfill(p, value);
      return p;
    },
    reject(reason?: unknown) {
      const p = makePromise();
      reject(p, reason);
      return p;
    },
  };

  const simSetTimeout = (cb: TimerHandler, delay = 0, ...args: unknown[]) => {
    if (typeof cb !== 'function') return 0;
    const ms = Number(delay) || 0;
    const siteLine = captureCallerLine();
    registerTimer(
      ms,
      `Timer (${ms}ms)`,
      'setTimeout',
      () => {
        snapshot.highlightPath = 'macro-to-stack';
        pushFrame('setTimeout callback');
        snapshot.eventLoopPhase = 'macrotask';
        pushStep(
          'Run setTimeout callback',
          'Event Loop selected one macrotask. The callback is now on the Call Stack.',
          siteLine,
        );
        try {
          (cb as (...a: unknown[]) => void)(...args);
        } finally {
          popFrame();
          pushStep('setTimeout callback done', 'Macrotask finished; Call Stack frame removed.', siteLine);
        }
      },
      'setTimeout hands the callback to Web APIs. It does not run immediately.',
      'Timer completed → callback entered the Macrotask Queue (still waits for empty stack + empty microtasks).',
      siteLine,
    );
    return 1;
  };

  const simQueueMicrotask = (cb: () => void) => {
    const siteLine = captureCallerLine();
    enqueueMicro(
      'queueMicrotask',
      'queueMicrotask',
      () => {
        snapshot.highlightPath = 'micro-to-stack';
        pushFrame('queueMicrotask');
        snapshot.eventLoopPhase = 'microtasks';
        pushStep('Run queueMicrotask', 'queueMicrotask callbacks are microtasks.', siteLine);
        try {
          cb();
        } finally {
          popFrame();
          pushStep('queueMicrotask done', 'Microtask finished.', siteLine);
        }
      },
      'queueMicrotask schedules a microtask directly.',
      siteLine,
    );
  };

  const simFetch = (_input?: unknown) => {
    const apiId = uid('api');
    snapshot.webApis.push({ id: apiId, label: 'fetch()', kind: 'fetch' });
    snapshot.highlightPath = 'stack-to-webapi';
    pushStep(
      'Web API · fetch()',
      'fetch is a Web API. Completion is visualized as a macrotask; .then handlers become microtasks.',
    );

    const p = makePromise();
    snapshot.webApis = snapshot.webApis.filter((w) => w.id !== apiId);
    const id = uid('macro');
    macroQ.push({
      id,
      label: 'fetch response',
      kind: 'fetch',
      readyAt: clock,
      run: () => {
        pushFrame('fetch onload');
        pushStep('fetch resolved', 'Mock fetch completed — settling the fetch Promise.');
        fulfill(p, {
          ok: true,
          status: 200,
          json: () => PromiseSim.resolve({}),
        });
        popFrame();
      },
    });
    syncMacroVisual();
    snapshot.highlightPath = 'webapi-to-macro';
    pushStep('Macrotask queued · fetch response', 'Fetch completion queued before Promise reactions.');
    return p;
  };

  const simRaf = (cb: FrameRequestCallback) => {
    registerTimer(
      16,
      'requestAnimationFrame',
      'raf',
      () => {
        pushFrame('rAF callback');
        pushStep(
          'Run requestAnimationFrame',
          'rAF is shown on the macrotask path for visualization clarity.',
        );
        try {
          cb(clock);
        } finally {
          popFrame();
        }
      },
      'requestAnimationFrame registers with the browser rendering pipeline (Web APIs).',
      'rAF callback moved to the task queue.',
    );
    return 1;
  };

  function MessageChannelSim(this: { port1: unknown; port2: unknown }) {
    let onmessage: ((ev: { data: unknown }) => void) | null = null;
    this.port2 = {
      postMessage: (data: unknown) => {
        registerTimer(
          0,
          'MessageChannel',
          'MessageChannel',
          () => {
            pushFrame('MessageChannel');
            pushStep('MessageChannel message', 'port.postMessage queues a macrotask.');
            onmessage?.({ data });
            popFrame();
          },
          'MessageChannel uses the browser task queue.',
          'Channel message queued as a macrotask.',
        );
      },
    };
    this.port1 = {
      set onmessage(fn: ((ev: { data: unknown }) => void) | null) {
        onmessage = fn;
      },
      get onmessage() {
        return onmessage;
      },
    };
  }

  const flushNativeMicros = async () => {
    // Let native async/await thenable jobs and continuations run.
    // Those call our Promise.then / console and enqueue onto microQ in the right order.
    for (let i = 0; i < 16; i++) {
      await Promise.resolve();
    }
  };

  const drainMicrotasks = async () => {
    let guard = 0;
    while (guard++ < MAX_DRAIN && steps.length < MAX_STEPS) {
      await flushNativeMicros();
      if (microQ.length === 0) break;

      const task = microQ.shift()!;
      syncMicroVisual();
      snapshot.eventLoopPhase = 'microtasks';
      pushStep(
        'Event Loop → Microtask Queue',
        'Call Stack is empty. Event Loop processes ALL microtasks before any macrotask.',
      );
      task.run();
    }
  };

  const drainOneMacro = (): boolean => {
    macroQ.sort((a, b) => a.readyAt - b.readyAt);
    let next = macroQ.find((m) => m.readyAt <= clock);
    if (!next) {
      if (macroQ.length === 0) return false;
      clock = macroQ[0].readyAt;
      next = macroQ[0];
    }
    const idx = macroQ.indexOf(next);
    macroQ.splice(idx, 1);
    syncMacroVisual();
    snapshot.eventLoopPhase = 'macrotask';
    pushStep(
      'Event Loop → Macrotask Queue',
      'Microtask Queue is empty. Event Loop takes exactly ONE macrotask, then checks microtasks again.',
    );
    next.run();
    return true;
  };

  const drainEventLoop = async () => {
    let guard = 0;
    while (guard++ < MAX_DRAIN && steps.length < MAX_STEPS) {
      await drainMicrotasks();
      if (microQ.length > 0) continue;
      if (macroQ.length === 0) break;
      if (!drainOneMacro()) break;
    }
    snapshot.eventLoopPhase = 'idle';
    pushStep(
      'Event Loop idle',
      'Call Stack, Microtask Queue, and Macrotask Queue are empty. Visualization complete.',
    );
  };

  try {
    snapshot.eventLoopPhase = 'sync';
    pushFrame('Global()');
    pushStep(
      'Push Global Execution Context',
      'JavaScript creates the Global Execution Context and pushes it onto the Call Stack. Synchronous code runs first.',
    );

    const run = new Function(
      'console',
      'setTimeout',
      'setInterval',
      'clearTimeout',
      'clearInterval',
      'queueMicrotask',
      'Promise',
      'fetch',
      'requestAnimationFrame',
      'MessageChannel',
      `"use strict";\n${userCode}`,
    ) as (...args: unknown[]) => unknown;

    run(
      cons,
      simSetTimeout,
      simSetTimeout,
      () => {},
      () => {},
      simQueueMicrotask,
      PromiseSim,
      simFetch,
      simRaf,
      MessageChannelSim,
    );

    popFrame();
    pushStep(
      'Global() finished (sync)',
      'Synchronous work finished. Global() left the Call Stack. Event Loop can drain Microtasks, then Macrotasks.',
    );

    await flushNativeMicros();
    await drainEventLoop();
  } catch (err) {
    const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    snapshot.eventLoopPhase = 'idle';
    pushStep('Runtime error', message, captureCallerLine());
    return { steps, source: userCode, error: message };
  }

  if (steps.length === 0) {
    pushStep('Empty program', 'No observable event-loop activity was recorded.');
  }

  return { steps, source: userCode };
}
