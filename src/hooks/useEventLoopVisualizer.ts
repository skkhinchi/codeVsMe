import { useCallback, useEffect, useRef, useState } from 'react';
import { recordEventLoopTrace } from '../eventLoop/recordTrace';
import type { ExecutionTrace, TraceSpeed, TraceSnapshot, TraceStep } from '../eventLoop/types';

const SPEED_MS: Record<TraceSpeed, number> = {
  0.25: 1600,
  0.5: 900,
  1: 500,
  2: 220,
};

export function useEventLoopVisualizer() {
  const [trace, setTrace] = useState<ExecutionTrace | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<TraceSpeed>(1);
  const [recording, setRecording] = useState(false);
  const playTimerRef = useRef<number | null>(null);

  const steps = trace?.steps ?? [];
  const currentStep: TraceStep | null = steps[stepIndex] ?? null;
  const snapshot: TraceSnapshot | null = currentStep?.snapshot ?? null;

  const clearPlayTimer = useCallback(() => {
    if (playTimerRef.current !== null) {
      window.clearTimeout(playTimerRef.current);
      playTimerRef.current = null;
    }
  }, []);

  const resetPlayback = useCallback(() => {
    clearPlayTimer();
    setPlaying(false);
    setStepIndex(0);
  }, [clearPlayTimer]);

  const clearTrace = useCallback(() => {
    clearPlayTimer();
    setPlaying(false);
    setTrace(null);
    setStepIndex(0);
  }, [clearPlayTimer]);

  const recordFromCode = useCallback(
    async (code: string) => {
      clearPlayTimer();
      setPlaying(false);
      setRecording(true);
      try {
        const next = await recordEventLoopTrace(code);
        setTrace(next);
        setStepIndex(0);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setTrace({
          steps: [
            {
              id: 'err',
              index: 0,
              title: 'Trace failed',
              explanation: message,
              snapshot: {
                callStack: [],
                webApis: [],
                microtasks: [],
                macrotasks: [],
                consoleLines: [],
                activeLine: null,
                eventLoopPhase: 'idle',
                highlightPath: null,
              },
            },
          ],
          source: code,
          error: message,
        });
        setStepIndex(0);
      } finally {
        setRecording(false);
      }
    },
    [clearPlayTimer],
  );

  const nextStep = useCallback(() => {
    setStepIndex((i) => Math.min(i + 1, Math.max(steps.length - 1, 0)));
  }, [steps.length]);

  const prevStep = useCallback(() => {
    setStepIndex((i) => Math.max(i - 1, 0));
  }, []);

  const jumpTo = useCallback(
    (index: number) => {
      clearPlayTimer();
      setPlaying(false);
      setStepIndex(Math.max(0, Math.min(index, Math.max(steps.length - 1, 0))));
    },
    [clearPlayTimer, steps.length],
  );

  useEffect(() => {
    clearPlayTimer();
    if (!playing || steps.length === 0) return;

    if (stepIndex >= steps.length - 1) {
      setPlaying(false);
      return;
    }

    playTimerRef.current = window.setTimeout(() => {
      setStepIndex((i) => {
        if (i >= steps.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, SPEED_MS[speed]);

    return clearPlayTimer;
  }, [playing, stepIndex, speed, steps.length, clearPlayTimer]);

  return {
    trace,
    steps,
    stepIndex,
    currentStep,
    snapshot,
    playing,
    speed,
    recording,
    setSpeed,
    setPlaying,
    nextStep,
    prevStep,
    jumpTo,
    resetPlayback,
    clearTrace,
    recordFromCode,
  };
}

export type EventLoopVisualizerApi = ReturnType<typeof useEventLoopVisualizer>;
