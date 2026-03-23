# Tsivoni (צבעוני!) - Hebrew UNO Card Game

## Project Overview
Hebrew RTL UNO-style card game. Single-player vs bots (2-4 players).
PWA deployed to GitHub Pages, with Capacitor config for native builds.

**Live**: `https://<user>.github.io/hebrew-uno-game/`
**Audience**: Hebrew-speaking casual players / kids

## Tech Stack
- **Language**: Vanilla JavaScript (ES modules, no bundler, no framework)
- **Styling**: Single `styles.css` (~2000 lines, "3D Arcade" theme)
- **PWA**: Service worker with cache-first strategy, web app manifest
- **Native**: Capacitor 6 config (iOS/Android shells)
- **Deploy**: GitHub Actions → GitHub Pages (push to `main`)
- **Tests**: Custom browser-based test runner (`tests/runner.js`), no Node test framework

## Architecture

### Module Map (`js/`)
| Module | Responsibility |
|--------|---------------|
| `app.js` | Game orchestrator, event handlers, bot turn scheduling |
| `ui.js` | DOM rendering (cards, hands, center area, overlays) |
| `state.js` | Game state creation, card play/draw logic |
| `deck.js` | 108-card deck creation, shuffle, deal |
| `bot.js` | Bot AI (prefer numbers > specials > wilds) |
| `animations.js` | Card flight, flip, confetti, action feedback |
| `sounds.js` | Web Audio API tone generation (no audio files) |
| `persistence.js` | localStorage save/load with schema versioning |
| `stats.js` | Win/loss tracking in localStorage |
| `pwa.js` | Install prompt, update detection |
| `constants.js` | Colors, special types, player names, Hebrew labels |

### Screens (single `index.html`)
1. **Welcome** — mode select (local/online), match type (single/points), player count
2. **Game Table** — card table with bot areas, center pile, player hand
3. **Color Picker** — overlay dialog for wild card color selection
4. **End Screen** — winner message, scoreboard, play-again/menu buttons

### Data Flow
```
User action → app.js (event) → state.js (logic) → ui.js (render)
                                    ↓
                              persistence.js (save)
```

## Conventions
- **RTL layout**: `dir="rtl"` on `<html>`, all UI flows right-to-left
- **No build step**: Files served as-is; `<script type="module">` for ES imports
- **Hebrew-first**: All user-facing strings in Hebrew; constants in `constants.js`
- **Color-blind shapes**: Each color has a unique shape symbol (circle, square, triangle, diamond)
- **State is immutable-ish**: `state.js` returns new state objects from pure functions
- **Accessibility**: ARIA labels on interactive elements, `aria-live` for announcements

## Key Commands
```bash
# Serve locally (any static server)
npx serve .
# or
python3 -m http.server 8000

# Run tests (open in browser)
open tests/test.html

# Capacitor (native builds)
npm run cap:sync
npm run cap:open:ios
npm run cap:open:android
```

## Important Notes
- Service worker caches all assets under `/hebrew-uno-game/` path prefix
- `service-worker.js` ASSETS array must be updated when adding new files
- localStorage keys: `tsivoni_save` (game state), `tsivoni_stats` (win/loss stats)
- No server-side code — everything runs client-side
