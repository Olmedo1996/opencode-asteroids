# AGENTS.md

Static, dependency-free Asteroids clone. No build, bundler, tests, lint, or package manager. The entire app is `index.html` + `game.js` + `favicon.svg` served as-is.

## Running

Open `index.html` directly in a browser, or `npx serve .` (no `package.json`, so any static server works). Canvas is a fixed 800x600; world is toroidal (`wrap()` in `game.js`).

## Architecture

All logic lives in one file, `game.js`, in this top-down order — read it linearly:

1. Canvas/input setup — `keys` (held) + `justPressed`/`pressed()` (edge-triggered, single-frame). `pressed()` must be called once per frame; it clears the flag.
2. Utils: `wrap`, `dist`, `rand`, `randInt`.
3. Entities (classes): `Bullet`, `Asteroid`, `Ship`, `Particle`. Each has `update(dt)` + `draw()`.
4. Game state: module-level `let`s (`ship, bullets, asteroids, particles, score, lives, level, state, deadTimer`).
5. State machine in `update(dt)`: `'playing'` → `'dead'` (respawn timer) → `'gameover'` (Space restarts via `initGame()`).
6. `loop(ts)` — fixed timestep via `requestAnimationFrame`; `dt` clamped to 0.05s.

## Conventions

- Frame-rate-independent: all motion uses `dt` (seconds). Never use raw pixel/frame increments.
- Asteroid sizes are integers 1/2/3 indexed into parallel arrays `RADII` / `SPEEDS` / `POINTS` (`game.js:61`). Size 3 spawns at level start; `split()` decrements size and returns 2 children; size 1 yields none.
- Traditional asteroid scoring is inverted vs. README: small=100, medium=50, large=20 (see `POINTS`). Trust the code.
- Collision uses `dist(a,b) < radius`; ship-vs-asteroid uses `a.radius * 0.82` as a forgiveness factor (`game.js:342`).
- New level triggers when `asteroids.length === 0`; spawns `3 + level` asteroids.
- Canvas draws in z-order: particles → asteroids → bullets → ship → HUD.
- Code style: no semicolons except to disambiguate, camelCase, `'use strict'`, Spanish UI strings, ASCII art section dividers. Match existing style.

## Gotchas

- No tests, lint, or typecheck — verification is manual (play the game in a browser).
- No backend / no persistence: score and lives live only in memory for the session.
- `pressed('Space')` drives both shooting (playing state) and restart (gameover state) — edge-triggered, so holding Space fires once per press, not continuously.