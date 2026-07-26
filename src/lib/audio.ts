/**
 * Alarm tones, synthesised rather than loaded.
 *
 * Two reasons for Web Audio over audio files: nothing to fetch, so the alarm
 * works on a cold offline start; and the two machines can be given voices that
 * differ in pitch *and* rhythm, which is what makes them tellable apart in a
 * noisy kitchen without looking up.
 */

export type Voice = 1 | 2

type Blip = {
  /** Seconds from the start of the pattern. */
  at: number
  durationSeconds: number
  frequency: number
}

type VoiceSpec = {
  type: OscillatorType
  pattern: Blip[]
}

/**
 * Machine 1 is a high, urgent double blip; machine 2 a lower, rounder triple.
 * Different pitch alone is not enough — under extraction-fan noise the rhythm
 * is what carries.
 */
const VOICES: Record<Voice, VoiceSpec> = {
  1: {
    type: 'square',
    pattern: [
      { at: 0, durationSeconds: 0.13, frequency: 880 },
      { at: 0.2, durationSeconds: 0.13, frequency: 1108 },
    ],
  },
  2: {
    type: 'triangle',
    pattern: [
      { at: 0, durationSeconds: 0.16, frequency: 523 },
      { at: 0.24, durationSeconds: 0.16, frequency: 523 },
      { at: 0.48, durationSeconds: 0.22, frequency: 392 },
    ],
  },
}

/** Peak gain per blip. Loud enough to carry, short of clipping when both fire. */
const PEAK_GAIN = 0.5

let context: AudioContext | null = null

type AudioContextConstructor = new () => AudioContext

function audioContextConstructor(): AudioContextConstructor | null {
  const w = window as unknown as {
    AudioContext?: AudioContextConstructor
    webkitAudioContext?: AudioContextConstructor
  }
  return w.AudioContext ?? w.webkitAudioContext ?? null
}

/**
 * Returns the shared AudioContext, creating it on first use.
 *
 * Tablet browsers refuse to start audio until a user gesture, so this must be
 * called from inside one. In practice every alarm is preceded by the operator
 * tapping Start, which is exactly that gesture.
 */
function getContext(): AudioContext | null {
  if (context) return context
  const Ctor = audioContextConstructor()
  if (!Ctor) return null
  try {
    context = new Ctor()
  } catch {
    // No audio hardware, or the browser refused. The visual alarm still works.
    return null
  }
  return context
}

/**
 * Unlocks audio from within a user gesture.
 *
 * A context created before any gesture starts life `suspended`, and a suspended
 * context plays nothing — silently. Calling this from every Start/Reset tap
 * means the context is always running by the time an alarm is due.
 */
export function unlockAudio(): void {
  const ctx = getContext()
  if (ctx && ctx.state !== 'running') void ctx.resume()
}

/** Plays one cycle of a machine's alarm pattern. Silent if audio is unavailable. */
export function playAlarm(voice: Voice): void {
  const ctx = getContext()
  if (!ctx) return
  if (ctx.state !== 'running') {
    // Try to recover, but do not schedule into a suspended context — the notes
    // would be swallowed and the operator would get no alarm at all.
    void ctx.resume()
    return
  }

  const spec = VOICES[voice]
  const startedAt = ctx.currentTime

  for (const blip of spec.pattern) {
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = spec.type
    oscillator.frequency.value = blip.frequency

    const from = startedAt + blip.at
    const to = from + blip.durationSeconds

    // Ramped rather than switched: an instant gain change on a square wave
    // produces an audible click on tablet speakers.
    gain.gain.setValueAtTime(0, from)
    gain.gain.linearRampToValueAtTime(PEAK_GAIN, from + 0.012)
    gain.gain.setValueAtTime(PEAK_GAIN, to - 0.02)
    gain.gain.linearRampToValueAtTime(0, to)

    oscillator.connect(gain).connect(ctx.destination)
    oscillator.start(from)
    oscillator.stop(to + 0.01)
  }
}

/** Total length of one cycle, so the repeat interval can clear it. */
export function alarmCycleSeconds(voice: Voice): number {
  const last = VOICES[voice].pattern.at(-1)
  return last ? last.at + last.durationSeconds : 0
}

/** Buzzes where supported; a silent no-op elsewhere. Backs up the sound. */
export function vibrate(voice: Voice): void {
  if (typeof navigator.vibrate !== 'function') return
  try {
    navigator.vibrate(voice === 1 ? [120, 80, 120] : [160, 90, 160, 90, 220])
  } catch {
    // Some browsers expose vibrate and then throw. Not worth surfacing.
  }
}
