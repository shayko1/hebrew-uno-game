# Quality-First Sprint — Design Document

**Goal:** Make the Hebrew UNO card game production-ready by adding automated tests, accessibility, error handling, PWA polish, and lightweight analytics — without changing the vanilla JS, no-build-step architecture.

**Target Audience:** Hebrew-speaking families (parents + kids, all ages)

**Architecture:** Vanilla HTML5/CSS3/JavaScript with ES modules. No build tools. GitHub Pages deployment.

---

## 1. Automated Tests

### Approach
A single `tests/test.html` page that imports game modules and runs assertions in the browser. No npm, no Jest — stays vanilla. A companion `tests/runner.js` provides a minimal test framework (`describe`, `it`, `assert`).

### What to test

**deck.js:**
- `createDeck()` returns exactly 108 cards
- Correct distribution: 76 number cards, 24 special cards, 8 wild cards
- Each color has cards 0-9 (one 0, two of each 1-9)
- Each color has 2 Skip, 2 Reverse, 2 Draw Two
- 4 Wild and 4 Wild Draw Four cards
- `shuffle()` produces different order (statistical check)

**state.js:**
- `createGameState()` deals 7 cards per player, sets correct initial state
- `canPlayCard()` matches by color, number, and special type
- Wild cards always playable
- `playCard()` for Skip: skips next player
- `playCard()` for Reverse: flips direction (acts as skip in 2-player)
- `playCard()` for Draw Two: next player draws 2, gets skipped
- `playCard()` for Wild Draw Four: next player draws 4, gets skipped, color changes
- `drawCards()` draws from pile, reshuffles discard when empty
- Game over detected when a hand is empty
- `nextPlayerIndex()` wraps correctly for 2, 3, 4 players

**bot.js:**
- Prefers number cards over special cards
- Prefers special cards over wild cards
- Chooses most frequent color after wild
- Returns null when no playable card exists

### What NOT to test
- UI rendering (visual, tested manually)
- Animations and sounds (browser-dependent)
- Service worker (tested via browser DevTools)

---

## 2. Accessibility

### ARIA Labels
- Draw pile: `aria-label="שלוף קלף"` (Draw a card)
- UNO button: `aria-label="קרא אונו"` (Call UNO)
- Restart button: `aria-label="משחק חדש"` (New game)
- Color picker buttons: `aria-label="אדום/כחול/ירוק/צהוב"` (Red/Blue/Green/Yellow)
- Player count buttons: `aria-label="2/3/4 שחקנים"` (2/3/4 players)
- Each card in hand: `aria-label` describing color and value (e.g., "אדום 7")

### Keyboard Navigation
- `Tab` cycles through playable cards in hand
- `Enter` plays the focused card
- `Escape` closes the color picker overlay
- Arrow keys navigate within color picker
- `tabindex="0"` on all interactive card elements
- Focus ring visible on keyboard navigation (`:focus-visible`)

### Screen Reader Support
- `aria-live="polite"` region for turn announcements ("התור שלך!", "שחקן 2 משחק...")
- Announce special card effects ("שחקן 3 משחק +2!")
- Announce game result on end screen

### Reduced Motion
- `@media (prefers-reduced-motion: reduce)` disables:
  - Confetti animation
  - Card hover scale transitions
  - UNO popup bounce
  - Action feedback animations
  - Toast slide-in
- Functional elements still appear, just without motion

---

## 3. Error Handling

### Web Audio API
- Wrap `AudioContext` creation in try/catch
- If audio fails, set a flag and skip all sound calls silently
- No error toasts for audio (it's optional enhancement)

### Service Worker
- Wrap `navigator.serviceWorker.register()` in try/catch
- Log failure to console, don't show user-facing error

### Game State Safety
- Add guard checks in `playCard()` and `drawCards()` for invalid card IDs
- Prevent double-play during bot turns (already partially handled with `pendingAction`)
- Handle empty draw pile + empty discard pile edge case

### Browser Compatibility
- Add fallback for `env()` CSS function (older browsers)
- `dvh` fallback already uses `vh` (already in place)

---

## 4. PWA Polish

### Install Prompt
- Listen for `beforeinstallprompt` event
- Show a custom "Install as App" banner on the welcome screen
- Dismiss after install or after 3 visits (stored in localStorage)

### Service Worker Updates
- Detect when a new service worker is waiting
- Show a toast: "גרסה חדשה זמינה — רענן" (New version available — refresh)
- Click to `window.location.reload()`

### Manifest Improvements
- Add `screenshots` array for richer install UI on Android
- Add `categories: ["games"]`
- Verify `scope` is set correctly

---

## 5. Lightweight Analytics

### Approach
Privacy-friendly, localStorage-based game statistics. No external services, no personal data, no cookies.

### What to track (stored in localStorage)
- Total games played
- Total games won / lost
- Win rate percentage
- Most common player count (2/3/4)
- Longest win streak
- Average turns per game (approximately)

### Display
- Add a small "Stats" button on the welcome screen
- Opens a simple stats overlay showing the tracked metrics
- "Reset Stats" button to clear

### No external analytics
The user skipped SEO/sharing, so no Plausible or external tracking. Pure local stats for personal enjoyment.

---

## Scope Exclusions

The following are explicitly **not** in this sprint:
- SEO and Open Graph meta tags (skipped by user)
- Social sharing features
- New game features (multiplayer, scoring, difficulty)
- Build tools or bundling
- i18n/multi-language support
- Online multiplayer or backend

---

## Implementation Order

1. Automated tests (foundation for safe changes)
2. Error handling (prevents crashes during accessibility work)
3. Accessibility (ARIA, keyboard, reduced motion)
4. PWA polish (install prompt, update detection)
5. Analytics (game stats display)

Each section is independently deployable.
