import { registerSW } from 'virtual:pwa-register'
import { createReloadGate } from './reload-gate'

/** How often to ask the server whether a new build has been published. */
const CHECK_INTERVAL_MS = 60 * 60 * 1000

const gate = createReloadGate(true)

/**
 * Lets the app veto a pending reload, and take it as soon as the veto lifts.
 * Called with the current state whenever it changes.
 */
export function setReloadAllowed(allowed: boolean): void {
  gate.setAllowed(allowed)
}

/**
 * Registers the service worker and keeps a long-lived kiosk tab up to date.
 *
 * `registerType: 'autoUpdate'` installs a new worker and claims the page, and
 * then — unless told otherwise — reloads the document the moment the new worker
 * activates. On a wall-mounted tablet that reload is dangerous: running
 * countdowns live only in memory, so it silently returns both machines to
 * READY with nobody watching and the waffles still in the iron.
 *
 * `onNeedReload` is the hook that takes that reload over. It MUST be
 * `onNeedReload`, not `onNeedRefresh`: in autoUpdate mode the plugin only
 * consults `onNeedRefresh` in its prompt branch, so using it leaves the
 * unconditional `window.location.reload()` in place and this gate inert.
 * updates.test.ts pins that down.
 */
export function registerUpdates(): void {
  registerSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      // A long-lived kiosk tab never navigates, so nothing would otherwise ask
      // the server whether a newer build exists.
      setInterval(() => {
        // Pointless while offline, and an unhandled rejection every hour on
        // flaky kitchen wifi is worse than skipping the check.
        if (navigator.onLine) void registration.update().catch(() => {})
      }, CHECK_INTERVAL_MS)
    },
    onNeedReload() {
      gate.request(() => window.location.reload())
    },
  })
}
