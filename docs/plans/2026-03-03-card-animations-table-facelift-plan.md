# Card Animations & Table Facelift — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add smooth CSS card flight animations and visual table upgrades so every card play, draw, and bot action feels alive.

**Architecture:** Clone-based flight animations using CSS transforms on a fixed overlay layer. Card flips use `perspective` + `backface-visibility` + `rotateY`. All game state changes happen instantly; animations are purely visual bridges. A Promise-based API lets `app.js` await animations before re-rendering.

**Tech Stack:** Vanilla JS (ES modules), CSS transitions/transforms, no dependencies.

---

## Task 1: Animation Layer + CSS Foundation

**Files:**
- Modify: `index.html` (add animation layer div)
- Modify: `styles.css` (add animation layer, card flight, card flip CSS)

**Step 1: Add `#animation-layer` to `index.html`**

Add this line immediately before the closing `</body>` tag (before the `<script>` tags, after the end-screen div). Insert after line 103 (`</div>` closing end-screen), before line 105 (`<script type="module">`):

```html
  <div id="animation-layer"></div>
```

**Step 2: Add animation CSS to `styles.css`**

Add this block before the `/* ===== Stats ===== */` comment (before line 927):

```css
/* ===== Animation Layer ===== */
#animation-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 150;
  overflow: hidden;
}

.card-flight {
  position: absolute;
  transition: transform 300ms ease-out;
  will-change: transform;
}

.card-flip-wrapper {
  position: absolute;
  perspective: 800px;
  transition: transform 350ms ease-out;
  will-change: transform;
}

.card-flip-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 350ms ease-out;
  transform-style: preserve-3d;
}

.card-flip-inner.flipped {
  transform: rotateY(180deg);
}

.card-flip-face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
}

.card-flip-face-front {
  transform: rotateY(180deg);
}

/* ===== Color Ring (discard pile glow) ===== */
#discard-pile {
  transition: box-shadow 0.4s ease;
}

.discard-glow-red    { box-shadow: 0 0 18px 4px rgba(237,28,36,0.5), 0 0 40px 8px rgba(237,28,36,0.2); }
.discard-glow-blue   { box-shadow: 0 0 18px 4px rgba(0,102,179,0.5), 0 0 40px 8px rgba(0,102,179,0.2); }
.discard-glow-green  { box-shadow: 0 0 18px 4px rgba(29,163,31,0.5), 0 0 40px 8px rgba(29,163,31,0.2); }
.discard-glow-yellow { box-shadow: 0 0 18px 4px rgba(245,223,29,0.5), 0 0 40px 8px rgba(245,223,29,0.2); }

/* ===== Direction Arrow Animation ===== */
.direction-indicator {
  transition: transform 0.5s ease;
}

.direction-spin {
  animation: directionSpin 0.5s ease;
}

@keyframes directionSpin {
  0% { transform: translateX(-50%) rotate(0deg); }
  100% { transform: translateX(-50%) rotate(360deg); }
}

/* ===== Draw Pile Counter Pulse ===== */
.draw-count-low {
  animation: drawCountPulse 1.5s ease-in-out infinite;
  color: #f87171 !important;
}

@keyframes drawCountPulse {
  0%, 100% { transform: translateX(-50%) scale(1); }
  50% { transform: translateX(-50%) scale(1.3); }
}

/* ===== Turn Change Flash ===== */
.player-area.active-player {
  box-shadow: inset 0 -4px 20px rgba(255,215,0,0.15);
}

.turn-flash {
  animation: turnFlash 0.4s ease-out;
}

@keyframes turnFlash {
  0% { filter: brightness(1.3) drop-shadow(0 0 20px rgba(255,215,0,0.8)); }
  100% { filter: none; }
}

/* ===== Color Picker Transitions ===== */
#color-picker {
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s ease, visibility 0.2s;
}

#color-picker.visible {
  opacity: 1;
  visibility: visible;
}

#color-picker .color-btn {
  transform: scale(0);
  transition: transform 0.2s ease;
}

#color-picker.visible .color-btn:nth-child(1) { transform: scale(1); transition-delay: 0.05s; }
#color-picker.visible .color-btn:nth-child(2) { transform: scale(1); transition-delay: 0.10s; }
#color-picker.visible .color-btn:nth-child(3) { transform: scale(1); transition-delay: 0.15s; }
#color-picker.visible .color-btn:nth-child(4) { transform: scale(1); transition-delay: 0.20s; }
```

**Step 3: Commit**

```bash
cd /Users/shaykovach/.openclaw/workspaces/frontend/uno-hebrew-game
git add index.html styles.css
git commit -m "feat: add animation layer and CSS foundation for card flights"
```

---

## Task 2: Core Flight Utilities

**Files:**
- Modify: `js/animations.js` (add flight functions, remove old TODOs)

**Step 1: Rewrite `js/animations.js`**

Keep `showConfetti`, `showActionFeedback`, and `animateCardToDiscard` intact. Replace the two TODO stubs (`animateCardPlay` and `animateCardDraw`) with the new flight utilities. Add imports and helpers at the top.

Add these imports and functions at the top of the file (before `showConfetti`):

```javascript
import { createCardElement } from './ui.js';

// ── Helpers ──────────────────────────────────────────────────

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getLayer() {
  return document.getElementById('animation-layer');
}

function clearLayer() {
  const layer = getLayer();
  if (layer) {
    while (layer.firstChild) layer.removeChild(layer.firstChild);
  }
}

function rectCenter(rect) {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

// ── Card Flight (simple — no flip) ──────────────────────────

/**
 * Flies a clone of a card element from its current position to a target element.
 * Returns a Promise that resolves when the animation completes.
 * @param {HTMLElement} sourceEl - The card DOM element to clone and fly
 * @param {HTMLElement} targetEl - The destination DOM element
 * @param {object} [opts] - Options: { duration, rotation }
 * @returns {Promise<void>}
 */
export function flyCard(sourceEl, targetEl, opts = {}) {
  if (prefersReducedMotion()) return Promise.resolve();

  const layer = getLayer();
  if (!layer || !sourceEl || !targetEl) return Promise.resolve();

  const startRect = sourceEl.getBoundingClientRect();
  const endRect = targetEl.getBoundingClientRect();
  const endCenter = rectCenter(endRect);
  const duration = opts.duration || 300;
  const rotation = opts.rotation ?? ((Math.random() - 0.5) * 30);

  // Clone the card
  const clone = sourceEl.cloneNode(true);
  clone.classList.add('card-flight');
  clone.style.width = startRect.width + 'px';
  clone.style.height = startRect.height + 'px';
  clone.style.left = startRect.left + 'px';
  clone.style.top = startRect.top + 'px';
  clone.style.transitionDuration = duration + 'ms';
  clone.style.zIndex = '10';

  // Hide the original
  sourceEl.style.opacity = '0';

  layer.appendChild(clone);

  const dx = endCenter.x - rectCenter(startRect).x;
  const dy = endCenter.y - rectCenter(startRect).y;

  return new Promise(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        clone.style.transform = 'translate(' + dx + 'px, ' + dy + 'px) rotate(' + rotation + 'deg)';
      });
    });

    const cleanup = () => {
      clone.remove();
      resolve();
    };

    clone.addEventListener('transitionend', cleanup, { once: true });
    // Safety timeout in case transitionend doesn't fire
    setTimeout(cleanup, duration + 50);
  });
}

// ── Flipping Card Flight (card-back → card-face) ────────────

/**
 * Flies a card-back from sourceEl to targetEl, flipping mid-flight to reveal the card face.
 * @param {HTMLElement} sourceEl - Start position element (e.g. draw pile or bot area)
 * @param {HTMLElement} targetEl - End position element (e.g. discard pile or player hand)
 * @param {object} card - Card data object for creating the face
 * @param {object} [opts] - Options: { duration }
 * @returns {Promise<void>}
 */
export function flyFlipCard(sourceEl, targetEl, card, opts = {}) {
  if (prefersReducedMotion()) return Promise.resolve();

  const layer = getLayer();
  if (!layer || !sourceEl || !targetEl) return Promise.resolve();

  const startRect = sourceEl.getBoundingClientRect();
  const endRect = targetEl.getBoundingClientRect();
  const endCenter = rectCenter(endRect);
  const duration = opts.duration || 350;

  // Determine card size from the target context
  const isMobile = window.innerWidth < 600;
  const isSmall = window.innerWidth < 380;
  const cardW = isSmall ? 58 : (isMobile ? 68 : 88);
  const cardH = isSmall ? 87 : (isMobile ? 102 : 132);

  // Create flip wrapper
  const wrapper = document.createElement('div');
  wrapper.classList.add('card-flip-wrapper');
  wrapper.style.width = cardW + 'px';
  wrapper.style.height = cardH + 'px';
  wrapper.style.left = startRect.left + (startRect.width - cardW) / 2 + 'px';
  wrapper.style.top = startRect.top + (startRect.height - cardH) / 2 + 'px';
  wrapper.style.transitionDuration = duration + 'ms';

  const inner = document.createElement('div');
  inner.classList.add('card-flip-inner');
  inner.style.transitionDuration = duration + 'ms';

  // Back face (visible initially)
  const backFace = createCardElement(card, false);
  backFace.classList.add('card-flip-face');
  backFace.style.width = cardW + 'px';
  backFace.style.height = cardH + 'px';

  // Front face (hidden initially, revealed by flip)
  const frontFace = createCardElement(card, true);
  frontFace.classList.add('card-flip-face', 'card-flip-face-front');
  frontFace.style.width = cardW + 'px';
  frontFace.style.height = cardH + 'px';

  inner.appendChild(backFace);
  inner.appendChild(frontFace);
  wrapper.appendChild(inner);
  layer.appendChild(wrapper);

  const startCenter = {
    x: startRect.left + startRect.width / 2,
    y: startRect.top + startRect.height / 2
  };
  const dx = endCenter.x - startCenter.x;
  const dy = endCenter.y - startCenter.y;

  return new Promise(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        wrapper.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
        inner.classList.add('flipped');
      });
    });

    const cleanup = () => {
      wrapper.remove();
      resolve();
    };

    wrapper.addEventListener('transitionend', cleanup, { once: true });
    setTimeout(cleanup, duration + 50);
  });
}

// ── Simple card-back flight (no flip, for bot draws) ────────

/**
 * Flies a card-back from sourceEl to targetEl without flipping.
 * @param {HTMLElement} sourceEl
 * @param {HTMLElement} targetEl
 * @param {object} [opts]
 * @returns {Promise<void>}
 */
export function flyCardBack(sourceEl, targetEl, opts = {}) {
  if (prefersReducedMotion()) return Promise.resolve();

  const layer = getLayer();
  if (!layer || !sourceEl || !targetEl) return Promise.resolve();

  const startRect = sourceEl.getBoundingClientRect();
  const endRect = targetEl.getBoundingClientRect();
  const duration = opts.duration || 250;

  const isMobile = window.innerWidth < 600;
  const isSmall = window.innerWidth < 380;
  const cardW = isSmall ? 58 : (isMobile ? 68 : 88);
  const cardH = isSmall ? 87 : (isMobile ? 102 : 132);

  const cardBack = document.createElement('div');
  cardBack.classList.add('card', 'card-back', 'card-flight');
  cardBack.style.width = cardW + 'px';
  cardBack.style.height = cardH + 'px';
  cardBack.style.left = startRect.left + (startRect.width - cardW) / 2 + 'px';
  cardBack.style.top = startRect.top + (startRect.height - cardH) / 2 + 'px';
  cardBack.style.transitionDuration = duration + 'ms';

  const oval = document.createElement('div');
  oval.classList.add('card-back-oval');
  oval.textContent = 'UNO';
  cardBack.appendChild(oval);

  layer.appendChild(cardBack);

  const startCenter = rectCenter(startRect);
  const endCenter = rectCenter(endRect);
  const dx = endCenter.x - startCenter.x;
  const dy = endCenter.y - startCenter.y;

  return new Promise(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        cardBack.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
      });
    });

    const cleanup = () => {
      cardBack.remove();
      resolve();
    };

    cardBack.addEventListener('transitionend', cleanup, { once: true });
    setTimeout(cleanup, duration + 50);
  });
}
```

Remove the two old TODO stubs. Delete lines 49-55 (the `animateCardPlay` and `animateCardDraw` stubs).

**Step 2: Update the existing import in `animations.js`**

The file currently has no imports. Add the `createCardElement` import as the first line:

```javascript
import { createCardElement } from './ui.js';
```

**Step 3: Commit**

```bash
cd /Users/shaykovach/.openclaw/workspaces/frontend/uno-hebrew-game
git add js/animations.js
git commit -m "feat: add card flight, flip, and card-back animation utilities"
```

---

## Task 3: Human Card Play Animation

**Files:**
- Modify: `js/app.js` (update imports, add `animating` flag, modify `handleCardClick` and `handleColorChoice`)

**Step 1: Update imports in `js/app.js`**

Replace line 5:

```javascript
import { showConfetti, showActionFeedback, animateCardToDiscard } from './animations.js';
```

With:

```javascript
import { showConfetti, showActionFeedback, animateCardToDiscard, flyCard } from './animations.js';
```

**Step 2: Add `animating` flag**

After line 13 (`let turnCount = 0;`), add:

```javascript
let animating = false;
```

**Step 3: Modify `handleCardClick()` to use animation**

Replace the existing `handleCardClick` function (lines 90-121) with:

```javascript
async function handleCardClick(card) {
  if (!state || state.gameOver) return;
  if (state.currentPlayer !== 0) return;
  if (state.pendingAction) return;
  if (animating) return;

  // Wild card: show color picker first
  if (card.color === 'wild') {
    state.pendingAction = { type: 'colorPick', card };
    showColorPicker();
    return;
  }

  // Find the card element before state change removes it
  const cardEl = document.querySelector('[data-card-id="' + card.id + '"]');

  const success = playCard(state, 0, card.id);
  if (!success) return;

  // Animate card flight to discard pile
  animating = true;
  soundCardPlay();
  const discardEl = document.getElementById('discard-pile');
  await flyCard(cardEl, discardEl);
  animateCardToDiscard();
  animating = false;

  if (card.type === 'special') {
    playSpecialSound(card.value);
    showActionFeedback(card.value);
  }

  // UNO penalty: player has 1 card left but didn't call UNO
  if (state.hands[0].length === 1 && !state.unoCalledBy.has(0)) {
    drawCards(state, 0, 2);
  }
  state.unoCalledBy.delete(0);

  afterPlay();
}
```

**Step 4: Modify `handleColorChoice()` to use animation**

Replace the existing `handleColorChoice` function (lines 123-145) with:

```javascript
async function handleColorChoice(color) {
  if (!state || !state.pendingAction || state.pendingAction.type !== 'colorPick') return;
  if (animating) return;

  const card = state.pendingAction.card;
  const cardEl = document.querySelector('[data-card-id="' + card.id + '"]');
  state.pendingAction = null;
  hideColorPicker();

  playCard(state, 0, card.id, color);

  animating = true;
  soundWild();
  const discardEl = document.getElementById('discard-pile');
  await flyCard(cardEl, discardEl);
  animateCardToDiscard();
  animating = false;

  if (card.value === SPECIAL_TYPES.WILD_DRAW_FOUR) {
    showActionFeedback('wild_draw_four');
  }

  // UNO penalty: player has 1 card left but didn't call UNO
  if (state.hands[0].length === 1 && !state.unoCalledBy.has(0)) {
    drawCards(state, 0, 2);
  }
  state.unoCalledBy.delete(0);

  afterPlay();
}
```

**Step 5: Add `animating` guard to `handleDrawPile`**

Add `if (animating) return;` after the existing `if (state.pendingAction) return;` line in `handleDrawPile`.

**Step 6: Verify the game still works**

Open the game. Play cards — they should fly from your hand to the discard pile. Wild cards should fly after color selection. If `prefers-reduced-motion` is on, cards should appear instantly (no flight).

**Step 7: Commit**

```bash
cd /Users/shaykovach/.openclaw/workspaces/frontend/uno-hebrew-game
git add js/app.js
git commit -m "feat: add card flight animation for human card plays"
```

---

## Task 4: Human Draw Animation

**Files:**
- Modify: `js/app.js` (update imports, modify `handleDrawPile`)

**Step 1: Update imports**

Add `flyFlipCard` to the animations import:

```javascript
import { showConfetti, showActionFeedback, animateCardToDiscard, flyCard, flyFlipCard } from './animations.js';
```

**Step 2: Modify `handleDrawPile()` to animate the draw**

Replace the existing `handleDrawPile` function with:

```javascript
async function handleDrawPile() {
  if (!state || state.gameOver) return;
  if (state.currentPlayer !== 0) return;
  if (state.pendingAction) return;
  if (animating) return;

  const drawn = drawCards(state, 0, 1);
  if (drawn.length === 0) return;

  animating = true;
  soundCardDraw();

  const drawPileEl = document.getElementById('draw-pile');
  const handEl = document.getElementById('player-hand');
  const drawnCard = drawn[0];

  await flyFlipCard(drawPileEl, handEl, drawnCard);
  animating = false;

  const topCard = getTopCard(state);
  const playable = getPlayableCards([drawnCard], topCard, state.currentColor);

  if (playable.length > 0) {
    // Card is playable — re-render so the player can click it
    renderGame(state, handleCardClick);
  } else {
    // Not playable — advance turn
    showToast('שלפת קלף ועברת...');
    state.currentPlayer = nextPlayerIndex(state.currentPlayer, state.direction, state.numPlayers);
    afterTurnEnd();
  }
}
```

**Step 3: Verify**

Draw a card — a card-back should fly from the draw pile to your hand, flipping mid-flight to reveal the card face.

**Step 4: Commit**

```bash
cd /Users/shaykovach/.openclaw/workspaces/frontend/uno-hebrew-game
git add js/app.js
git commit -m "feat: add draw animation with mid-air card flip"
```

---

## Task 5: Bot Play + Draw Animations

**Files:**
- Modify: `js/app.js` (update imports, modify `executeBotTurn`)

**Step 1: Update imports**

Add `flyCardBack` to the animations import:

```javascript
import { showConfetti, showActionFeedback, animateCardToDiscard, flyCard, flyFlipCard, flyCardBack } from './animations.js';
```

**Step 2: Modify `executeBotTurn()` to animate bot actions**

Replace the existing `executeBotTurn` function with:

```javascript
async function executeBotTurn() {
  if (!state || state.gameOver) return;

  const botIndex = state.currentPlayer;
  const botName = PLAYER_NAMES[botIndex];

  // Safety: if it's somehow the human's turn, just re-render
  if (botIndex === 0) {
    renderGame(state, handleCardClick);
    return;
  }

  const hand = state.hands[botIndex];
  const topCard = getTopCard(state);
  const card = botChooseCard(hand, topCard, state.currentColor);

  // Determine bot area element for animation start position
  const botPositions = { 1: 'bot-left', 2: 'bot-top', 3: 'bot-right' };
  let botAreaId = botPositions[botIndex];
  if (state.numPlayers === 2) botAreaId = 'bot-top';
  else if (state.numPlayers === 3 && botIndex === 2) botAreaId = 'bot-right';
  const botAreaEl = document.getElementById(botAreaId);
  const discardEl = document.getElementById('discard-pile');
  const drawPileEl = document.getElementById('draw-pile');

  if (card) {
    let chosenColor = null;

    if (card.color === 'wild') {
      chosenColor = botChooseColor(hand);
    }

    // Bot calls UNO when going from 2 cards to 1
    if (hand.length === 2) {
      soundUno();
      showUnoPopup();
    }

    playCard(state, botIndex, card.id, chosenColor);

    // Animate: card-back flies from bot area to discard, flips to reveal
    soundBotPlay();
    await flyFlipCard(botAreaEl, discardEl, card);
    animateCardToDiscard();

    // Show toast and feedback for special cards
    if (card.type === 'special') {
      playSpecialSound(card.value);
      showActionFeedback(card.value);

      if (card.value === SPECIAL_TYPES.DRAW_TWO) {
        showToast(botName + ' משחק +2!');
      } else if (card.value === SPECIAL_TYPES.WILD_DRAW_FOUR) {
        showToast(botName + ' משחק +4!');
      } else if (card.value === SPECIAL_TYPES.SKIP) {
        showToast(botName + ' משחק דילוג!');
      } else if (card.value === SPECIAL_TYPES.REVERSE) {
        showToast(botName + ' משחק הפוך!');
      }
    }
  } else {
    // No playable card — draw one
    const drawn = drawCards(state, botIndex, 1);
    showToast(botName + ' שולף קלף');
    soundCardDraw();

    // Animate: card-back flies from draw pile to bot area
    await flyCardBack(drawPileEl, botAreaEl);

    if (drawn.length > 0) {
      const drawnCard = drawn[0];
      const currentTopCard = getTopCard(state);
      const playable = getPlayableCards([drawnCard], currentTopCard, state.currentColor);

      if (playable.length > 0) {
        let chosenColor = null;
        if (drawnCard.color === 'wild') {
          chosenColor = botChooseColor(state.hands[botIndex]);
        }
        playCard(state, botIndex, drawnCard.id, chosenColor);

        // Animate: bot plays the drawn card
        soundBotPlay();
        await flyFlipCard(botAreaEl, discardEl, drawnCard);
        animateCardToDiscard();

        if (drawnCard.type === 'special') {
          playSpecialSound(drawnCard.value);
          showActionFeedback(drawnCard.value);
        }
      } else {
        // Can't play drawn card — advance turn
        state.currentPlayer = nextPlayerIndex(state.currentPlayer, state.direction, state.numPlayers);
      }
    } else {
      // Nothing to draw — advance turn
      state.currentPlayer = nextPlayerIndex(state.currentPlayer, state.direction, state.numPlayers);
    }
  }

  afterTurnEnd();
}
```

**Step 3: Verify**

Watch bots play — card-backs should fly from their area to the discard pile, flipping mid-flight. When bots draw, a card-back should fly from the draw pile to their area.

**Step 4: Commit**

```bash
cd /Users/shaykovach/.openclaw/workspaces/frontend/uno-hebrew-game
git add js/app.js
git commit -m "feat: add bot play and draw animations with card flips"
```

---

## Task 6: Color Ring + Direction Indicator + Draw Counter

**Files:**
- Modify: `js/ui.js` (update `renderCenterArea` for color ring, animated direction, draw counter pulse)

**Step 1: Update `renderCenterArea()` in `js/ui.js`**

Replace the existing `renderCenterArea` function (lines 274-332) with:

```javascript
let lastDirection = null;

export function renderCenterArea(state) {
  const discardPile = document.getElementById('discard-pile');
  clearChildren(discardPile);

  const topCard = getTopCard(state);

  // Render the top card (non-interactive)
  const cardEl = createCardElement(topCard, true);
  cardEl.style.cursor = 'default';
  discardPile.appendChild(cardEl);

  // Color ring glow
  discardPile.classList.remove('discard-glow-red', 'discard-glow-blue', 'discard-glow-green', 'discard-glow-yellow');
  discardPile.classList.add('discard-glow-' + state.currentColor);

  // Color indicator bar
  const existingIndicator = discardPile.querySelector('.color-indicator-bar');
  if (existingIndicator) existingIndicator.remove();

  const indicatorBar = document.createElement('div');
  indicatorBar.classList.add('color-indicator-bar');

  const dot = document.createElement('div');
  dot.classList.add('color-indicator-dot');
  dot.style.background = COLOR_HEX[state.currentColor] || COLOR_HEX.red;
  indicatorBar.appendChild(dot);

  const label = document.createElement('span');
  label.classList.add('color-indicator-label');
  label.textContent = COLOR_NAMES[state.currentColor] || '';
  indicatorBar.appendChild(label);

  discardPile.appendChild(indicatorBar);

  // Draw pile count with low-count pulse
  const drawPileEl = document.getElementById('draw-pile');
  let drawCount = drawPileEl.querySelector('.draw-count');
  if (!drawCount) {
    drawCount = document.createElement('span');
    drawCount.classList.add('draw-count');
    drawPileEl.appendChild(drawCount);
  }
  drawCount.textContent = state.drawPile.length;
  if (state.drawPile.length <= 10 && state.drawPile.length > 0) {
    drawCount.classList.add('draw-count-low');
  } else {
    drawCount.classList.remove('draw-count-low');
  }

  // Direction indicator with spin on change
  const dirIndicator = document.getElementById('direction-indicator');
  if (dirIndicator) {
    dirIndicator.textContent = state.direction === 1 ? '\u21BB' : '\u21BA';
    if (lastDirection !== null && lastDirection !== state.direction) {
      dirIndicator.classList.remove('direction-spin');
      void dirIndicator.offsetWidth; // force reflow to re-trigger animation
      dirIndicator.classList.add('direction-spin');
    }
    lastDirection = state.direction;
  }

  // Turn message
  const turnMessage = document.getElementById('turn-message');
  if (turnMessage) {
    if (state.currentPlayer === 0) {
      turnMessage.textContent = '!התור שלך';
      announce('!התור שלך');
    } else {
      turnMessage.textContent = '';
    }
  }
}
```

**Step 2: Verify**

- Play a game — the discard pile should have a colored glow ring matching the current color.
- Play a Reverse card — the direction arrow should spin.
- Draw cards until the draw pile is low (<10) — the count should pulse red.

**Step 3: Commit**

```bash
cd /Users/shaykovach/.openclaw/workspaces/frontend/uno-hebrew-game
git add js/ui.js
git commit -m "feat: add color ring glow, animated direction, draw counter pulse"
```

---

## Task 7: Turn Glow + Smooth Color Picker

**Files:**
- Modify: `js/ui.js` (add turn-flash class on turn change, update color picker show/hide)
- Modify: `js/app.js` (remove hidden-based color picker logic, use visible class)

**Step 1: Track turn changes in `renderGame()` in `js/ui.js`**

In the `renderGame` function, find the active-player toggle section for the player area (lines 357-364). Replace:

```javascript
  // Toggle active-player on player area
  const playerArea = document.querySelector('.player-area');
  if (playerArea) {
    if (state.currentPlayer === 0) {
      playerArea.classList.add('active-player');
    } else {
      playerArea.classList.remove('active-player');
    }
  }
```

With:

```javascript
  // Toggle active-player on player area with turn flash
  const playerArea = document.querySelector('.player-area');
  if (playerArea) {
    if (state.currentPlayer === 0) {
      if (!playerArea.classList.contains('active-player')) {
        playerArea.classList.add('turn-flash');
        setTimeout(() => playerArea.classList.remove('turn-flash'), 400);
      }
      playerArea.classList.add('active-player');
    } else {
      playerArea.classList.remove('active-player');
    }
  }
```

**Step 2: Update `showColorPicker()` in `js/ui.js`**

Replace:

```javascript
export function showColorPicker() {
  const picker = document.getElementById('color-picker');
  if (picker) {
    picker.classList.remove('hidden');
  }
}
```

With:

```javascript
export function showColorPicker() {
  const picker = document.getElementById('color-picker');
  if (picker) {
    picker.classList.remove('hidden');
    // Trigger transition after removing hidden (which sets display:none)
    requestAnimationFrame(() => picker.classList.add('visible'));
  }
}
```

**Step 3: Update `hideColorPicker()` in `js/ui.js`**

Replace:

```javascript
export function hideColorPicker() {
  const picker = document.getElementById('color-picker');
  if (picker) {
    picker.classList.add('hidden');
  }
}
```

With:

```javascript
export function hideColorPicker() {
  const picker = document.getElementById('color-picker');
  if (picker) {
    picker.classList.remove('visible');
    // Wait for fade-out transition, then hide
    setTimeout(() => picker.classList.add('hidden'), 200);
  }
}
```

**Step 4: Verify**

- Turn changes should show a brief golden flash on your hand area.
- Playing a wild card should show the color picker fading in with staggered button animations.
- Selecting a color should fade the picker out smoothly.

**Step 5: Commit**

```bash
cd /Users/shaykovach/.openclaw/workspaces/frontend/uno-hebrew-game
git add js/ui.js
git commit -m "feat: add turn change flash and smooth color picker transitions"
```

---

## Task 8: Reduced Motion + Service Worker + Final Verification

**Files:**
- Modify: `styles.css` (add new animations to reduced-motion block)
- Modify: `service-worker.js` (bump cache version)

**Step 1: Update the `prefers-reduced-motion` block in `styles.css`**

Find the existing `@media (prefers-reduced-motion: reduce)` block. Add these selectors to the existing `animation: none !important;` rule:

Add `.direction-spin, .draw-count-low, .turn-flash` to the animation-none list.

Add `.card-flight, .card-flip-wrapper, .card-flip-inner, #color-picker, #color-picker .color-btn, #discard-pile` to the transition-none list.

The full updated block should be:

```css
@media (prefers-reduced-motion: reduce) {
  .floating-card,
  .game-title,
  .confetti-piece,
  .uno-popup,
  .active-player,
  .btn-uno, #uno-btn,
  .direction-spin,
  .draw-count-low,
  .turn-flash {
    animation: none !important;
  }

  .card,
  .hand-card,
  .btn-primary,
  .draw-pile,
  #draw-pile,
  .color-btn,
  .game-toast,
  .action-feedback,
  .card-flight,
  .card-flip-wrapper,
  .card-flip-inner,
  #color-picker,
  #color-picker .color-btn,
  #discard-pile {
    transition: none !important;
  }

  .hand-card.playable:hover,
  .hand-card.playable:active {
    transform: none !important;
    box-shadow: 0 0 0 3px rgba(255,215,0,0.6);
  }

  .card-played-flash {
    animation: none !important;
  }
}
```

**Step 2: Bump service worker cache**

In `service-worker.js`, change:

```javascript
const CACHE_NAME = 'uno-game-v3';
```

To:

```javascript
const CACHE_NAME = 'uno-game-v4';
```

**Step 3: Commit**

```bash
cd /Users/shaykovach/.openclaw/workspaces/frontend/uno-hebrew-game
git add styles.css service-worker.js
git commit -m "feat: update reduced motion rules and bump service worker cache"
```

**Step 4: Manual verification checklist**

Open the game and verify:

- [ ] Human card play: card flies from hand to discard pile
- [ ] Human card draw: card-back flies from draw pile to hand, flips mid-air
- [ ] Bot card play: card-back flies from bot area to discard, flips to reveal
- [ ] Bot card draw: card-back flies from draw pile to bot area
- [ ] Wild card: color picker fades in with staggered buttons
- [ ] Color selection: picker fades out, card then flies to discard
- [ ] Discard pile: colored glow ring matching current color
- [ ] Direction indicator: spins when Reverse is played
- [ ] Draw pile counter: pulses red when < 10 cards remain
- [ ] Turn change: player hand area gets a golden flash
- [ ] Reduced motion: enable in OS settings → all flight animations skip instantly
- [ ] No console errors
- [ ] Mobile: test on phone or DevTools responsive mode

**Step 5: Push to deploy**

```bash
cd /Users/shaykovach/.openclaw/workspaces/frontend/uno-hebrew-game
git push origin main
```
