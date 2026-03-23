# tests/ — Browser-Based Test Suite

## How to Run
Open `test.html` in a browser. Results display in the page and console.

## Structure
- `runner.js` — minimal test framework (describe/it/assert)
- `test-state.js` — game state logic tests (play, draw, turns)
- `test-deck.js` — deck creation, shuffle, deal tests
- `test-bot.js` — bot AI decision tests
- `test-persistence.js` — save/load and schema migration tests
- `test-ui-shapes.js` — color-blind shape rendering tests

## Conventions
- Each test file is a self-contained ES module
- No Node.js, no npm test runner — runs in browser only
- Tests import directly from `../js/` modules
- Assert-style checks; failures throw with descriptive messages
