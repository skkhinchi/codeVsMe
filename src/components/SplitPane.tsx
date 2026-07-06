import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

type SplitPaneProps = {
  left: ReactNode;
  right: ReactNode;
  initialLeftPercent?: number;
  minPercent?: number;
  maxPercent?: number;
};

export function SplitPane({
  left,
  right,
  initialLeftPercent = 50,
  minPercent = 25,
  maxPercent = 75,
}: SplitPaneProps) {
  const [leftPercent, setLeftPercent] = useState(initialLeftPercent);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const onPointerMove = useCallback(
    (event: PointerEvent) => {
      if (!draggingRef.current || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const next = ((event.clientX - rect.left) / rect.width) * 100;
      setLeftPercent(Math.min(maxPercent, Math.max(minPercent, next)));
    },
    [maxPercent, minPercent],
  );

  const stopDragging = useCallback(() => {
    draggingRef.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    const move = (event: PointerEvent) => onPointerMove(event);
    const up = () => stopDragging();

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);

    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [onPointerMove, stopDragging]);

  const startDragging = () => {
    draggingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  return (
    <div ref={containerRef} className="split-pane">
      <section className="split-pane__panel" style={{ flexBasis: `${leftPercent}%` }}>
        {left}
      </section>
      <div
        className="split-pane__divider"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panels"
        onPointerDown={startDragging}
      />
      <section className="split-pane__panel split-pane__panel--grow">{right}</section>
    </div>
  );
}
