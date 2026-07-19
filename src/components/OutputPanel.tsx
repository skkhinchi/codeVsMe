import { useEffect, useMemo, useRef } from 'react';
import type { OutputLine, RunOutcome } from '../hooks/useCodeRunner';
import { ErrorPanda } from './mascot/ErrorPanda';
import { HappyPanda } from './mascot/HappyPanda';

type OutputPanelProps = {
  lines: OutputLine[];
  runOutcome: RunOutcome;
  /** When false, skip panda mascots (e.g. mobile view). */
  showMascot?: boolean;
};

function formatLine(line: OutputLine): string {
  if (line.line !== undefined) {
    return `Line ${line.line}: ${line.text}`;
  }
  return line.text;
}

export function OutputPanel({ lines, runOutcome, showMascot = true }: OutputPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasRunError = useMemo(
    () => runOutcome === 'error' || lines.some((line) => line.kind === 'runtime-error' || line.kind === 'error'),
    [lines, runOutcome],
  );
  const showSuccess = runOutcome === 'success' && !hasRunError;
  const showError = hasRunError;
  const useMascot = showMascot && (showError || showSuccess);
  const bubbleError = useMemo(() => {
    const errorLine = [...lines].reverse().find((line) => line.kind === 'runtime-error' || line.kind === 'error');
    return errorLine ? formatLine(errorLine) : 'Execution failed.';
  }, [lines]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [lines]);

  if (lines.length === 0 && runOutcome === 'idle') {
    return (
      <div className="output-panel" role="log" aria-label="Console output" aria-live="polite">
        <div className="output-panel__scroll">
          <p className="output-empty">Run your code to see output here.</p>
        </div>
      </div>
    );
  }

  if (showError) {
    return (
      <div className="output-panel output-panel--error" role="log" aria-label="Console output" aria-live="assertive">
        <div
          ref={scrollRef}
          className={`output-panel__scroll${useMascot ? ' output-panel__scroll--with-mascot' : ''}`}
        >
          <p className="output-panel__error-kicker">Something went wrong</p>
          {lines.length === 0 ? (
            <p className="output-empty">Execution failed.</p>
          ) : (
            lines.map((line) => (
              <div key={line.id} className={`output-line output-line--${line.kind}`}>
                {formatLine(line)}
              </div>
            ))
          )}
        </div>
        {useMascot ? (
          <div className="output-panel__mascot">
            <ErrorPanda message={bubbleError} />
          </div>
        ) : null}
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="output-panel output-panel--success" role="log" aria-label="Console output" aria-live="polite">
        <div
          ref={scrollRef}
          className={`output-panel__scroll${useMascot ? ' output-panel__scroll--with-mascot' : ''}`}
        >
          <p className="output-panel__success-kicker">Code run successfully</p>
          {lines.length === 0 ? (
            <p className="output-empty">Finished with no console output.</p>
          ) : (
            lines.map((line) => (
              <div key={line.id} className={`output-line output-line--${line.kind}`}>
                {formatLine(line)}
              </div>
            ))
          )}
        </div>
        {useMascot ? (
          <div className="output-panel__mascot">
            <HappyPanda />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="output-panel" role="log" aria-label="Console output" aria-live="polite">
      <div ref={scrollRef} className="output-panel__scroll">
        {lines.map((line) => (
          <div key={line.id} className={`output-line output-line--${line.kind}`}>
            {formatLine(line)}
          </div>
        ))}
      </div>
    </div>
  );
}
