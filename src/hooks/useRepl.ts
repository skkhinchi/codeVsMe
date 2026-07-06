import { useCallback, useEffect, useRef, useState } from 'react';
import type { WorkerOutMessage } from '../worker/runner.worker';

export type TerminalLine =
  | { id: string; kind: 'prompt'; text: string }
  | { id: string; kind: 'log' | 'warn' | 'error'; text: string }
  | { id: string; kind: 'result'; text: string }
  | { id: string; kind: 'runtime-error'; text: string; line?: number };

type NewTerminalLine =
  | { kind: 'prompt'; text: string }
  | { kind: 'log' | 'warn' | 'error'; text: string }
  | { kind: 'result'; text: string }
  | { kind: 'runtime-error'; text: string; line?: number };

const REPL_TIMEOUT_MS = 2000;

export function useRepl() {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [busy, setBusy] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const commandIdRef = useRef(0);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);

  const clearTimeoutRef = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const detachWorker = useCallback(() => {
    clearTimeoutRef();
    const worker = workerRef.current;
    if (!worker) return;
    worker.onmessage = null;
    worker.onerror = null;
    worker.terminate();
    workerRef.current = null;
  }, [clearTimeoutRef]);

  const appendLine = useCallback((line: NewTerminalLine) => {
    setLines((prev) => [...prev, { ...line, id: crypto.randomUUID() } as TerminalLine]);
  }, []);

  const ensureWorker = useCallback(() => {
    if (workerRef.current) return workerRef.current;

    const worker = new Worker(new URL('../worker/runner.worker.ts', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;
    worker.postMessage({ type: 'repl-reset' });
    return worker;
  }, []);

  const exec = useCallback(
    (input: string) => {
      const trimmed = input.trim();
      if (!trimmed || busy) return;

      const commandId = commandIdRef.current + 1;
      commandIdRef.current = commandId;
      setBusy(true);
      appendLine({ kind: 'prompt', text: trimmed });

      if (historyRef.current.at(-1) !== trimmed) {
        historyRef.current.push(trimmed);
      }
      historyIndexRef.current = historyRef.current.length;

      const worker = ensureWorker();

      clearTimeoutRef();
      timeoutRef.current = window.setTimeout(() => {
        if (commandId !== commandIdRef.current) return;
        detachWorker();
        setBusy(false);
        appendLine({ kind: 'runtime-error', text: 'Execution timed out' });
      }, REPL_TIMEOUT_MS);

      worker.onmessage = (event: MessageEvent<WorkerOutMessage>) => {
        if (commandId !== commandIdRef.current) return;

        const message = event.data;

        if (message.type === 'console') {
          appendLine({ kind: message.level, text: message.args.join(' ') });
          return;
        }

        if (message.type === 'result') {
          appendLine({ kind: 'result', text: message.value });
          return;
        }

        if (message.type === 'output-limit') {
          clearTimeoutRef();
          setBusy(false);
          detachWorker();
          appendLine({ kind: 'runtime-error', text: 'Output limit reached (500 lines).' });
          return;
        }

        if (message.type === 'error') {
          clearTimeoutRef();
          setBusy(false);
          appendLine({
            kind: 'runtime-error',
            text: message.message,
            line: message.line,
          });
          return;
        }

        if (message.type === 'done') {
          clearTimeoutRef();
          setBusy(false);
        }
      };

      worker.onerror = () => {
        if (commandId !== commandIdRef.current) return;
        clearTimeoutRef();
        setBusy(false);
        detachWorker();
        appendLine({ kind: 'runtime-error', text: 'Terminal worker failed' });
      };

      worker.postMessage({ type: 'repl-exec', input: trimmed });
    },
    [appendLine, busy, clearTimeoutRef, detachWorker, ensureWorker],
  );

  const clear = useCallback(() => {
    detachWorker();
    setBusy(false);
    setLines([]);
    historyRef.current = [];
    historyIndexRef.current = -1;
  }, [detachWorker]);

  const resetSession = useCallback(() => {
    detachWorker();
    setBusy(false);
    historyRef.current = [];
    historyIndexRef.current = -1;
    setLines([
      {
        id: crypto.randomUUID(),
        kind: 'log',
        text: 'Session reset. Variables cleared.',
      },
    ]);
  }, [detachWorker]);

  const getPreviousInput = useCallback(() => {
    if (historyRef.current.length === 0) return '';
    historyIndexRef.current = Math.max(0, historyIndexRef.current - 1);
    return historyRef.current[historyIndexRef.current] ?? '';
  }, []);

  const getNextInput = useCallback(() => {
    if (historyRef.current.length === 0) return '';
    historyIndexRef.current = Math.min(historyRef.current.length, historyIndexRef.current + 1);
    if (historyIndexRef.current >= historyRef.current.length) return '';
    return historyRef.current[historyIndexRef.current] ?? '';
  }, []);

  useEffect(() => detachWorker, [detachWorker]);

  return {
    lines,
    busy,
    exec,
    clear,
    resetSession,
    getPreviousInput,
    getNextInput,
  };
}
