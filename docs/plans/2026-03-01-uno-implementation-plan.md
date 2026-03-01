# Hebrew UNO Game Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the static Hebrew UNO card display into a fully playable, visually polished single-player UNO game against 3 bot opponents for kids ages 6-9.

**Architecture:** Vanilla ES modules (no framework, no build step). Game state managed by a central `GameState` object. Rendering driven by state changes via a simple `render()` pattern. Bot AI runs on `setTimeout` delays for natural feel.

**Tech Stack:** HTML5, CSS3 (animations, transforms, grid), vanilla JavaScript (ES modules), GitHub Pages deployment.

**Design doc:** `docs/plans/2026-03-01-uno-game-redesign.md`

**Security note:** All card content is generated from trusted constants (Hebrew number strings, symbol characters). No user-generated content is rendered as HTML. The innerHTML usage throughout is safe because all interpolated values come from hardcoded constants (HEBREW_NUMBERS, SPECIAL_SYMBOLS, numeric card values). No external or user input is ever inserted into the DOM as HTML.

---

### Task 1: Project Scaffolding & Module Structure

**Files:**
- Modify: `index.html`
- Create: `js/constants.js`
- Create: `js/deck.js`
- Create: `js/state.js`
- Create: `js/bot.js`
- Create: `js/ui.js`
- Create: `js/animations.js`
- Create: `js/app.js`
- Delete: `app.js` (replaced by modular structure)

**Step 1: Update `index.html` with game layout skeleton**

Replace the entire file with the full HTML structure containing:
- Welcome screen with game title and play button
- Game table with grid layout: bot areas (top/left/right), center area (draw pile, discard pile, direction indicator, turn message), player area (hand + UNO button)
- Color picker overlay with 4 color buttons
- End screen with confetti container, message, and play again button
- Script tag with `type="module"` pointing to `js/app.js`

Key HTML structure:

```html
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>משחק UNO לילדים</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="game-container">
    <div id="welcome-screen" class="screen">...</div>
    <div id="game-table" class="screen hidden">
      <div id="bot-top" class="bot-area bot-top"></div>
      <div id="bot-left" class="bot-area bot-left"></div>
      <div id="bot-right" class="bot-area bot-right"></div>
      <div id="center-area">
        <div id="draw-pile" class="pile"></div>
        <div id="discard-pile" class="pile"></div>
        <div id="direction-indicator"></div>
        <div id="turn-message"></div>
      </div>
      <div id="player-area">
        <div id="player-hand"></div>
        <button id="uno-btn" class="uno-button hidden">!UNO</button>
      </div>
      <div id="color-picker" class="overlay hidden">...</div>
    </div>
    <div id="end-screen" class="screen hidden">...</div>
  </div>
  <script type="module" src="js/app.js"></script>
</body>
</html>
```

**Step 2: Create empty module files with exports**

Create `js/constants.js` with all game constants:
- `COLORS` array: red, blue, green, yellow
- `COLOR_HEX` map: color name to hex code (#FF5555, #5555FF, #55AA55, #FFAA00)
- `HEBREW_NUMBERS` array: אפס through תשע (0-9)
- `SPECIAL_TYPES` object: SKIP, REVERSE, DRAW_TWO, WILD, WILD_DRAW_FOUR
- `SPECIAL_SYMBOLS` map: skip=⊘, reverse=⟲, draw_two=+2, wild=★, wild_draw_four=+4
- `PLAYERS` object: HUMAN=0, BOT_LEFT=1, BOT_TOP=2, BOT_RIGHT=3
- `PLAYER_NAMES` map: Hebrew names for each player

Create stub files for `js/deck.js`, `js/state.js`, `js/bot.js`, `js/ui.js`, `js/animations.js` with empty exported functions.

Create `js/app.js` entry point that imports `showScreen` and calls `showScreen('welcome-screen')`.

**Step 3: Delete old `app.js`**

Remove the root-level `app.js` file.

**Step 4: Verify structure by opening in browser**

Run: Open `index.html` in browser.
Expected: Welcome screen visible with title and button. No console errors.

**Step 5: Commit**

```bash
git rm app.js
git add index.html js/ styles.css
git commit -m "refactor: restructure into ES modules with game layout skeleton"
```

---

### Task 2: Game Constants & Deck Logic

**Files:**
- Modify: `js/constants.js` (already has content from Task 1)
- Modify: `js/deck.js`

**Step 1: Implement deck creation**

`createDeck()` builds the standard 108-card UNO deck:
- For each of 4 colors: one 0, two each of 1-9, two each of Skip/Reverse/Draw Two
- 4 Wilds and 4 Wild Draw Fours (color = 'wild')
- Each card object: `{ id, color, type: 'number'|'special', value }`

`shuffle(cards)` uses Fisher-Yates shuffle, returns new array.

`deal(deck, numPlayers, cardsPerPlayer=7)` deals cards round-robin, returns `{ hands, remaining }`.

**Step 2: Verify deck has 108 cards**

Temp console.log in app.js. Open browser, check console shows `Deck size: 108`.

**Step 3: Remove temp log and commit**

```bash
git add js/constants.js js/deck.js js/app.js
git commit -m "feat: add deck creation, shuffle, and deal logic"
```

---

### Task 3: Game State Module

**Files:**
- Modify: `js/state.js`

**Step 1: Implement game state and card matching**

`createGameState()`:
- Creates shuffled deck, deals 4 hands of 7
- Finds first number card in remaining pile for starting discard
- Returns state object: `{ hands, drawPile, discardPile, currentPlayer, direction, currentColor, gameOver, winner, mustCallUno, unoCalledBy: Set, pendingAction }`

`getTopCard(state)` — returns last card in discard pile.

`canPlayCard(card, topCard, currentColor)`:
- Wild cards always playable
- Match by color (card.color === currentColor)
- Match by number value (both number type, same value)
- Match by special type (both special type, same value)

`getPlayableCards(hand, topCard, currentColor)` — filters hand.

`nextPlayerIndex(current, direction)` — wraps around 0-3.

`drawCards(state, playerIndex, count)`:
- Pops from drawPile, pushes to hand
- If drawPile empty: reshuffles discard pile (keeping top card) into draw pile
- Returns array of drawn cards

`playCard(state, playerIndex, cardId, chosenColor)`:
- Validates card is playable
- Removes from hand, adds to discard
- Updates currentColor (chosenColor for wilds)
- Checks win condition (empty hand)
- Handles special card effects:
  - SKIP: advances past next player
  - REVERSE: flips direction
  - DRAW_TWO: next player draws 2 and is skipped
  - WILD_DRAW_FOUR: next player draws 4 and is skipped
- Advances currentPlayer

**Step 2: Verify state creation**

Temp log in app.js to check: 4 hands of 7, valid top card, ~79 in draw pile.

**Step 3: Remove temp log and commit**

```bash
git add js/state.js js/app.js
git commit -m "feat: add game state management and card matching rules"
```

---

### Task 4: Card CSS Design

**Files:**
- Modify: `styles.css` (complete rewrite)

**Step 1: Write the complete stylesheet**

Replace `styles.css` with all game styles. Major sections:

**Reset & base:** Box-sizing reset, full viewport, RTL direction, font family.

**Screens:** Absolute positioning, hidden class.

**Welcome screen:** Green gradient background, large pulsing title (keyframe animation), gradient play button with hover lift effect.

**Game table:** Radial green gradient (felt), CSS Grid with 3 rows x 3 columns for bot/center/player areas.

**Bot areas:** Flex-centered, card-back elements (dark gradient with red border), count badge (red circle), name label. Active player glow animation (keyframes with drop-shadow).

**Center area:** Flex centered, draw pile (dark with UNO text, hover scale), discard pile, direction arrow, turn message in gold.

**Cards (120x180px):** Rounded corners, color-specific gradients (red/blue/green/yellow/wild rainbow), white oval center with card text, corner numbers. Playable cards: brightness boost, hover lifts translateY(-20px). Not-playable: dimmed brightness and saturation.

**Player hand:** Absolute positioned cards with transform-origin bottom center for fan arc effect.

**UNO button:** Gradient red, pulsing scale animation, positioned above player hand.

**Color picker overlay:** Fixed fullscreen dark backdrop, centered panel with 4 large color circles (80x80px), hover scale effect.

**End screen:** Dark overlay, gold text, play again button.

**Confetti:** Absolute positioned pieces with fall animation (translateY + rotate).

**UNO popup:** Fixed center, large red text with bounce-in/fade-out animation.

**Current color indicator:** Small circle below discard pile showing active color for wild cards.

**Step 2: Verify in browser**

Open `index.html`. Welcome screen should show green gradient with styled title and button.

**Step 3: Commit**

```bash
git add styles.css
git commit -m "feat: add complete game stylesheet with cards, table, and animations"
```

---

### Task 5: Card Rendering & UI Module

**Files:**
- Modify: `js/ui.js`

**Step 1: Implement card element creation and rendering**

`showScreen(screenId)` — hides all .screen elements, shows the specified one.

`createCardElement(card, faceUp=true)`:
- Creates div.card with dataset.cardId
- If faceDown: dark background, "UNO" text
- If faceUp: adds color class (card-red etc), builds inner structure with corner numbers and center oval containing Hebrew number or special symbol
- All text content comes from trusted HEBREW_NUMBERS and SPECIAL_SYMBOLS constants
- Uses textContent for plain text nodes; uses safe DOM construction (createElement + appendChild) for structure to avoid innerHTML with any dynamic content

`renderPlayerHand(state, onCardClick)`:
- Clears player-hand element
- Calculates fan arc: maxSpread=50deg, angleStep based on card count
- For each card: creates element, determines playable state, adds click handler, positions with CSS transform (rotate + left offset)
- Playable cards get 'playable' class, others get 'not-playable'

`renderBotHands(state)`:
- For each bot (left/top/right): clears area, creates card-back divs (max 7 shown), count badge, name label
- Active player gets 'active-player' class for glow

`renderCenterArea(state)`:
- Renders top card on discard pile
- If wild: adds current-color indicator circle
- Updates direction arrow (↻ or ↺)
- Shows "!תורך" message when it's human's turn

`renderGame(state, onCardClick)`:
- Calls all render functions above
- Toggles UNO button visibility (shown when player has 2 cards on their turn)

`showUnoPopup()`:
- Creates temporary div.uno-popup with "!UNO" text, auto-removes after 1 second

**Step 2: Wire up temp test in app.js**

Create game state, show game table, render with click logger. Verify: fan hand, bot areas, center piles all render correctly.

**Step 3: Commit**

```bash
git add js/ui.js js/app.js
git commit -m "feat: add card rendering, player hand fan, bot hands, and center area"
```

---

### Task 6: Bot AI Module

**Files:**
- Modify: `js/bot.js`

**Step 1: Implement bot card selection and color choice**

`botChooseCard(hand, topCard, currentColor)`:
- Gets playable cards from hand
- Priority order: color-matching numbers > any numbers > action cards > wilds
- Returns null if no playable card

`botChooseColor(hand)`:
- Counts cards per color in remaining hand
- Returns the color the bot has most of (defaults to red if hand empty)

**Step 2: Commit**

```bash
git add js/bot.js
git commit -m "feat: add bot AI with strategic card selection"
```

---

### Task 7: Animations Module

**Files:**
- Modify: `js/animations.js`

**Step 1: Implement confetti animation**

`showConfetti()`:
- Gets confetti-container element, clears it
- Creates 80 div.confetti-piece elements with random: position (left %), color (from UNO palette), size (5-13px), shape (circle or square), animation duration (1.5-3.5s), delay (0-1.5s)
- Auto-cleans after 4 seconds

**Step 2: Commit**

```bash
git add js/animations.js
git commit -m "feat: add confetti celebration animation"
```

---

### Task 8: Main Game Loop (app.js)

**Files:**
- Modify: `js/app.js`

**Step 1: Wire up the complete game flow**

`init()`:
- Shows welcome screen
- Binds click handlers: play button, play-again button, draw pile, UNO button, color picker options

`startGame()`:
- Creates fresh game state
- Shows game table, renders initial state
- If first player is bot, schedules bot turn

`handleCardClick(card)`:
- Guards: not game over, is human's turn, no pending action
- If wild card: sets pendingAction to colorPick, shows color picker overlay
- Otherwise: calls playCard, checks UNO penalty (2 cards -> 1 without calling = draw 2), calls afterPlay

`handleColorChoice(color)`:
- Hides color picker, clears pendingAction
- Plays the wild card with chosen color
- Checks UNO penalty, calls afterPlay

`handleDrawPile()`:
- Guards same as handleCardClick
- Draws 1 card
- If drawn card is playable: re-renders (player can click it)
- If not playable: advances to next player, calls afterTurnEnd

`handleUnoCall()`:
- Adds human to unoCalledBy set
- Shows UNO popup animation
- Re-renders

`afterPlay()`:
- If game over: calls endGame
- Re-renders
- If next player is bot: schedules bot turn

`scheduleBotTurn()`:
- setTimeout with 800-1500ms random delay, then executeBotTurn

`executeBotTurn()`:
- Gets bot's chosen card via botChooseCard
- If card exists: chooses color if wild, shows UNO popup if going to 1 card, calls playCard
- If no card: draws 1, tries to play drawn card, otherwise passes
- Calls afterTurnEnd

`endGame()`:
- Shows end screen
- Win: gold "!כל הכבוד! ניצחת" message + confetti
- Lose: "!נסה שוב" message

**Step 2: Play-test the full game**

Open browser, play a full game. Verify: card playing, drawing, bot turns, specials, win/lose flow.

**Step 3: Commit**

```bash
git add js/app.js
git commit -m "feat: wire up complete game loop with turns, bots, and win/lose"
```

---

### Task 9: Bug Fixes & Edge Case Polish

**Files:**
- Modify: any file as needed based on play-testing

**Step 1: Play-test these specific scenarios**

1. Play a number card matching color
2. Play a number card matching value (different color)
3. Play a Wild — color picker appears, resumes correctly
4. Play a Wild Draw Four — color picker, next player draws 4, skipped
5. Play Skip — next player skipped
6. Play Reverse — direction changes (arrow updates)
7. Play Draw Two — next player draws 2, skipped
8. Click draw pile with no playable cards — draws 1, passes if can't play
9. Click draw pile when you have playable cards — allowed (player choice)
10. Bot turns fire after delay
11. Bot draws when no match
12. Game ends when any player empties hand
13. UNO button appears at 2 cards
14. Deck reshuffles when draw pile is exhausted
15. Direction indicator updates on Reverse
16. Play again button works (fresh game)

Fix any issues found.

**Step 2: Commit fixes**

```bash
git add -A
git commit -m "fix: address edge cases found during play-testing"
```

---

### Task 10: Visual Polish & Responsive Improvements

**Files:**
- Modify: `styles.css`
- Modify: `js/ui.js`

**Step 1: Improve card fan spacing for different hand sizes**

Update `renderPlayerHand` to dynamically calculate card spacing based on hand size AND viewport width. Cards should not overflow the screen at any reasonable hand size (up to ~15 cards).

**Step 2: Add bot left/right vertical card layout**

CSS: Bot hands on left and right should stack cards vertically with negative margins for overlap.

**Step 3: Responsive check**

Test at 1024x768, 1280x800, and 1920x1080. Adjust grid template sizes and card dimensions if needed.

**Step 4: Commit**

```bash
git add styles.css js/ui.js
git commit -m "style: improve responsive layout and card fan spacing"
```

---

### Task 11: Welcome Screen Polish

**Files:**
- Modify: `js/ui.js`
- Modify: `styles.css`

**Step 1: Add floating card decorations to welcome screen**

Create a `renderWelcomeDecorations()` function that adds 6-8 card-back elements at random positions on the welcome screen with slow floating/rotating CSS animations (different durations and delays per card for organic feel). Low opacity (0.3) so they don't distract from the play button.

**Step 2: Commit**

```bash
git add styles.css js/ui.js
git commit -m "style: add floating card decorations to welcome screen"
```

---

### Task 12: Final Integration Test & Deploy

**Files:**
- Modify: any remaining issues

**Step 1: Full play-through test**

Play 3 complete games:
1. A game you win
2. A game a bot wins
3. A game using all special card types (Skip, Reverse, Draw Two, Wild, Wild Draw Four)

Verify the full loop: welcome → play → game → end screen → play again.

**Step 2: Clean up stale files**

Remove old root-level `app.js` if it still exists.

**Step 3: Commit and push**

```bash
git add -A
git commit -m "feat: complete Hebrew UNO game with full gameplay, animations, and polish"
git push origin main
```

**Step 4: Verify deployment**

Check the GitHub Pages site — game should be live and fully playable.

---

## Task Dependency Order

```
Task 1 (scaffolding)
  -> Task 2 (deck logic)
    -> Task 3 (game state)
      -> Task 4 (CSS design)       [parallel with 5, 6, 7]
      -> Task 5 (UI rendering)     [parallel with 4, 6, 7]
      -> Task 6 (bot AI)           [parallel with 4, 5, 7]
      -> Task 7 (animations)       [parallel with 4, 5, 6]
        -> Task 8 (main game loop) [depends on ALL of 4-7]
          -> Task 9 (bug fixes)
            -> Task 10 (responsive polish)
              -> Task 11 (welcome polish)
                -> Task 12 (final test & deploy)
```

Tasks 4, 5, 6, 7 can be worked in parallel after Task 3 is done. Task 8 integrates everything.
