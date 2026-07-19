import type { TraceSnapshot, TraceSpeed, TraceStep } from '../../eventLoop/types';
import './EventLoopVisualizer.css';

type EventLoopVisualizerProps = {
  steps: TraceStep[];
  stepIndex: number;
  currentStep: TraceStep | null;
  snapshot: TraceSnapshot | null;
  playing: boolean;
  speed: TraceSpeed;
  recording: boolean;
  error?: string;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onReset: () => void;
  onSpeedChange: (speed: TraceSpeed) => void;
  onJump: (index: number) => void;
};

const SPEEDS: TraceSpeed[] = [0.25, 0.5, 1, 2];

function StackColumn({
  title,
  items,
  empty,
  variant,
}: {
  title: string;
  items: { id: string; label: string; detail?: string }[];
  empty: string;
  variant: 'stack' | 'api' | 'micro' | 'macro';
}) {
  return (
    <section className={`elv-col elv-col--${variant}`}>
      <header className="elv-col__head">{title}</header>
      <div className="elv-col__body">
        {items.length === 0 ? (
          <p className="elv-col__empty">{empty}</p>
        ) : (
          <ul className={`elv-list ${variant === 'stack' ? 'elv-list--stack' : ''}`}>
            {[...items].reverse().map((item) => (
              <li key={item.id} className="elv-card">
                <span className="elv-card__label">{item.label}</span>
                {item.detail ? <span className="elv-card__detail">{item.detail}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function EventLoopVisualizer({
  steps,
  stepIndex,
  currentStep,
  snapshot,
  playing,
  speed,
  recording,
  error,
  onPlay,
  onPause,
  onNext,
  onPrev,
  onReset,
  onSpeedChange,
  onJump,
}: EventLoopVisualizerProps) {
  if (recording) {
    return (
      <div className="elv elv--empty">
        <p>Recording event-loop trace…</p>
      </div>
    );
  }

  if (!snapshot || steps.length === 0) {
    return (
      <div className="elv elv--empty">
        <h3>Event Loop Visualizer</h3>
        <p>
          Run JavaScript to generate a real execution trace — Call Stack, Web APIs, Microtasks,
          Macrotasks, and console output step-by-step.
        </p>
        <p className="elv-hint">
          Tip: open this tab, then press Run (or Cmd/Ctrl+Enter). Active lines highlight in the editor.
        </p>
      </div>
    );
  }

  const path = snapshot.highlightPath;
  const activeLine = snapshot.activeLine;

  return (
    <div className="elv">
      <div className="elv-toolbar">
        <div className="elv-toolbar__controls">
          <button type="button" className="btn btn--small" onClick={onPrev} disabled={stepIndex <= 0}>
            Prev
          </button>
          {playing ? (
            <button type="button" className="btn btn--small btn--primary" onClick={onPause}>
              Pause
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--small btn--primary"
              onClick={onPlay}
              disabled={stepIndex >= steps.length - 1}
            >
              Play
            </button>
          )}
          <button
            type="button"
            className="btn btn--small"
            onClick={onNext}
            disabled={stepIndex >= steps.length - 1}
          >
            Next
          </button>
          <button type="button" className="btn btn--small" onClick={onReset}>
            Reset
          </button>
        </div>
        <label className="elv-speed">
          Speed
          <select value={speed} onChange={(e) => onSpeedChange(Number(e.target.value) as TraceSpeed)}>
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                {s}x
              </option>
            ))}
          </select>
        </label>
        <span className="elv-stepcount">
          Step {stepIndex + 1} / {steps.length}
          {activeLine != null ? ` · Line ${activeLine}` : ''}
        </span>
      </div>

      {error ? <p className="elv-error">{error}</p> : null}

      <div className="elv-timeline-bar" aria-label="Code execution timeline">
        <div className="elv-timeline-bar__track">
          {steps.map((step, i) => (
            <button
              key={step.id}
              type="button"
              title={step.title}
              className={`elv-timeline-bar__tick ${i === stepIndex ? 'elv-timeline-bar__tick--active' : ''} ${i < stepIndex ? 'elv-timeline-bar__tick--done' : ''}`}
              onClick={() => onJump(i)}
            />
          ))}
        </div>
      </div>

      <div className={`elv-board ${path ? `elv-board--${path}` : ''}`}>
        <StackColumn
          title="Call Stack"
          variant="stack"
          empty="Empty"
          items={snapshot.callStack.map((label, i) => ({ id: `s-${i}-${label}`, label }))}
        />
        <StackColumn
          title="Web APIs"
          variant="api"
          empty="Idle"
          items={snapshot.webApis.map((w) => ({ id: w.id, label: w.label, detail: w.detail }))}
        />
        <StackColumn
          title="Microtask Queue"
          variant="micro"
          empty="Empty"
          items={snapshot.microtasks.map((m) => ({ id: m.id, label: m.label }))}
        />
        <StackColumn
          title="Macrotask Queue"
          variant="macro"
          empty="Empty"
          items={snapshot.macrotasks.map((m) => ({ id: m.id, label: m.label }))}
        />
      </div>

      <div className="elv-loop" data-phase={snapshot.eventLoopPhase}>
        <div className="elv-loop__badge">
          <span className="elv-loop__title">Event Loop</span>
          <span className="elv-loop__phase">{snapshot.eventLoopPhase}</span>
        </div>
        <p className="elv-loop__rule">
          Stack empty → drain <strong>all</strong> microtasks → run <strong>one</strong> macrotask →
          repeat
        </p>
      </div>

      <div className="elv-bottom">
        <section className="elv-explain">
          <h4>Current step</h4>
          <p className="elv-explain__title">{currentStep?.title}</p>
          <p className="elv-explain__body">{currentStep?.explanation}</p>
          {activeLine != null ? (
            <p className="elv-explain__line">Editor line {activeLine}</p>
          ) : null}
        </section>
        <section className="elv-console">
          <h4>Console output</h4>
          <div className="elv-console__scroll">
            {snapshot.consoleLines.length === 0 ? (
              <p className="elv-col__empty">No output yet</p>
            ) : (
              snapshot.consoleLines.map((line, i) => (
                <div key={`${i}-${line}`} className="elv-console__line">
                  {line}
                </div>
              ))
            )}
          </div>
        </section>
        <section className="elv-steps">
          <h4>Timeline</h4>
          <ol className="elv-steps__list">
            {steps.map((step, i) => (
              <li key={step.id}>
                <button
                  type="button"
                  className={`elv-steps__item ${i === stepIndex ? 'elv-steps__item--active' : ''}`}
                  onClick={() => onJump(i)}
                >
                  <span className="elv-steps__idx">{i + 1}</span>
                  <span>
                    {step.title}
                    {step.snapshot.activeLine != null ? (
                      <span className="elv-steps__loc"> · L{step.snapshot.activeLine}</span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
