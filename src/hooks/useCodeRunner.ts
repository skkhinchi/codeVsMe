import { useCallback, useEffect, useRef, useState } from 'react';
import type { WorkerOutMessage } from '../worker/runner.worker';

export type OutputLine =
  | { id: string; kind: 'log' | 'warn' | 'error'; text: string; line?: number }
  | { id: string; kind: 'runtime-error'; text: string; line?: number };

const EXECUTION_TIMEOUT_MS = 2000;
const ASYNC_DRAIN_MS = 2000;
const WATCHDOG_INTERVAL_MS = 100;

export type RunOutcome = 'idle' | 'success' | 'error';

export function useCodeRunner() {
  const [lines, setLines] = useState<OutputLine[]>([]);
  const [runOutcome, setRunOutcome] = useState<RunOutcome>('idle');
  const workerRef = useRef<Worker | null>(null);
  const executionTimeoutRef = useRef<number | null>(null);
  const watchdogIntervalRef = useRef<number | null>(null);
  const drainTimeoutRef = useRef<number | null>(null);
  const executionFinishedRef = useRef(false);
  const runHadErrorRef = useRef(false);
  const runIdRef = useRef(0);
  const runStartedAtRef = useRef(0);

  const clearExecutionTimeout = useCallback(() => {
    if (executionTimeoutRef.current !== null) {
      window.clearTimeout(executionTimeoutRef.current);
      executionTimeoutRef.current = null;
    }
  }, []);

  const clearWatchdog = useCallback(() => {
    if (watchdogIntervalRef.current !== null) {
      window.clearInterval(watchdogIntervalRef.current);
      watchdogIntervalRef.current = null;
    }
  }, []);

  const clearDrainTimeout = useCallback(() => {
    if (drainTimeoutRef.current !== null) {
      window.clearTimeout(drainTimeoutRef.current);
      drainTimeoutRef.current = null;
    }
  }, []);

  const detachWorker = useCallback(() => {
    const worker = workerRef.current;
    if (!worker) return;
    worker.onmessage = null;
    worker.onerror = null;
    worker.terminate();
    workerRef.current = null;
  }, []);

  const appendLine = useCallback((line: Omit<OutputLine, 'id'>) => {
    setLines((prev) => [...prev, { ...line, id: crypto.randomUUID() }]);
  }, []);

  const forceStop = useCallback(
    (runId: number, message: string) => {
      if (runId !== runIdRef.current) return;

      clearExecutionTimeout();
      clearWatchdog();
      clearDrainTimeout();
      executionFinishedRef.current = false;
      runHadErrorRef.current = true;
      detachWorker();
      appendLine({ kind: 'runtime-error', text: message });
      setRunOutcome('error');
    },
    [appendLine, clearDrainTimeout, clearExecutionTimeout, clearWatchdog, detachWorker],
  );

  const cleanupWorker = useCallback(() => {
    clearExecutionTimeout();
    clearWatchdog();
    clearDrainTimeout();
    executionFinishedRef.current = false;
    detachWorker();
  }, [clearDrainTimeout, clearExecutionTimeout, clearWatchdog, detachWorker]);

  const scheduleDrain = useCallback(() => {
    clearDrainTimeout();
    drainTimeoutRef.current = window.setTimeout(() => {
      drainTimeoutRef.current = null;
      detachWorker();
    }, ASYNC_DRAIN_MS);
  }, [clearDrainTimeout, detachWorker]);

  const startWatchdog = useCallback(
    (runId: number) => {
      clearWatchdog();
      runStartedAtRef.current = Date.now();

      watchdogIntervalRef.current = window.setInterval(() => {
        if (runId !== runIdRef.current || executionFinishedRef.current) return;
        if (Date.now() - runStartedAtRef.current >= EXECUTION_TIMEOUT_MS) {
          forceStop(runId, 'Execution timed out');
        }
      }, WATCHDOG_INTERVAL_MS);
    },
    [clearWatchdog, forceStop],
  );

  const run = useCallback(
    (code: string) => {
      cleanupWorker();
      setLines([]);
      setRunOutcome('idle');
      runHadErrorRef.current = false;

      const runId = runIdRef.current + 1;
      runIdRef.current = runId;
      executionFinishedRef.current = false;

      const worker = new Worker(new URL('../worker/runner.worker.ts', import.meta.url), {
        type: 'module',
      });
      workerRef.current = worker;

      executionTimeoutRef.current = window.setTimeout(() => {
        forceStop(runId, 'Execution timed out');
      }, EXECUTION_TIMEOUT_MS);

      startWatchdog(runId);

      worker.onmessage = (event: MessageEvent<WorkerOutMessage>) => {
        if (runId !== runIdRef.current) return;

        const message = event.data;

        if (message.type === 'console') {
          appendLine({ kind: message.level, text: message.args.join(' ') });
          if (message.level === 'error') {
            runHadErrorRef.current = true;
            setRunOutcome('error');
          }
          if (executionFinishedRef.current) {
            scheduleDrain();
          }
          return;
        }

        if (message.type === 'output-limit') {
          forceStop(runId, 'Output limit reached (500 lines). Execution stopped.');
          return;
        }

        if (message.type === 'error') {
          cleanupWorker();
          runHadErrorRef.current = true;
          appendLine({
            kind: 'runtime-error',
            text: message.message,
            line: message.line,
          });
          setRunOutcome('error');
          return;
        }

        if (message.type === 'done') {
          clearExecutionTimeout();
          clearWatchdog();
          executionFinishedRef.current = true;
          if (!runHadErrorRef.current) setRunOutcome('success');
          scheduleDrain();
        }
      };

      worker.onerror = () => {
        if (runId !== runIdRef.current) return;
        cleanupWorker();
        runHadErrorRef.current = true;
        appendLine({ kind: 'runtime-error', text: 'Worker failed to execute code' });
        setRunOutcome('error');
      };

      worker.postMessage({ type: 'run', code });
    },
    [appendLine, cleanupWorker, forceStop, scheduleDrain, startWatchdog],
  );

  const clear = useCallback(() => {
    cleanupWorker();
    setLines([]);
    setRunOutcome('idle');
  }, [cleanupWorker]);

  useEffect(() => cleanupWorker, [cleanupWorker]);

  return { lines, run, clear, runOutcome };
}
