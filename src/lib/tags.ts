/** Deterministic, theme-friendly color for a tag (stable across sessions). */
function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function tagColor(tag: string): { color: string; soft: string } {
  const hue = hash(tag) % 360;
  // Mid lightness works on both light and dark backgrounds.
  return {
    color: `hsl(${hue} 62% 52%)`,
    soft: `hsl(${hue} 62% 52% / 0.16)`,
  };
}
