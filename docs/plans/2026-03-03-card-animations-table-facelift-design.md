# Card Animations & Table Facelift — Design

**Goal:** Add smooth card movement animations and visual table upgrades to make the game feel alive and polished, inspired by the official UNO mobile app.

**Approach:** CSS-only animations using transforms, transitions, and keyframes. Zero dependencies. GPU-accelerated on mobile. Clone-based flight animations with mid-air card flips.

**Constraints:** Vanilla JS, no build tools, no npm. Must respect `prefers-reduced-motion`. Must work on mobile (iOS Safari, Android Chrome).

---

## 1. Card Play Animation (Human)

When the player clicks a playable card:

1. The clicked card gets `opacity: 0` immediately (disappears from hand).
2. A **clone** of the card element is created and positioned absolutely at the card's screen coordinates (using `getBoundingClientRect()`).
3. The clone is appended to a dedicated animation overlay layer (`#animation-layer`, fixed position, pointer-events: none, z-index above game).
4. CSS transition **translates** the clone from its start position to the discard pile center (~300ms, ease-out).
5. A slight random rotation (±15°) is added during flight for natural feel.
6. On `transitionend`, the clone is removed and the discard pile renders the new top card.
7. The hand re-renders, and the gap where the card was **collapses smoothly** via CSS transition on margins/transforms.

## 2. Card Draw Animation (Human)

When the player draws from the draw pile:

1. A **card-back clone** is created at the draw pile's screen position.
2. Clone flies from draw pile to the right edge of the player's hand (~350ms, ease-out).
3. Mid-flight at ~50% progress, the card **flips** via `rotateY(180deg)` CSS transition, revealing the drawn card's face.
4. On arrival, the clone is removed and the hand re-renders with the new card included.
5. Existing hand cards shift smoothly to accommodate the new card.

The flip effect requires a `.card-flight` wrapper with `perspective` and two child faces (front = card face, back = card back) using `backface-visibility: hidden`.

## 3. Bot Play Animation

When a bot plays a card:

1. A **card-back clone** spawns at the bot's area position (using the bot area's `getBoundingClientRect()`).
2. Clone flies to the discard pile center (~300ms, ease-out).
3. Mid-flight, the card **flips** to reveal the played card face.
4. On arrival, clone is removed, discard pile updates with the played card.
5. Bot's visible card-backs reduce by one and the count badge updates.

## 4. Bot Draw Animation

When a bot draws a card:

1. A **card-back clone** spawns at the draw pile position.
2. Clone flies to the bot's area (~250ms, ease-out).
3. No flip — bot cards stay face-down.
4. On arrival, clone is removed, bot's card count increments.

## 5. Table Facelift

### 5a. Color Ring (Discard Pile)

A glowing ring around the discard pile that matches `state.currentColor`:
- Implemented as `box-shadow` with the current UNO color.
- Transitions smoothly (0.4s) when color changes.
- Pulsing glow animation for emphasis.
- Colors: red `#ED1C24`, blue `#0066B3`, green `#1DA31F`, yellow `#F5DF1D`.

### 5b. Animated Direction Indicator

Replace the static direction arrow:
- Arrow rotates 360° with CSS `transform: rotate()` transition when direction changes.
- On Reverse card play, the arrow does a dramatic spin animation.
- Clockwise (direction=1) vs counter-clockwise (direction=-1) visual.

### 5c. Draw Pile Counter

Show remaining card count on the draw pile:
- Small badge below the draw pile (same style as bot count badges).
- Pulses briefly (scale animation) when cards drop below 10.
- Updates in real-time as cards are drawn.

### 5d. Turn Indicator Enhancement

Make the active player glow more visible:
- Consistent golden border glow on the active player area.
- Brief flash/pulse transition when turn changes to a new player.
- Player hand area also gets the glow when it's the human's turn.

### 5e. Smooth Color Picker

Upgrade color picker show/hide:
- Fade-in with backdrop blur transition (~200ms) instead of instant toggle.
- Color buttons scale in with staggered delay for a cascade effect.
- Fade-out on selection or Escape.

---

## Technical Architecture

### Animation Overlay Layer

Add `<div id="animation-layer">` to `index.html`:
- `position: fixed; inset: 0; pointer-events: none; z-index: 150;`
- All flying card clones are appended here.
- Sits between the game table and overlays (color picker, end screen).

### Card Clone Creation

New utility functions in `animations.js`:
- `createCardClone(cardElement)` — clones a card DOM element, positions it absolutely at the element's screen coordinates.
- `flyCard(clone, targetRect, options)` — applies CSS transition to move clone from current position to target. Returns a Promise that resolves on `transitionend`.
- `createFlippingCard(cardFront, cardBack, startRect)` — creates a perspective-wrapped card with two faces for the flip effect.

### Animation Timing

All animations must complete before game state updates the DOM:
- Card play: ~300ms flight + 50ms settle = ~350ms total
- Card draw: ~350ms flight with flip = ~350ms total
- Bot play: ~300ms flight with flip = ~300ms total
- Bot draw: ~250ms flight = ~250ms total
- Color transition: ~400ms
- Direction spin: ~500ms

### Reduced Motion

When `prefers-reduced-motion: reduce` is active:
- Skip all flight animations — cards appear/disappear instantly.
- Skip flip effects.
- Keep color transitions (non-motion, just color change).
- Keep the color ring glow (static, not animated).

---

## Files to Modify

- `index.html` — Add `#animation-layer` div
- `js/animations.js` — Add card flight, flip, clone utilities
- `js/ui.js` — Pass card element refs for animation start positions, update discard rendering with color ring
- `js/app.js` — Await animation completion before re-rendering, update direction indicator
- `styles.css` — Animation layer, card flight classes, color ring, direction arrow, draw count, turn glow, color picker transitions

## Files to Create

- None — all changes extend existing files.
