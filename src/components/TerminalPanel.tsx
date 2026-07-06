import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { TerminalLine } from '../hooks/useRepl';

type TerminalPanelProps = {
  lines: TerminalLine[];
  busy: boolean;
  onExec: (input: string) => void;
  onPreviousInput: () => string;
  onNextInput: () => string;
};

function formatLine(line: TerminalLine) {
  if (line.kind === 'prompt') return `> ${line.text}`;
  if (line.kind === 'result') return `← ${line.text}`;
  if (line.kind === 'runtime-error' && line.line !== undefined) {
    return `Line ${line.line}: ${line.text}`;
  }
  return line.text;
}

export function TerminalPanel({
  lines,
  busy,
  onExec,
  onPreviousInput,
  onNextInput,
}: TerminalPanelProps) {
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [lines, busy]);

  const submit = () => {
    if (!draft.trim() || busy) return;
    onExec(draft);
    setDraft('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submit();
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setDraft(onPreviousInput());
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setDraft(onNextInput());
    }
  };

  return (
    <div className="terminal-panel">
      <div ref={scrollRef} className="terminal-panel__output">
        {lines.length === 0 ? (
          <p className="terminal-panel__empty">
            Interactive JavaScript terminal. Type expressions or statements — variables persist
            across commands.
          </p>
        ) : (
          lines.map((line) => (
            <div key={line.id} className={`terminal-line terminal-line--${line.kind}`}>
              {formatLine(line)}
            </div>
          ))
        )}
        {busy ? <div className="terminal-line terminal-line--busy">…</div> : null}
      </div>
      <form
        className="terminal-panel__input-row"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <span className="terminal-panel__prompt" aria-hidden="true">
          ›
        </span>
        <input
          className="terminal-panel__input"
          value={draft}
          placeholder="Enter JavaScript…"
          disabled={busy}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
        />
      </form>
    </div>
  );
}
