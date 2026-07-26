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
 * `registerType: 'autoUpdate'` installs a new worker and claims the page, but
 * it never reloads an already-loaded document — a tablet left running for weeks
 * would keep serving the build it started with. This polls for updates and
 * reloads, but only once both timers are idle.
 */
export function registerUpdates(): void {
  const update = registerSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      setInterval(() => {
        // Pointless while offline, and it would only log a failed fetch.
        if (navigator.onLine) void registration.update()
      }, CHECK_INTERVAL_MS)
    },
    onNeedRefresh() {
      gate.request(() => void update(true))
    },
  })
}
