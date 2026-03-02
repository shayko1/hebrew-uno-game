# Quality-First Sprint Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the Hebrew UNO card game production-ready with automated tests, error handling, accessibility, PWA polish, and local game stats.

**Architecture:** Vanilla HTML5/CSS3/JavaScript with ES modules. No build tools, no npm. Browser-based test runner. GitHub Pages deployment via existing CI/CD.

**Tech Stack:** Vanilla JS (ES modules), CSS3, Web Audio API, Service Workers, localStorage

---

## Task 1: Create the Test Runner

**Files:**
- Create: `tests/runner.js`
- Create: `tests/test.html`

**Step 1: Create `tests/runner.js`**

A minimal test framework with `describe`, `it`, and assertion helpers. Runs in the browser, outputs results to the page.

```javascript
// tests/runner.js — Minimal browser test runner

let totalPassed = 0;
let totalFailed = 0;
let currentSuite = '';

export function describe(name, fn) {
  currentSuite = name;
  const suiteEl = document.createElement('div');
  suiteEl.classList.add('suite');
  const heading = document.createElement('h2');
  heading.textContent = name;
  suiteEl.appendChild(heading);
  document.getElementById('results').appendChild(suiteEl);
  fn();
}

export function it(name, fn) {
  const testEl = document.createElement('div');
  testEl.classList.add('test');
  try {
    fn();
    totalPassed++;
    testEl.classList.add('pass');
    testEl.textContent = '\u2705 ' + name;
  } catch (e) {
    totalFailed++;
    testEl.classList.add('fail');
    testEl.textContent = '\u274C ' + name + ' \u2014 ' + e.message;
  }
  const suiteEl = document.getElementById('results').lastElementChild;
  suiteEl.appendChild(testEl);
}

export function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

export function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      (message || 'assertEqual') + ': expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual)
    );
  }
}

export function showSummary() {
  const summary = document.getElementById('summary');
  summary.textContent = 'Passed: ' + totalPassed + ' | Failed: ' + totalFailed;
  summary.classList.add(totalFailed === 0 ? 'all-pass' : 'has-fail');
}
```

**Step 2: Create `tests/test.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>UNO Game Tests</title>
  <style>
    body { font-family: monospace; padding: 20px; background: #1a1a1a; color: #eee; }
    h1 { color: #ED1C24; }
    h2 { color: #FFD700; margin-top: 20px; }
    .test { padding: 4px 8px; margin: 2px 0; }
    .pass { color: #4ade80; }
    .fail { color: #f87171; background: rgba(248,113,113,0.1); border-radius: 4px; }
    #summary { margin-top: 20px; padding: 12px; font-size: 18px; font-weight: bold; border-radius: 8px; }
    .all-pass { background: rgba(74,222,128,0.15); color: #4ade80; }
    .has-fail { background: rgba(248,113,113,0.15); color: #f87171; }
  </style>
</head>
<body>
  <h1>UNO Game Tests</h1>
  <div id="summary"></div>
  <div id="results"></div>
  <script type="module" src="./test-deck.js"></script>
  <script type="module" src="./test-state.js"></script>
  <script type="module" src="./test-bot.js"></script>
</body>
</html>
```

**Step 3: Verify the test page loads**

Run: `cd /Users/shaykovach/.openclaw/workspaces/frontend/uno-hebrew-game && python3 -m http.server 8080 &`

Open `http://localhost:8080/tests/test.html` in a browser. Page should load with "UNO Game Tests" heading but no test results yet (test files don't exist).

**Step 4: Commit**

```bash
cd /Users/shaykovach/.openclaw/workspaces/frontend/uno-hebrew-game
git add tests/runner.js tests/test.html
git commit -m "feat: add minimal browser-based test runner"
```

---

## Task 2: Write Deck Tests

**Files:**
- Create: `tests/test-deck.js`
- Reference: `js/deck.js`, `js/constants.js`

**Step 1: Create `tests/test-deck.js`**

```javascript
import { describe, it, assert, assertEqual } from './runner.js';
import { createDeck, shuffle, deal } from '../js/deck.js';
import { COLORS, SPECIAL_TYPES } from '../js/constants.js';

describe('createDeck()', () => {
  const deck = createDeck();

  it('returns exactly 108 cards', () => {
    assertEqual(deck.length, 108, 'deck size');
  });

  it('has 76 number cards', () => {
    const numbers = deck.filter(c => c.type === 'number');
    assertEqual(numbers.length, 76, 'number card count');
  });

  it('has 24 colored special cards', () => {
    const specials = deck.filter(c => c.type === 'special' && c.color !== 'wild');
    assertEqual(specials.length, 24, 'colored special card count');
  });

  it('has 8 wild cards (4 wild + 4 wild draw four)', () => {
    const wilds = deck.filter(c => c.color === 'wild');
    assertEqual(wilds.length, 8, 'wild card count');
  });

  it('has one 0 per color', () => {
    for (const color of COLORS) {
      const zeros = deck.filter(c => c.color === color && c.type === 'number' && c.value === 0);
      assertEqual(zeros.length, 1, color + ' zero count');
    }
  });

  it('has two of each 1-9 per color', () => {
    for (const color of COLORS) {
      for (let n = 1; n <= 9; n++) {
        const cards = deck.filter(c => c.color === color && c.type === 'number' && c.value === n);
        assertEqual(cards.length, 2, color + ' ' + n + ' count');
      }
    }
  });

  it('has 2 Skip, 2 Reverse, 2 Draw Two per color', () => {
    for (const color of COLORS) {
      for (const special of [SPECIAL_TYPES.SKIP, SPECIAL_TYPES.REVERSE, SPECIAL_TYPES.DRAW_TWO]) {
        const cards = deck.filter(c => c.color === color && c.value === special);
        assertEqual(cards.length, 2, color + ' ' + special + ' count');
      }
    }
  });

  it('has 4 Wild cards', () => {
    const wilds = deck.filter(c => c.value === SPECIAL_TYPES.WILD);
    assertEqual(wilds.length, 4, 'wild count');
  });

  it('has 4 Wild Draw Four cards', () => {
    const wd4 = deck.filter(c => c.value === SPECIAL_TYPES.WILD_DRAW_FOUR);
    assertEqual(wd4.length, 4, 'wild draw four count');
  });

  it('every card has a unique id', () => {
    const ids = new Set(deck.map(c => c.id));
    assertEqual(ids.size, 108, 'unique id count');
  });
});

describe('shuffle()', () => {
  it('returns a new array of the same length', () => {
    const deck = createDeck();
    const shuffled = shuffle(deck);
    assertEqual(shuffled.length, deck.length, 'shuffled length');
    assert(shuffled !== deck, 'should return a new array');
  });

  it('contains the same cards', () => {
    const deck = createDeck();
    const shuffled = shuffle(deck);
    const deckIds = deck.map(c => c.id).sort((a, b) => a - b);
    const shuffledIds = shuffled.map(c => c.id).sort((a, b) => a - b);
    assertEqual(JSON.stringify(deckIds), JSON.stringify(shuffledIds), 'same card ids');
  });

  it('produces a different order (statistically)', () => {
    const deck = createDeck();
    const s1 = shuffle(deck);
    const s2 = shuffle(deck);
    const s1Ids = s1.map(c => c.id).join(',');
    const s2Ids = s2.map(c => c.id).join(',');
    assert(s1Ids !== s2Ids, 'two shuffles should differ');
  });
});

describe('deal()', () => {
  it('deals 7 cards to each of 4 players', () => {
    const deck = shuffle(createDeck());
    const { hands, remaining } = deal(deck, 4, 7);
    assertEqual(hands.length, 4, 'number of hands');
    for (let i = 0; i < 4; i++) {
      assertEqual(hands[i].length, 7, 'hand ' + i + ' size');
    }
    assertEqual(remaining.length, 108 - 28, 'remaining cards');
  });

  it('deals 7 cards to each of 2 players', () => {
    const deck = shuffle(createDeck());
    const { hands, remaining } = deal(deck, 2, 7);
    assertEqual(hands.length, 2, 'number of hands');
    assertEqual(hands[0].length, 7, 'hand 0 size');
    assertEqual(hands[1].length, 7, 'hand 1 size');
    assertEqual(remaining.length, 108 - 14, 'remaining cards');
  });

  it('deals 7 cards to each of 3 players', () => {
    const deck = shuffle(createDeck());
    const { hands, remaining } = deal(deck, 3, 7);
    assertEqual(hands.length, 3, 'number of hands');
    assertEqual(remaining.length, 108 - 21, 'remaining cards');
  });
});
```

**Step 2: Commit**

```bash
cd /Users/shaykovach/.openclaw/workspaces/frontend/uno-hebrew-game
git add tests/test-deck.js
git commit -m "test: add deck.js unit tests — card counts, shuffle, deal"
```

---

## Task 3: Write State Tests

**Files:**
- Create: `tests/test-state.js`
- Reference: `js/state.js`, `js/deck.js`, `js/constants.js`

**Step 1: Create `tests/test-state.js`**

```javascript
import { describe, it, assert, assertEqual } from './runner.js';
import { createGameState, canPlayCard, playCard, drawCards, nextPlayerIndex, getTopCard, getPlayableCards } from '../js/state.js';
import { SPECIAL_TYPES } from '../js/constants.js';

describe('createGameState()', () => {
  it('deals 7 cards per player for 4 players', () => {
    const state = createGameState(4);
    assertEqual(state.hands.length, 4, 'hand count');
    for (let i = 0; i < 4; i++) {
      assertEqual(state.hands[i].length, 7, 'hand ' + i + ' size');
    }
  });

  it('deals 7 cards per player for 2 players', () => {
    const state = createGameState(2);
    assertEqual(state.hands.length, 2, 'hand count');
    assertEqual(state.hands[0].length, 7, 'hand 0');
    assertEqual(state.hands[1].length, 7, 'hand 1');
  });

  it('starts with a number card on the discard pile', () => {
    const state = createGameState(4);
    const topCard = getTopCard(state);
    assertEqual(topCard.type, 'number', 'starting card should be a number');
  });

  it('sets initial state correctly', () => {
    const state = createGameState(4);
    assertEqual(state.currentPlayer, 0, 'currentPlayer');
    assertEqual(state.direction, 1, 'direction');
    assertEqual(state.gameOver, false, 'gameOver');
    assertEqual(state.winner, null, 'winner');
    assertEqual(state.numPlayers, 4, 'numPlayers');
    assert(state.currentColor !== undefined, 'currentColor should be set');
  });
});

describe('canPlayCard()', () => {
  const redFive = { id: 0, color: 'red', type: 'number', value: 5 };
  const blueFive = { id: 1, color: 'blue', type: 'number', value: 5 };
  const redThree = { id: 2, color: 'red', type: 'number', value: 3 };
  const greenSeven = { id: 3, color: 'green', type: 'number', value: 7 };
  const redSkip = { id: 4, color: 'red', type: 'special', value: 'skip' };
  const blueSkip = { id: 5, color: 'blue', type: 'special', value: 'skip' };
  const wild = { id: 6, color: 'wild', type: 'special', value: 'wild' };
  const wildDraw4 = { id: 7, color: 'wild', type: 'special', value: 'wild_draw_four' };

  it('matches by color', () => {
    assert(canPlayCard(redThree, redFive, 'red'), 'red 3 on red 5');
  });

  it('matches by number value', () => {
    assert(canPlayCard(blueFive, redFive, 'red'), 'blue 5 on red 5');
  });

  it('rejects non-matching card', () => {
    assert(!canPlayCard(greenSeven, redFive, 'red'), 'green 7 on red 5');
  });

  it('matches by special type', () => {
    assert(canPlayCard(blueSkip, redSkip, 'red'), 'blue skip on red skip');
  });

  it('matches special card by color', () => {
    assert(canPlayCard(redSkip, redFive, 'red'), 'red skip on red 5');
  });

  it('wild card is always playable', () => {
    assert(canPlayCard(wild, redFive, 'red'), 'wild on anything');
    assert(canPlayCard(wildDraw4, greenSeven, 'green'), 'wild draw 4 on anything');
  });

  it('matches color set by a previous wild', () => {
    assert(canPlayCard(redThree, wild, 'red'), 'red card when current color is red');
    assert(!canPlayCard(redThree, wild, 'blue'), 'red card when current color is blue');
  });
});

describe('nextPlayerIndex()', () => {
  it('wraps forward for 4 players', () => {
    assertEqual(nextPlayerIndex(0, 1, 4), 1);
    assertEqual(nextPlayerIndex(3, 1, 4), 0);
  });

  it('wraps backward for 4 players', () => {
    assertEqual(nextPlayerIndex(0, -1, 4), 3);
    assertEqual(nextPlayerIndex(1, -1, 4), 0);
  });

  it('wraps for 2 players', () => {
    assertEqual(nextPlayerIndex(0, 1, 2), 1);
    assertEqual(nextPlayerIndex(1, 1, 2), 0);
    assertEqual(nextPlayerIndex(0, -1, 2), 1);
  });

  it('wraps for 3 players', () => {
    assertEqual(nextPlayerIndex(2, 1, 3), 0);
    assertEqual(nextPlayerIndex(0, -1, 3), 2);
  });
});

describe('playCard() — number cards', () => {
  it('removes card from hand and adds to discard', () => {
    const state = createGameState(4);
    const hand = state.hands[0];
    const topCard = getTopCard(state);
    const playable = hand.find(c => canPlayCard(c, topCard, state.currentColor) && c.type === 'number');
    if (!playable) return; // Skip if no playable number card (random deal)
    const handSizeBefore = hand.length;
    playCard(state, 0, playable.id);
    assertEqual(hand.length, handSizeBefore - 1, 'hand shrinks by 1');
    assertEqual(getTopCard(state).id, playable.id, 'card is now on top of discard');
  });

  it('advances to next player', () => {
    const state = createGameState(4);
    const hand = state.hands[0];
    const topCard = getTopCard(state);
    const playable = hand.find(c => canPlayCard(c, topCard, state.currentColor) && c.type === 'number');
    if (!playable) return;
    playCard(state, 0, playable.id);
    assertEqual(state.currentPlayer, 1, 'advances to player 1');
  });

  it('returns false for unplayable card', () => {
    const state = createGameState(4);
    const hand = state.hands[0];
    const topCard = getTopCard(state);
    const unplayable = hand.find(c => !canPlayCard(c, topCard, state.currentColor));
    if (!unplayable) return;
    const result = playCard(state, 0, unplayable.id);
    assertEqual(result, false, 'returns false');
  });

  it('returns false for card not in hand', () => {
    const state = createGameState(4);
    const result = playCard(state, 0, 99999);
    assertEqual(result, false, 'returns false for missing card');
  });
});

describe('playCard() — Skip', () => {
  it('skips the next player', () => {
    const state = createGameState(4);
    const skipCard = { id: 900, color: state.currentColor, type: 'special', value: SPECIAL_TYPES.SKIP };
    state.hands[0].push(skipCard);
    playCard(state, 0, 900);
    assertEqual(state.currentPlayer, 2, 'skipped to player 2');
  });
});

describe('playCard() — Reverse', () => {
  it('reverses direction in 4-player game', () => {
    const state = createGameState(4);
    assertEqual(state.direction, 1, 'starts forward');
    const reverseCard = { id: 901, color: state.currentColor, type: 'special', value: SPECIAL_TYPES.REVERSE };
    state.hands[0].push(reverseCard);
    playCard(state, 0, 901);
    assertEqual(state.direction, -1, 'direction reversed');
    assertEqual(state.currentPlayer, 3, 'goes to player 3');
  });

  it('acts as skip in 2-player game', () => {
    const state = createGameState(2);
    const reverseCard = { id: 902, color: state.currentColor, type: 'special', value: SPECIAL_TYPES.REVERSE };
    state.hands[0].push(reverseCard);
    playCard(state, 0, 902);
    assertEqual(state.currentPlayer, 0, 'same player goes again');
  });
});

describe('playCard() — Draw Two', () => {
  it('next player draws 2 and is skipped', () => {
    const state = createGameState(4);
    const player1HandBefore = state.hands[1].length;
    const drawTwoCard = { id: 903, color: state.currentColor, type: 'special', value: SPECIAL_TYPES.DRAW_TWO };
    state.hands[0].push(drawTwoCard);
    playCard(state, 0, 903);
    assertEqual(state.hands[1].length, player1HandBefore + 2, 'player 1 drew 2 cards');
    assertEqual(state.currentPlayer, 2, 'player 1 skipped, now player 2');
  });
});

describe('playCard() — Wild Draw Four', () => {
  it('next player draws 4, is skipped, and color changes', () => {
    const state = createGameState(4);
    const player1HandBefore = state.hands[1].length;
    const wd4Card = { id: 904, color: 'wild', type: 'special', value: SPECIAL_TYPES.WILD_DRAW_FOUR };
    state.hands[0].push(wd4Card);
    playCard(state, 0, 904, 'blue');
    assertEqual(state.hands[1].length, player1HandBefore + 4, 'player 1 drew 4 cards');
    assertEqual(state.currentPlayer, 2, 'player 1 skipped');
    assertEqual(state.currentColor, 'blue', 'color changed to blue');
  });
});

describe('playCard() — Wild', () => {
  it('changes color to chosen color', () => {
    const state = createGameState(4);
    const wildCard = { id: 905, color: 'wild', type: 'special', value: SPECIAL_TYPES.WILD };
    state.hands[0].push(wildCard);
    playCard(state, 0, 905, 'green');
    assertEqual(state.currentColor, 'green', 'color changed to green');
    assertEqual(state.currentPlayer, 1, 'advances normally');
  });
});

describe('playCard() — Game over', () => {
  it('detects win when hand is empty', () => {
    const state = createGameState(4);
    const lastCard = { id: 906, color: state.currentColor, type: 'number', value: 1 };
    state.hands[0] = [lastCard];
    playCard(state, 0, 906);
    assertEqual(state.gameOver, true, 'game is over');
    assertEqual(state.winner, 0, 'player 0 wins');
  });
});

describe('drawCards()', () => {
  it('draws cards from the draw pile into hand', () => {
    const state = createGameState(4);
    const handBefore = state.hands[0].length;
    const pileBefore = state.drawPile.length;
    const drawn = drawCards(state, 0, 2);
    assertEqual(drawn.length, 2, 'drew 2 cards');
    assertEqual(state.hands[0].length, handBefore + 2, 'hand grew by 2');
    assertEqual(state.drawPile.length, pileBefore - 2, 'pile shrunk by 2');
  });

  it('reshuffles discard pile when draw pile is empty', () => {
    const state = createGameState(4);
    state.drawPile = [];
    const topCard = state.discardPile[state.discardPile.length - 1];
    state.discardPile = [
      { id: 800, color: 'red', type: 'number', value: 1 },
      { id: 801, color: 'blue', type: 'number', value: 2 },
      { id: 802, color: 'green', type: 'number', value: 3 },
      topCard
    ];
    const drawn = drawCards(state, 0, 1);
    assertEqual(drawn.length, 1, 'drew 1 card from reshuffled pile');
    assertEqual(state.discardPile.length, 1, 'discard has only top card');
  });

  it('stops drawing when both piles are empty', () => {
    const state = createGameState(4);
    state.drawPile = [];
    state.discardPile = [getTopCard(state)];
    const drawn = drawCards(state, 0, 5);
    assertEqual(drawn.length, 0, 'cannot draw any cards');
  });
});
```

**Step 2: Commit**

```bash
cd /Users/shaykovach/.openclaw/workspaces/frontend/uno-hebrew-game
git add tests/test-state.js
git commit -m "test: add state.js unit tests — game logic, special cards, draw pile"
```

---

## Task 4: Write Bot Tests

**Files:**
- Create: `tests/test-bot.js`
- Reference: `js/bot.js`, `js/constants.js`, `js/state.js`

**Step 1: Create `tests/test-bot.js`**

```javascript
import { describe, it, assert, assertEqual, showSummary } from './runner.js';
import { botChooseCard, botChooseColor } from '../js/bot.js';

describe('botChooseCard()', () => {
  const topCard = { id: 0, color: 'red', type: 'number', value: 5 };
  const currentColor = 'red';

  it('returns null when no cards are playable', () => {
    const hand = [
      { id: 1, color: 'blue', type: 'number', value: 3 },
      { id: 2, color: 'green', type: 'number', value: 7 }
    ];
    const result = botChooseCard(hand, topCard, currentColor);
    assertEqual(result, null, 'no playable card');
  });

  it('prefers color-matching number cards', () => {
    const hand = [
      { id: 1, color: 'blue', type: 'number', value: 5 },
      { id: 2, color: 'red', type: 'number', value: 3 },
      { id: 3, color: 'red', type: 'special', value: 'skip' },
      { id: 4, color: 'wild', type: 'special', value: 'wild' }
    ];
    const result = botChooseCard(hand, topCard, currentColor);
    assertEqual(result.id, 2, 'picks red number card');
  });

  it('falls back to any number card when no color match', () => {
    const hand = [
      { id: 1, color: 'blue', type: 'number', value: 5 },
      { id: 2, color: 'red', type: 'special', value: 'skip' },
      { id: 3, color: 'wild', type: 'special', value: 'wild' }
    ];
    const result = botChooseCard(hand, topCard, currentColor);
    assertEqual(result.id, 1, 'picks number card matching by value');
  });

  it('falls back to action cards when no numbers', () => {
    const hand = [
      { id: 1, color: 'red', type: 'special', value: 'skip' },
      { id: 2, color: 'wild', type: 'special', value: 'wild' }
    ];
    const result = botChooseCard(hand, topCard, currentColor);
    assertEqual(result.id, 1, 'picks action card over wild');
  });

  it('uses wild as last resort', () => {
    const hand = [
      { id: 1, color: 'wild', type: 'special', value: 'wild' }
    ];
    const result = botChooseCard(hand, topCard, currentColor);
    assertEqual(result.id, 1, 'picks wild when only option');
  });
});

describe('botChooseColor()', () => {
  it('chooses the most frequent color in hand', () => {
    const hand = [
      { id: 1, color: 'blue', type: 'number', value: 1 },
      { id: 2, color: 'blue', type: 'number', value: 3 },
      { id: 3, color: 'red', type: 'number', value: 5 },
      { id: 4, color: 'blue', type: 'number', value: 7 }
    ];
    const result = botChooseColor(hand);
    assertEqual(result, 'blue', 'picks blue (3 cards)');
  });

  it('defaults to red for empty hand', () => {
    const result = botChooseColor([]);
    assertEqual(result, 'red', 'defaults to red');
  });

  it('defaults to red for all-wild hand', () => {
    const hand = [
      { id: 1, color: 'wild', type: 'special', value: 'wild' },
      { id: 2, color: 'wild', type: 'special', value: 'wild_draw_four' }
    ];
    const result = botChooseColor(hand);
    assertEqual(result, 'red', 'defaults to red when all wilds');
  });

  it('breaks ties by COLORS order (red first)', () => {
    const hand = [
      { id: 1, color: 'red', type: 'number', value: 1 },
      { id: 2, color: 'blue', type: 'number', value: 1 }
    ];
    const result = botChooseColor(hand);
    assertEqual(result, 'red', 'red wins tie');
  });
});

// All test files loaded — show summary
showSummary();
```

**Step 2: Run all tests**

Open `http://localhost:8080/tests/test.html`. All tests should pass.

**Step 3: Commit**

```bash
cd /Users/shaykovach/.openclaw/workspaces/frontend/uno-hebrew-game
git add tests/test-bot.js
git commit -m "test: add bot.js unit tests — card selection priority, color choice"
```

---

## Task 5: Add Error Handling to Sounds

**Files:**
- Modify: `js/sounds.js:1-14` (wrap AudioContext in try/catch)
- Modify: `js/sounds.js:80-84` (safe initAudio)

**Step 1: Replace lines 1-14 in `js/sounds.js`**

Replace the top of the file with safe AudioContext creation:

```javascript
let audioCtx = null;
let audioEnabled = true;

try {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
} catch (e) {
  audioEnabled = false;
}

function playTone(freq, duration, type = 'sine', volume = 0.3) {
  if (!audioEnabled || !audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    // Silently ignore audio errors
  }
}
```

**Step 2: Replace `initAudio()` (lines 80-84) with:**

```javascript
export function initAudio() {
  document.addEventListener('click', () => {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  }, { once: true });
}
```

**Step 3: Verify sounds still work**

Open the game, click to start, play a card. Sounds should work normally.

**Step 4: Commit**

```bash
cd /Users/shaykovach/.openclaw/workspaces/frontend/uno-hebrew-game
git add js/sounds.js
git commit -m "fix: wrap Web Audio API in try/catch for graceful degradation"
```

---

## Task 6: Add Error Handling to Service Worker Registration

**Files:**
- Modify: `index.html:104-108`

**Step 1: Replace lines 104-108 in `index.html`**

```html
  <script>
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('service-worker.js').catch(function() {});
    }
  </script>
```

**Step 2: Commit**

```bash
cd /Users/shaykovach/.openclaw/workspaces/frontend/uno-hebrew-game
git add index.html
git commit -m "fix: handle service worker registration failure gracefully"
```

---

## Task 7: Add ARIA Labels to HTML

**Files:**
- Modify: `index.html` (add aria-labels to interactive elements)
- Modify: `styles.css` (add sr-only class)

**Step 1: Add ARIA labels to buttons in `index.html`**

Update these elements with `aria-label` attributes:

1. Player count buttons (lines 30-32): Add `aria-label="2 שחקנים"`, `aria-label="3 שחקנים"`, `aria-label="4 שחקנים"`
2. Start button (line 35): Add `aria-label="התחל משחק"`
3. Draw pile div (line 57): Add `aria-label="שלוף קלף"` and `role="button"`
4. Restart button (line 72): Add `aria-label="משחק חדש"`
5. UNO button (line 77): Add `aria-label="קרא אונו"`
6. Color picker buttons (lines 88-91): Add `aria-label="אדום"`, `aria-label="כחול"`, `aria-label="ירוק"`, `aria-label="צהוב"`
7. Play again button (line 100): Add `aria-label="שחק שוב"`
8. Color picker overlay (line 84): Add `role="dialog"` and `aria-label="בחר צבע"`

Also add an `aria-live` region. Add before line 80 (before closing `</div>` of game-table):

```html
        <div id="game-announcements" class="sr-only" aria-live="polite" aria-atomic="true"></div>
```

**Step 2: Add `sr-only` CSS class to `styles.css`**

Add after line 14 (after the `background: #000;` line):

```css
.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0,0,0,0);
  white-space: nowrap;
  border: 0;
}
```

**Step 3: Commit**

```bash
cd /Users/shaykovach/.openclaw/workspaces/frontend/uno-hebrew-game
git add index.html styles.css
git commit -m "feat: add ARIA labels and screen reader live region"
```

---

## Task 8: Add Keyboard Navigation

**Files:**
- Modify: `js/ui.js:131-149` (add tabindex and keydown to cards)
- Modify: `js/app.js` (add Escape key for color picker)

**Step 1: Update `renderPlayerHand()` in `js/ui.js`**

In the `hand.forEach` loop (around line 131-149), after the existing `el.classList.add('playable')` and click listener, add keyboard support:

```javascript
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
      const colorName = card.color === 'wild' ? 'ג\'וקר' :
        ({ red: 'אדום', blue: 'כחול', green: 'ירוק', yellow: 'צהוב' }[card.color] || card.color);
      const valueName = card.type === 'number' ? String(card.value) :
        ({ skip: 'דילוג', reverse: 'הפוך', draw_two: 'פלוס 2', wild: 'ג\'וקר', wild_draw_four: 'פלוס 4' }[card.value] || '');
      el.setAttribute('aria-label', colorName + ' ' + valueName);
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onCardClick(card);
        }
      });
```

For non-playable cards, after `el.classList.add('not-playable')`, add:

```javascript
      el.setAttribute('aria-disabled', 'true');
```

**Step 2: Add Escape key to close color picker in `js/app.js`**

In `init()` (after the color picker button listeners, around line 35), add:

```javascript
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state && state.pendingAction && state.pendingAction.type === 'colorPick') {
      state.pendingAction = null;
      hideColorPicker();
    }
  });
```

**Step 3: Commit**

```bash
cd /Users/shaykovach/.openclaw/workspaces/frontend/uno-hebrew-game
git add js/ui.js js/app.js
git commit -m "feat: add keyboard navigation — Tab, Enter, Escape support"
```

---

## Task 9: Add Screen Reader Announcements

**Files:**
- Modify: `js/ui.js` (add announce function, hook into showToast and renderCenterArea)
- Modify: `js/app.js` (import announce, use in endGame)

**Step 1: Add `announce()` function to `js/ui.js`**

Add after `showToast()` (after line 32):

```javascript
export function announce(message) {
  const el = document.getElementById('game-announcements');
  if (el) {
    el.textContent = message;
  }
}
```

**Step 2: Call `announce(message)` inside `showToast()`**

Inside the existing `showToast()` function, after creating the toast element and before the timeout, add:

```javascript
  announce(message);
```

**Step 3: Announce turn in `renderCenterArea()`**

In the turn message section (around line 302-306), after `turnMessage.textContent = '...'`, add:

```javascript
      announce('!התור שלך');
```

(Only inside the `state.currentPlayer === 0` branch.)

**Step 4: Add `announce` to imports in `js/app.js`**

Add `announce` to the import from `'./ui.js'` at line 3.

**Step 5: Announce game result in `endGame()` in `js/app.js`**

After `showEndScreen(...)` calls, add:

```javascript
  // For winner === 0:
  announce('כל הכבוד! ניצחת!');
  // For other winner:
  announce(winnerName + ' ניצח! נסה שוב');
```

**Step 6: Commit**

```bash
cd /Users/shaykovach/.openclaw/workspaces/frontend/uno-hebrew-game
git add js/ui.js js/app.js
git commit -m "feat: add screen reader announcements for game events"
```

---

## Task 10: Add Reduced Motion Support

**Files:**
- Modify: `styles.css` (add `prefers-reduced-motion` media query)

**Step 1: Add reduced motion styles to `styles.css`**

Add before the PWA standalone block (before line 922):

```css
/* ================================================================
   REDUCED MOTION — respect user's motion preferences
   ================================================================ */
@media (prefers-reduced-motion: reduce) {
  .floating-card,
  .game-title,
  .confetti-piece,
  .uno-popup,
  .active-player,
  .btn-uno, #uno-btn {
    animation: none !important;
  }

  .card,
  .hand-card,
  .btn-primary,
  .draw-pile,
  #draw-pile,
  .color-btn,
  .game-toast,
  .action-feedback {
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

**Step 2: Commit**

```bash
cd /Users/shaykovach/.openclaw/workspaces/frontend/uno-hebrew-game
git add styles.css
git commit -m "feat: add prefers-reduced-motion support for accessibility"
```

---

## Task 11: Add Focus-Visible Styles

**Files:**
- Modify: `styles.css`

**Step 1: Add focus styles to `styles.css`**

Add after the reduced motion block:

```css
/* ================================================================
   FOCUS VISIBLE — keyboard navigation indicators
   ================================================================ */
*:focus { outline: none; }

*:focus-visible {
  outline: 3px solid #FFD700;
  outline-offset: 2px;
}

.hand-card:focus-visible {
  box-shadow: 0 0 0 3px #FFD700, 0 4px 16px rgba(255,215,0,0.4);
  z-index: 100 !important;
}

.color-btn:focus-visible {
  outline: 3px solid white;
  outline-offset: 3px;
  transform: scale(1.1);
}
```

**Step 2: Commit**

```bash
cd /Users/shaykovach/.openclaw/workspaces/frontend/uno-hebrew-game
git add styles.css
git commit -m "feat: add focus-visible styles for keyboard navigation"
```

---

## Task 12: PWA Install Prompt and Update Detection

**Files:**
- Create: `js/pwa.js`
- Modify: `js/app.js` (import and call pwa init)
- Modify: `styles.css` (add banner styles)
- Modify: `service-worker.js` (add pwa.js to cache, bump version)

**Step 1: Create `js/pwa.js`**

Uses only safe DOM methods (createElement + textContent, no innerHTML):

```javascript
// PWA install prompt and service worker update detection

let deferredPrompt = null;

export function initPWA() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    const visits = parseInt(localStorage.getItem('uno_visits') || '0', 10);
    if (visits >= 3) return;
    localStorage.setItem('uno_visits', String(visits + 1));

    showInstallBanner();
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(reg => {
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateBanner();
          }
        });
      });
    });
  }
}

function showInstallBanner() {
  if (document.querySelector('.install-banner')) return;

  const banner = document.createElement('div');
  banner.classList.add('install-banner');

  const label = document.createElement('span');
  label.textContent = 'התקן כאפליקציה';
  banner.appendChild(label);

  const installBtn = document.createElement('button');
  installBtn.classList.add('install-btn');
  installBtn.textContent = 'התקן';
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    banner.remove();
  });
  banner.appendChild(installBtn);

  const dismissBtn = document.createElement('button');
  dismissBtn.classList.add('install-dismiss');
  dismissBtn.textContent = '\u2715';
  dismissBtn.setAttribute('aria-label', 'סגור');
  dismissBtn.addEventListener('click', () => {
    banner.remove();
    localStorage.setItem('uno_visits', '3');
  });
  banner.appendChild(dismissBtn);

  document.body.appendChild(banner);
}

function showUpdateBanner() {
  if (document.querySelector('.update-banner')) return;

  const banner = document.createElement('div');
  banner.classList.add('update-banner');

  const label = document.createElement('span');
  label.textContent = 'גרסה חדשה זמינה';
  banner.appendChild(label);

  const updateBtn = document.createElement('button');
  updateBtn.classList.add('update-btn');
  updateBtn.textContent = 'רענן';
  updateBtn.addEventListener('click', () => {
    window.location.reload();
  });
  banner.appendChild(updateBtn);

  document.body.appendChild(banner);
}
```

**Step 2: Add CSS for install/update banners to `styles.css`**

Add before the reduced motion block:

```css
/* ===== PWA Banners ===== */
.install-banner, .update-banner {
  position: fixed;
  bottom: 20px; left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.9);
  border: 1px solid rgba(255,215,0,0.3);
  border-radius: 16px;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 600;
  color: white;
  font-size: 14px;
  font-weight: 600;
  backdrop-filter: blur(8px);
}

.install-btn, .update-btn {
  background: #ED1C24;
  color: white;
  border: none;
  border-radius: 20px;
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.install-dismiss {
  background: none;
  border: none;
  color: rgba(255,255,255,0.5);
  font-size: 16px;
  cursor: pointer;
  padding: 0 4px;
}
```

**Step 3: Import and call `initPWA()` in `js/app.js`**

Add to imports:

```javascript
import { initPWA } from './pwa.js';
```

Call inside `init()` after `initAudio()`:

```javascript
  initPWA();
```

**Step 4: Update `service-worker.js`**

Add `'/hebrew-uno-game/js/pwa.js'` to ASSETS array.

Change `'uno-game-v1'` to `'uno-game-v2'`.

**Step 5: Commit**

```bash
cd /Users/shaykovach/.openclaw/workspaces/frontend/uno-hebrew-game
git add js/pwa.js js/app.js styles.css service-worker.js
git commit -m "feat: add PWA install prompt and service worker update detection"
```

---

## Task 13: Add Manifest Improvements

**Files:**
- Modify: `manifest.json`

**Step 1: Update `manifest.json`**

Add `categories` and `id` fields:

```json
{
  "name": "UNO - משחק קלפים",
  "short_name": "UNO",
  "description": "משחק הקלפים המוכר והאהוב - שחקו עם המשפחה",
  "start_url": "/hebrew-uno-game/",
  "scope": "/hebrew-uno-game/",
  "id": "/hebrew-uno-game/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#0a0a0a",
  "theme_color": "#ED1C24",
  "categories": ["games"],
  "icons": [
    {
      "src": "icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**Step 2: Commit**

```bash
cd /Users/shaykovach/.openclaw/workspaces/frontend/uno-hebrew-game
git add manifest.json
git commit -m "feat: improve PWA manifest with categories and id"
```

---

## Task 14: Add Local Game Statistics

**Files:**
- Create: `js/stats.js`
- Modify: `js/app.js` (record stats on game end, add stats button listener)
- Modify: `index.html` (add stats button)
- Modify: `styles.css` (add stats overlay styles)
- Modify: `service-worker.js` (add stats.js to cache)

**Step 1: Create `js/stats.js`**

Uses only safe DOM methods (createElement + textContent, no innerHTML):

```javascript
// Local game statistics — stored in localStorage

const STATS_KEY = 'uno_game_stats';

function getStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    currentStreak: 0,
    longestStreak: 0,
    playerCounts: { 2: 0, 3: 0, 4: 0 },
    totalTurns: 0
  };
}

function saveStats(stats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (e) {}
}

export function recordGame(won, playerCount, turnCount) {
  const stats = getStats();
  stats.gamesPlayed++;
  if (won) {
    stats.gamesWon++;
    stats.currentStreak++;
    if (stats.currentStreak > stats.longestStreak) {
      stats.longestStreak = stats.currentStreak;
    }
  } else {
    stats.gamesLost++;
    stats.currentStreak = 0;
  }
  if (stats.playerCounts[playerCount] !== undefined) {
    stats.playerCounts[playerCount]++;
  }
  stats.totalTurns += (turnCount || 0);
  saveStats(stats);
}

function createStatItem(value, label) {
  const item = document.createElement('div');
  item.classList.add('stat-item');

  const valEl = document.createElement('span');
  valEl.classList.add('stat-value');
  valEl.textContent = String(value);
  item.appendChild(valEl);

  const labelEl = document.createElement('span');
  labelEl.classList.add('stat-label');
  labelEl.textContent = label;
  item.appendChild(labelEl);

  return item;
}

export function renderStatsOverlay() {
  const stats = getStats();
  const winRate = stats.gamesPlayed > 0
    ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
    : 0;
  const avgTurns = stats.gamesPlayed > 0
    ? Math.round(stats.totalTurns / stats.gamesPlayed)
    : 0;

  // Find most played player count
  let favCount = 4;
  let favCountMax = 0;
  for (const [count, times] of Object.entries(stats.playerCounts)) {
    if (times > favCountMax) {
      favCountMax = times;
      favCount = count;
    }
  }

  const overlay = document.createElement('div');
  overlay.id = 'stats-overlay';
  overlay.classList.add('overlay');

  const content = document.createElement('div');
  content.classList.add('stats-content');

  const heading = document.createElement('h2');
  heading.textContent = 'סטטיסטיקות';
  content.appendChild(heading);

  const grid = document.createElement('div');
  grid.classList.add('stats-grid');
  grid.appendChild(createStatItem(stats.gamesPlayed, 'משחקים'));
  grid.appendChild(createStatItem(stats.gamesWon, 'ניצחונות'));
  grid.appendChild(createStatItem(winRate + '%', 'אחוז ניצחון'));
  grid.appendChild(createStatItem(stats.longestStreak, 'רצף שיא'));
  grid.appendChild(createStatItem(avgTurns, 'תורות ממוצע'));
  grid.appendChild(createStatItem(favCount, 'שחקנים מועדף'));
  content.appendChild(grid);

  const buttons = document.createElement('div');
  buttons.classList.add('stats-buttons');

  const closeBtn = document.createElement('button');
  closeBtn.classList.add('btn-stats-close');
  closeBtn.textContent = 'סגור';
  closeBtn.addEventListener('click', () => overlay.remove());
  buttons.appendChild(closeBtn);

  const resetBtn = document.createElement('button');
  resetBtn.classList.add('btn-stats-reset');
  resetBtn.textContent = 'אפס סטטיסטיקות';
  resetBtn.addEventListener('click', () => {
    localStorage.removeItem(STATS_KEY);
    overlay.remove();
  });
  buttons.appendChild(resetBtn);

  content.appendChild(buttons);
  overlay.appendChild(content);

  // Close on Escape
  const onEsc = (e) => {
    if (e.key === 'Escape') {
      overlay.remove();
      document.removeEventListener('keydown', onEsc);
    }
  };
  document.addEventListener('keydown', onEsc);

  document.body.appendChild(overlay);
}
```

**Step 2: Add stats button to welcome screen in `index.html`**

After the start button (line 35), before `</div>` of `welcome-content`, add:

```html
      <button id="stats-btn" class="btn-stats" aria-label="סטטיסטיקות">📊</button>
```

**Step 3: Add stats CSS to `styles.css`**

Add before the PWA banners section:

```css
/* ===== Stats ===== */
.btn-stats {
  position: absolute;
  top: 16px; right: 16px;
  width: 40px; height: 40px;
  border-radius: 50%;
  border: none;
  background: rgba(255,255,255,0.08);
  color: white;
  font-size: 20px;
  cursor: pointer;
  z-index: 5;
  transition: background 0.2s;
}

.btn-stats:hover { background: rgba(255,255,255,0.15); }

.stats-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 32px;
  background: rgba(20,20,20,0.95);
  border-radius: 20px;
  border: 1px solid rgba(255,215,0,0.2);
  max-width: 340px;
  width: 90%;
}

.stats-content h2 {
  color: #FFD700;
  font-size: 24px;
  font-weight: 800;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
  width: 100%;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-value {
  color: white;
  font-size: 28px;
  font-weight: 800;
}

.stat-label {
  color: rgba(255,255,255,0.5);
  font-size: 11px;
  font-weight: 600;
}

.stats-buttons {
  display: flex;
  gap: 12px;
}

.btn-stats-close {
  background: #ED1C24;
  color: white;
  border: none;
  border-radius: 20px;
  padding: 8px 24px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.btn-stats-reset {
  background: none;
  border: 1px solid rgba(255,255,255,0.2);
  color: rgba(255,255,255,0.5);
  border-radius: 20px;
  padding: 8px 16px;
  font-size: 12px;
  cursor: pointer;
}

.btn-stats-reset:hover {
  border-color: rgba(248,113,113,0.5);
  color: #f87171;
}
```

**Step 4: Wire up stats in `js/app.js`**

Add import at top:

```javascript
import { recordGame, renderStatsOverlay } from './stats.js';
```

Add stats button listener in `init()`:

```javascript
  document.getElementById('stats-btn').addEventListener('click', () => renderStatsOverlay());
```

Add a turn counter. At module level (around line 10):

```javascript
let turnCount = 0;
```

Reset in `startGame()`:

```javascript
  turnCount = 0;
```

Increment in `afterTurnEnd()` (at the start of the function):

```javascript
  turnCount++;
```

Record game result in `endGame()` (before the winner check):

```javascript
  recordGame(state.winner === 0, state.numPlayers, turnCount);
```

**Step 5: Update `service-worker.js`**

Add `'/hebrew-uno-game/js/stats.js'` to ASSETS array.

**Step 6: Commit**

```bash
cd /Users/shaykovach/.openclaw/workspaces/frontend/uno-hebrew-game
git add js/stats.js js/app.js index.html styles.css service-worker.js
git commit -m "feat: add local game statistics with overlay display"
```

---

## Task 15: Final Verification and Deploy

**Files:**
- Modify: `service-worker.js` (verify all files cached)
- No new code — verification task

**Step 1: Verify `service-worker.js` ASSETS array**

Should include:

```javascript
const ASSETS = [
  '/hebrew-uno-game/',
  '/hebrew-uno-game/index.html',
  '/hebrew-uno-game/styles.css',
  '/hebrew-uno-game/manifest.json',
  '/hebrew-uno-game/js/app.js',
  '/hebrew-uno-game/js/animations.js',
  '/hebrew-uno-game/js/bot.js',
  '/hebrew-uno-game/js/constants.js',
  '/hebrew-uno-game/js/deck.js',
  '/hebrew-uno-game/js/sounds.js',
  '/hebrew-uno-game/js/state.js',
  '/hebrew-uno-game/js/ui.js',
  '/hebrew-uno-game/js/pwa.js',
  '/hebrew-uno-game/js/stats.js'
];
```

**Step 2: Run the full test suite**

Open `http://localhost:8080/tests/test.html`. All tests should pass.

**Step 3: Manual verification checklist**

- Game starts and plays normally
- Sounds work (or fail silently)
- Tab key cycles through playable cards
- Enter plays a focused card
- Escape closes color picker
- Stats button on welcome screen opens overlay
- Stats update after a game ends
- Reset stats clears data
- Restart button works
- Chrome DevTools Rendering: emulate prefers-reduced-motion — animations stop
- No console errors

**Step 4: Commit any final fixes**

```bash
cd /Users/shaykovach/.openclaw/workspaces/frontend/uno-hebrew-game
git add -A
git commit -m "chore: final service worker update and verification"
```

**Step 5: Push to deploy**

```bash
git push origin main
```

This triggers the GitHub Actions workflow to deploy to GitHub Pages.
