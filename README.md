# Waffle Timer

A fullscreen PWA for a waffle station with two machines. Two large side-by-side timers, each
with its own programmed time, colour and alarm sound. Runs entirely in the browser — no backend.

**Live: https://bartoszwalicki.github.io/waffer-timer/**

## What it does

- Two independent `mm:ss` timers, side by side, one colour each.
- Each timer's target time is set with `−`/`+` steppers and persisted to `localStorage`.
- Tap a timer face, or its **START** button, to restart the countdown from the programmed value.
- At `00:00` the timer alarms with a sound unique to that machine, then keeps counting
  **negative** so you can see how overdue a waffle is.
- **RESET** returns a timer to its programmed value and silences the alarm.
- Settings (cog): alarm duration (default 15 s), screen wake lock (default on), stepper size,
  machine names.
- Light and dark themes for different ambient light.
- Installable and fully offline-capable.

## Notes for whoever maintains this

A few decisions are load-bearing and easy to undo by accident:

- **`vite.config.ts` sets `base: '/waffer-timer/'`** to match the repository name. Every asset
  URL, the manifest scope and the service worker scope depend on it.
- **`@theme static` in `src/index.css`.** Without `static`, Tailwind only emits theme variables
  it can see used in a class, while the unlayered `[data-theme='light']` block always emits all
  of them — so any colour reached from JS would work in light and silently vanish in dark.
- **Never build a class name by interpolation** (`` `text-machine-${n}` ``). Tailwind resolves
  classes by scanning source text; an interpolated name compiles in dev and is missing from the
  production CSS. `TimerPanel` uses a static lookup for exactly this reason.
- **The countdown derives from a wall-clock deadline**, it never accumulates per tick. Tablets
  throttle timers hard in background tabs, so an accumulating counter would drift or stall.
  `useTimer` uses `Date.now()` deliberately (it survives device sleep); `useAlarm` uses
  `performance.now()` deliberately (monotonic, so a clock step can't wedge the alarm on).
- **Running countdowns are in memory only**, so any reload resets both machines. Under
  `registerType: 'autoUpdate'`, vite-plugin-pwa reloads the page *itself* the moment a new worker
  activates — unless you pass **`onNeedReload`**, which hands that decision to you.
  `src/lib/updates.ts` does exactly that and routes it through `src/lib/reload-gate.ts`, which
  holds the reload until both timers are idle. It must be `onNeedReload`: `onNeedRefresh` is only
  consulted in the plugin's *prompt* branch, so using it silently leaves the plugin's own
  unconditional reload in place. `src/lib/updates.test.ts` pins this down, including the plugin
  behaviour it depends on — a unit test of the gate alone cannot catch it.
- **The digit font size divides by the label's character count.** A timer left running reaches
  `-100:00`, and the label is not a fixed width; sizing on a fixed six characters overflowed the
  panel. The `18vh` cap is what keeps two stacked panels inside a 768×1024 portrait tablet.

## Development

```bash
npm install
npm run dev        # local dev server
npm test           # unit tests for the timer/storage logic
npm run typecheck  # tsc -b
npm run build      # production build into dist/
npm run preview    # serve the production build
npm run icons      # regenerate PWA icons from scripts/icon.svg (needs sharp)
```

## Stack

Vite + React + TypeScript, Tailwind CSS v4 (`@tailwindcss/vite`, CSS-first config in
`src/index.css`), `vite-plugin-pwa` for the manifest and service worker. Alarm tones are
synthesised with the Web Audio API, so there are no audio assets to load.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which lints, tests, builds
(`tsc -b && vite build`) and publishes `dist/` to GitHub Pages.

A tablet left on the page picks up new deploys on its own: the app checks hourly and reloads —
but only once both timers are idle.

The remote must be **SSH** (`git@github.com:bartoszwalicki/waffer-timer.git`). Pushing
`.github/workflows/*` over HTTPS needs the `workflow` OAuth scope, which the local `gh` token
does not have.
