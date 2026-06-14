import { useRef, useState, type ReactNode } from "react";

interface Action {
  icon: ReactNode;
  bg: string;
}

interface Props {
  children: ReactNode;
  /** Drag right → reveals this on the left, fires on release past threshold. */
  leftAction?: Action;
  onSwipeRight?: () => void;
  /** Drag left → reveals this on the right, fires on release past threshold. */
  rightAction?: Action;
  onSwipeLeft?: () => void;
  /** Background of the sliding row (so it covers the action beneath). */
  bg?: string;
}

const THRESHOLD = 72;
const MAX = 110;

export function SwipeRow({
  children,
  leftAction,
  onSwipeRight,
  rightAction,
  onSwipeLeft,
  bg = "var(--bg)",
}: Props) {
  const [dx, setDx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const dir = useRef<"none" | "h" | "v">("none");
  const dragged = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    start.current = { x: e.clientX, y: e.clientY };
    dir.current = "none";
    dragged.current = false;
    setAnimating(false);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!start.current) return;
    const ddx = e.clientX - start.current.x;
    const ddy = e.clientY - start.current.y;
    if (dir.current === "none") {
      if (Math.abs(ddx) < 6 && Math.abs(ddy) < 6) return;
      dir.current = Math.abs(ddx) > Math.abs(ddy) ? "h" : "v";
      if (dir.current === "h") {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }
    }
    if (dir.current !== "h") return;
    // Keep this gesture on the row — don't let an outer page-swipe also react.
    e.stopPropagation();
    dragged.current = true;
    // Clamp; ignore directions without an action.
    let next = ddx;
    if (next > 0 && !leftAction) next = 0;
    if (next < 0 && !rightAction) next = 0;
    setDx(Math.max(-MAX, Math.min(MAX, next)));
  };

  const finish = () => {
    if (dir.current === "h") {
      if (dx >= THRESHOLD && onSwipeRight) onSwipeRight();
      else if (dx <= -THRESHOLD && onSwipeLeft) onSwipeLeft();
    }
    start.current = null;
    dir.current = "none";
    setAnimating(true);
    setDx(0);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Coloured action revealed beneath the row as it slides */}
      {dx > 0 && leftAction && (
        <div
          className="absolute inset-0 flex items-center justify-start pl-6 text-white"
          style={{ background: leftAction.bg }}
        >
          {leftAction.icon}
        </div>
      )}
      {dx < 0 && rightAction && (
        <div
          className="absolute inset-0 flex items-center justify-end pr-6 text-white"
          style={{ background: rightAction.bg }}
        >
          {rightAction.icon}
        </div>
      )}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
        onClickCapture={(e) => {
          if (dragged.current) {
            e.preventDefault();
            e.stopPropagation();
            dragged.current = false;
          }
        }}
        className="select-none"
        style={{
          transform: `translateX(${dx}px)`,
          transition: animating ? "transform 0.22s cubic-bezier(0.2,0.7,0.2,1)" : "none",
          touchAction: "pan-y",
          background: bg,
        }}
      >
        {children}
      </div>
    </div>
  );
}
