// Haptic feedback utility for iOS/Android PWA
// Uses Vibration API with fallback patterns

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'

const hapticPatterns: Record<HapticType, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 30,
  success: [10, 50, 10],
  warning: [20, 100, 20],
  error: [30, 100, 30, 100, 30],
}

export function triggerHaptic(type: HapticType = 'light'): void {
  // Check if vibration API is supported
  if (!navigator.vibrate) return

  const pattern = hapticPatterns[type]
  navigator.vibrate(pattern)
}

// Convenience functions
export const haptic = {
  light: () => triggerHaptic('light'),
  medium: () => triggerHaptic('medium'),
  heavy: () => triggerHaptic('heavy'),
  success: () => triggerHaptic('success'),
  warning: () => triggerHaptic('warning'),
  error: () => triggerHaptic('error'),
}
