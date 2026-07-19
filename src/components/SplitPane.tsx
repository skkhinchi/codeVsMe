import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';

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
  initialLeftPercent = 55,
  minPercent = 20,
  maxPercent = 80,
}: SplitPaneProps) {
  const [leftPercent, setLeftPercent] = useState(initialLeftPercent);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const activePointerId = useRef<number | null>(null);

  const updateFromClientX = useCallback(
    (clientX: number) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0) return;
      const next = ((clientX - rect.left) / rect.width) * 100;
      setLeftPercent(Math.min(maxPercent, Math.max(minPercent, next)));
    },
    [maxPercent, minPercent],
  );

  const endDrag = useCallback((target: HTMLElement, pointerId: number) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    activePointerId.current = null;
    setDragging(false);
    document.body.classList.remove('is-resizing');
    if (target.hasPointerCapture(pointerId)) {
      target.releasePointerCapture(pointerId);
    }
  }, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    draggingRef.current = true;
    activePointerId.current = event.pointerId;
    setDragging(true);
    document.body.classList.add('is-resizing');
    event.currentTarget.setPointerCapture(event.pointerId);
    updateFromClientX(event.clientX);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || activePointerId.current !== event.pointerId) return;
    event.preventDefault();
    updateFromClientX(event.clientX);
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== event.pointerId) return;
    endDrag(event.currentTarget, event.pointerId);
  };

  const onPointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== event.pointerId) return;
    endDrag(event.currentTarget, event.pointerId);
  };

  const onLostPointerCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== event.pointerId) return;
    draggingRef.current = false;
    activePointerId.current = null;
    setDragging(false);
    document.body.classList.remove('is-resizing');
  };

  return (
    <div
      ref={containerRef}
      className={`split-pane ${dragging ? 'split-pane--dragging' : ''}`}
    >
      <section
        className="split-pane__panel"
        style={{
          flex: `0 0 ${leftPercent}%`,
          width: `${leftPercent}%`,
          maxWidth: `${leftPercent}%`,
        }}
      >
        {left}
      </section>
      <div
        className="split-pane__divider"
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={Math.round(leftPercent)}
        aria-label="Resize panels"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onLostPointerCapture={onLostPointerCapture}
        onDoubleClick={() => setLeftPercent(initialLeftPercent)}
      />
      <section className="split-pane__panel split-pane__panel--grow">{right}</section>
    </div>
  );
}
