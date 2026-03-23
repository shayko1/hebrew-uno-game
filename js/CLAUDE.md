# js/ — Game Modules

All game logic lives here as ES modules imported by `app.js`.

## Module Dependency Order
```
app.js (entry point)
  ├── constants.js (no deps)
  ├── deck.js (← constants)
  ├── state.js (← constants, deck)
  ├── bot.js (← constants)
  ├── ui.js (← constants)
  ├── animations.js (no deps)
  ├── sounds.js (no deps)
  ├── persistence.js (← state)
  ├── stats.js (no deps)
  └── pwa.js (no deps)
```

## Rules
- `state.js` must remain pure — no DOM access, no side effects
- `ui.js` reads state and writes DOM — never modifies game state
- `app.js` is the only module that wires events to state changes
- All user-facing strings must be in Hebrew (defined in `constants.js`)
- No external npm imports — vanilla JS only
