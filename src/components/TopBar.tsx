import type { Theme } from '../lib/storage'
import { CogIcon, CollapseIcon, ExpandIcon, MoonIcon, SunIcon } from './icons'

export type TopBarProps = {
  theme: Theme
  onToggleTheme: () => void
  fullscreenSupported: boolean
  fullscreenActive: boolean
  onToggleFullscreen: () => void
  onOpenSettings: () => void
}

const BUTTON =
  'flex h-14 w-14 items-center justify-center rounded-xl border-2 border-line bg-raised text-ink active:bg-line'

/**
 * Deliberately thin — the timers are the point, so the bar gives up as little
 * vertical space as it can while keeping 56px controls.
 */
export function TopBar({
  theme,
  onToggleTheme,
  fullscreenSupported,
  fullscreenActive,
  onToggleFullscreen,
  onOpenSettings,
}: TopBarProps) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-3 px-1">
      <h1 className="truncate text-lg font-bold tracking-[0.25em] text-ink-dim uppercase">
        Waffle Timer
      </h1>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          className={BUTTON}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>

        {fullscreenSupported && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            aria-label={fullscreenActive ? 'Exit fullscreen' : 'Go fullscreen'}
            className={BUTTON}
          >
            {fullscreenActive ? <CollapseIcon /> : <ExpandIcon />}
          </button>
        )}

        <button type="button" onClick={onOpenSettings} aria-label="Settings" className={BUTTON}>
          <CogIcon />
        </button>
      </div>
    </header>
  )
}
