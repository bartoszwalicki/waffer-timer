import { useEffect, useState } from 'react'
import { SettingsPage } from './components/SettingsPage'
import { TimerPanel } from './components/TimerPanel'
import { TopBar } from './components/TopBar'
import { useAlarm } from './hooks/useAlarm'
import { useFullscreen } from './hooks/useFullscreen'
import { useSettings } from './hooks/useSettings'
import { useTimer } from './hooks/useTimer'
import { useWakeLock } from './hooks/useWakeLock'
import { playAlarm, unlockAudio, vibrate } from './lib/audio'
import { DEFAULT_SETTINGS } from './lib/storage'

export default function App() {
  const { settings, update, updateTimer, stepTimerDuration } = useSettings()
  const [showSettings, setShowSettings] = useState(false)

  const [first, second] = settings.timers
  const timerOne = useTimer(first.durationMs)
  const timerTwo = useTimer(second.durationMs)

  useAlarm(timerOne, 1, settings.beepDurationMs)
  useAlarm(timerTwo, 2, settings.beepDurationMs)

  const wakeLock = useWakeLock(settings.wakeLock)
  const fullscreen = useFullscreen()

  // Tablet browsers keep an AudioContext suspended until a user gesture, and a
  // suspended context plays nothing at all — silently. Unlocking on the first
  // touch anywhere means the alarm is armed however the operator got started.
  useEffect(() => {
    const onFirstGesture = () => unlockAudio()
    document.addEventListener('pointerdown', onFirstGesture, { once: true })
    return () => document.removeEventListener('pointerdown', onFirstGesture)
  }, [])

  if (showSettings) {
    return (
      <SettingsPage
        settings={settings}
        onUpdate={update}
        onUpdateTimer={updateTimer}
        wakeLock={wakeLock}
        onClose={() => setShowSettings(false)}
        onTestAlarm={(voice) => {
          unlockAudio()
          playAlarm(voice)
          vibrate(voice)
        }}
      />
    )
  }

  return (
    <div className="flex h-full w-full flex-col gap-2 p-2 sm:gap-3 sm:p-3">
      <TopBar
        theme={settings.theme}
        onToggleTheme={() => update({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
        fullscreenSupported={fullscreen.supported}
        fullscreenActive={fullscreen.active}
        onToggleFullscreen={fullscreen.toggle}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* Side by side in landscape, stacked in portrait — a wall-mounted tablet
          could be either way up, and two half-width panels in portrait would
          squeeze the digits down to nothing. */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 sm:gap-3 landscape:flex-row">
        <TimerPanel
          accent={1}
          name={first.name.trim() || DEFAULT_SETTINGS.timers[0].name}
          timer={timerOne}
          stepSeconds={settings.stepSeconds}
          onStepDuration={(delta) => stepTimerDuration(0, delta)}
        />
        <TimerPanel
          accent={2}
          name={second.name.trim() || DEFAULT_SETTINGS.timers[1].name}
          timer={timerTwo}
          stepSeconds={settings.stepSeconds}
          onStepDuration={(delta) => stepTimerDuration(1, delta)}
        />
      </div>
    </div>
  )
}
