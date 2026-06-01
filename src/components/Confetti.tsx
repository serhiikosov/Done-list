import { useEffect, useState } from "react";

const COLORS = ["#5e6ad2", "#4ec07f", "#e0a942", "#e5484d", "#7c8aff", "#36c5f0"];

/** A lightweight, dependency-free confetti burst. Re-fires whenever `fire`
 *  (a counter) increases. */
export function Confetti({ fire }: { fire: number }) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (fire <= 0) return;
    setActive(true);
    const t = setTimeout(() => setActive(false), 1300);
    return () => clearTimeout(t);
  }, [fire]);

  if (!active) return null;

  const pieces = Array.from({ length: 36 });
  return (
    <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden" aria-hidden>
      <div className="absolute left-1/2 top-[22%]">
        {pieces.map((_, i) => {
          const angle = (Math.PI * (i / pieces.length)) - Math.PI / 2 + (Math.random() - 0.5);
          const dist = 120 + Math.random() * 220;
          const dx = Math.cos(angle) * dist;
          const dy = Math.sin(angle) * dist + 180; // bias downward (gravity)
          const rot = (Math.random() * 720 - 360).toFixed(0) + "deg";
          const delay = (Math.random() * 0.08).toFixed(2) + "s";
          const size = 6 + Math.random() * 6;
          return (
            <span
              key={i}
              style={{
                position: "absolute",
                width: size,
                height: size * (Math.random() > 0.5 ? 1 : 0.5),
                background: COLORS[i % COLORS.length],
                borderRadius: Math.random() > 0.5 ? "2px" : "50%",
                // @ts-expect-error custom props
                "--dx": `${dx.toFixed(0)}px`,
                "--dy": `${dy.toFixed(0)}px`,
                "--rot": rot,
                animation: `confetti 1.2s cubic-bezier(0.15,0.6,0.3,1) ${delay} both`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
