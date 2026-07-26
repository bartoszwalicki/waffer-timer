import { useCallback, useEffect, useState } from 'react'

/** Safari still only offers the prefixed form. */
type PrefixedElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void
}
type PrefixedDocument = Document & {
  webkitFullscreenElement?: Element | null
  webkitExitFullscreen?: () => Promise<void> | void
}

export type UseFullscreen = {
  supported: boolean
  active: boolean
  toggle: () => void
}

/**
 * Fullscreen toggle for use in a browser tab.
 *
 * Installed to the home screen the manifest's `display: fullscreen` already
 * covers this, so the button is a convenience for the un-installed case — and
 * on iPadOS, where the manifest is ignored, it is the only route there.
 */
export function useFullscreen(): UseFullscreen {
  const doc = typeof document === 'undefined' ? null : (document as PrefixedDocument)
  const supported =
    doc !== null &&
    (typeof doc.documentElement.requestFullscreen === 'function' ||
      typeof (doc.documentElement as PrefixedElement).webkitRequestFullscreen === 'function')

  const [active, setActive] = useState(false)

  useEffect(() => {
    if (!doc) return
    const sync = () =>
      setActive(Boolean(doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null))
    sync()
    doc.addEventListener('fullscreenchange', sync)
    doc.addEventListener('webkitfullscreenchange', sync)
    return () => {
      doc.removeEventListener('fullscreenchange', sync)
      doc.removeEventListener('webkitfullscreenchange', sync)
    }
  }, [doc])

  const toggle = useCallback(() => {
    if (!doc) return
    const isFullscreen = Boolean(doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null)

    const run = async () => {
      try {
        if (isFullscreen) {
          await (doc.exitFullscreen?.() ?? doc.webkitExitFullscreen?.())
        } else {
          const el = doc.documentElement as PrefixedElement
          await (el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.())
        }
      } catch {
        // Denied, or already in the requested state. Nothing useful to say.
      }
    }
    void run()
  }, [doc])

  return { supported, active, toggle }
}
