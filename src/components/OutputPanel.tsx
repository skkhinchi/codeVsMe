import { useEffect, useRef } from 'react';
import type { OutputLine } from '../hooks/useCodeRunner';

type OutputPanelProps = {
  lines: OutputLine[];
};

function formatLine(line: OutputLine): string {
  if (line.line !== undefined) {
    return `Line ${line.line}: ${line.text}`;
  }
  return line.text;
}

export function OutputPanel({ lines }: OutputPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [lines]);

  return (
    <div ref={scrollRef} className="output-panel">
      {lines.length === 0 ? (
        <p className="output-empty">Run your code to see output here.</p>
      ) : (
        lines.map((line) => (
          <div key={line.id} className={`output-line output-line--${line.kind}`}>
            {formatLine(line)}
          </div>
        ))
      )}
    </div>
  );
}
