# Architecture — Tsivoni (צבעוני!)

## Overview

Tsivoni is a single-page, client-side-only card game built with vanilla JavaScript ES modules. There is no build step, no framework, and no server-side logic.

## System Diagram

```
index.html (single page, 4 screens)
    │
    ├── styles.css (all styling, 3D Arcade theme)
    │
    └── js/
        ├── app.js ──────── orchestrator, event binding, game loop
        │   ├── state.js ── pure game logic (play, draw, turn flow)
        │   ├── ui.js ───── DOM rendering (cards, overlays, messages)
        │   ├── bot.js ──── AI decision-making per bot turn
        │   ├── deck.js ─── card generation, shuffle, deal
        │   ├── animations.js ── CSS/JS animations (fly, flip, confetti)
        │   ├── sounds.js ─ Web Audio API tone generation
        │   ├── persistence.js ─ localStorage save/load
        │   ├── stats.js ── win/loss statistics
        │   ├── pwa.js ──── install prompt, update handling
        │   └── constants.js ── colors, labels, symbols
        │
service-worker.js ── cache-first offline support
manifest.json ────── PWA metadata
```

## Module Responsibilities

### app.js (Orchestrator)
- Initializes game state and binds DOM events
- Manages turn flow: human → bot → bot → bot (round-robin)
- Schedules bot turns with delays for natural feel
- Handles special cards (skip, reverse, draw-two, wild)

### state.js (Pure Logic)
- Creates initial game state from deck
- Validates card plays (color/number match, wild rules)
- Returns new state objects — does not mutate
- Handles draw logic, UNO call, turn advancement

### ui.js (Rendering)
- Reads state and renders to DOM
- Card elements with color, number, special symbols
- Bot hand face-down display
- Direction indicator, turn messages, score display

### persistence.js (Storage)
- Serializes game state to JSON in localStorage
- Schema versioning for backward compatibility
- Auto-save on every state change, auto-load on page open

## Design Decisions

1. **No framework** — keeps bundle at zero, loads instantly, no build complexity
2. **Single HTML file** — all screens toggled via CSS `hidden` class
3. **ES modules** — native browser support, clean dependency graph
4. **Web Audio API** — synthesized sounds, no audio file downloads
5. **RTL-first** — Hebrew layout with `dir="rtl"` on root element

## Deployment

Push to `main` → GitHub Actions → GitHub Pages (static files, no build).
Service worker provides offline capability after first visit.
