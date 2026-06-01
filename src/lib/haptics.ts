// Light haptic feedback. Works on Android/Chrome; iOS Safari ignores it
// (no Web Vibration API), so this is a graceful no-op there.
export function haptic(pattern: number | number[] = 8) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
}

export function hapticSuccess() {
  haptic([10, 30, 18]);
}
