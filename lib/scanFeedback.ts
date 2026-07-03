export type ScanFeedbackTone = 'success' | 'warning' | 'error'

interface ScanFeedbackOptions {
  tone: ScanFeedbackTone
  sound?: boolean
  vibrate?: boolean
}

const vibrationPattern: Record<ScanFeedbackTone, number | number[]> = {
  success: 80,
  warning: [80, 60, 120],
  error: [180, 80, 180],
}

const frequency: Record<ScanFeedbackTone, number> = {
  success: 880,
  warning: 440,
  error: 220,
}

export function triggerScanFeedback({ tone, sound = true, vibrate = true }: ScanFeedbackOptions) {
  if (typeof window === 'undefined') return

  if (vibrate && 'navigator' in window && 'vibrate' in window.navigator) {
    window.navigator.vibrate(vibrationPattern[tone])
  }

  if (!sound) return

  const AudioContextCtor = window.AudioContext || window.webkitAudioContext
  if (!AudioContextCtor) return

  try {
    const context = new AudioContextCtor()
    const oscillator = context.createOscillator()
    const gain = context.createGain()

    oscillator.type = tone === 'success' ? 'sine' : 'square'
    oscillator.frequency.value = frequency[tone]
    gain.gain.setValueAtTime(0.0001, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.12)

    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.14)

    oscillator.addEventListener('ended', () => {
      void context.close()
    })
  } catch {
    // Some mobile browsers block audio until user interaction; vibration still provides feedback.
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}
