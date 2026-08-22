import { useEffect, useRef, useState } from "react";
import { haptic, hapticSuccess } from "../lib/haptics";

interface RowDef {
  id: string;
  node: React.ReactNode;
}

interface Props {
  rows: RowDef[];
  onReorder: (orderedIds: string[]) => void;
}

const HOLD_MS = 350;
const MOVE_TOLERANCE = 10;

/** Long-press a row to lift it, drag vertically to reorder, release to drop. */
export function ReorderList({ rows, onReorder }: Props) {
  const [drag, setDrag] = useState<{ idx: number; dy: number; target: number } | null>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const heights = useRef<number[]>([]);
  const pressed = useRef<{
    idx: number;
    x: number;
    y: number;
    pointerId: number;
    el: HTMLElement;
  } | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dragRef = useRef(drag);
  dragRef.current = drag;
  const suppressClick = useRef(false);

  // While dragging, block native scroll (finger is stationary during the hold,
  // so the browser hasn't committed to scrolling and preventDefault works).
  const blockScroll = useRef((e: TouchEvent) => e.preventDefault());
  useEffect(() => {
    const block = blockScroll.current;
    return () => document.removeEventListener("touchmove", block);
  }, []);

  const liftRow = () => {
    const p = pressed.current;
    if (!p) return;
    heights.current = rowRefs.current.map((el) => el?.offsetHeight ?? 0);
    try {
      p.el.setPointerCapture(p.pointerId);
    } catch {
      /* capture unsupported */
    }
    document.addEventListener("touchmove", blockScroll.current, { passive: false });
    haptic(12);
    setDrag({ idx: p.idx, dy: 0, target: p.idx });
  };

  const computeTarget = (idx: number, dy: number) => {
    const h = heights.current;
    let target = idx;
    if (dy > 0) {
      let acc = 0;
      for (let i = idx + 1; i < h.length; i++) {
        acc += h[i];
        if (dy > acc - h[i] / 2) target = i;
        else break;
      }
    } else {
      let acc = 0;
      for (let i = idx - 1; i >= 0; i--) {
        acc += h[i];
        if (-dy > acc - h[i] / 2) target = i;
        else break;
      }
    }
    return target;
  };

  const onDown = (idx: number) => (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pressed.current = {
      idx,
      x: e.clientX,
      y: e.clientY,
      pointerId: e.pointerId,
      el: e.currentTarget as HTMLElement,
    };
    clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(liftRow, HOLD_MS);
  };

  const onMove = (e: React.PointerEvent) => {
    const p = pressed.current;
    if (!p) return;
    if (!dragRef.current) {
      // Moved before the hold finished — this is a scroll/swipe, not a lift.
      if (
        Math.abs(e.clientX - p.x) > MOVE_TOLERANCE ||
        Math.abs(e.clientY - p.y) > MOVE_TOLERANCE
      ) {
        clearTimeout(holdTimer.current);
        pressed.current = null;
      }
      return;
    }
    const dy = e.clientY - p.y;
    setDrag((d) => (d ? { ...d, dy, target: computeTarget(d.idx, dy) } : d));
  };

  const finish = () => {
    clearTimeout(holdTimer.current);
    document.removeEventListener("touchmove", blockScroll.current);
    pressed.current = null;
    const d = dragRef.current;
    if (!d) return;
    // A drag happened — swallow the click that follows pointerup.
    suppressClick.current = true;
    setTimeout(() => (suppressClick.current = false), 120);
    if (d.target !== d.idx) {
      const ids = rows.map((r) => r.id);
      const [moved] = ids.splice(d.idx, 1);
      ids.splice(d.target, 0, moved);
      onReorder(ids);
      hapticSuccess();
    }
    setDrag(null);
  };

  return (
    <div
      onClickCapture={(e) => {
        if (suppressClick.current) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      {rows.map((r, i) => {
        let style: React.CSSProperties = {};
        if (drag) {
          const lifted = heights.current[drag.idx] ?? 0;
          if (i === drag.idx) {
            style = {
              transform: `translateY(${drag.dy}px) scale(1.02)`,
              zIndex: 10,
              position: "relative",
              boxShadow: "var(--shadow)",
              background: "var(--bg-elevated)",
            };
          } else {
            let shift = 0;
            if (drag.target > drag.idx && i > drag.idx && i <= drag.target) shift = -lifted;
            else if (drag.target < drag.idx && i < drag.idx && i >= drag.target) shift = lifted;
            style = { transform: `translateY(${shift}px)`, transition: "transform 0.18s ease" };
          }
        }
        return (
          <div
            key={r.id}
            ref={(el) => {
              rowRefs.current[i] = el;
            }}
            onPointerDown={onDown(i)}
            onPointerMove={onMove}
            onPointerUp={finish}
            onPointerCancel={finish}
            onContextMenu={(e) => {
              if (dragRef.current) e.preventDefault();
            }}
            style={{
              ...style,
              borderTop: i > 0 ? "1px solid var(--border)" : undefined,
              userSelect: "none",
              WebkitUserSelect: "none",
              WebkitTouchCallout: "none",
            }}
          >
            {r.node}
          </div>
        );
      })}
    </div>
  );
}
