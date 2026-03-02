import { describe, it, assert, assertEqual } from './runner.js';
import { COLORS, SPECIAL_TYPES } from '../js/constants.js';
import { createDeck, shuffle } from '../js/deck.js';
import {
  createGameState,
  canPlayCard,
  getTopCard,
  getPlayableCards,
  nextPlayerIndex,
  playCard,
  drawCards
} from '../js/state.js';

// ── Helper: build a card with a given id ────────────────────
let testCardId = 9000;
function card(color, type, value) {
  return { id: testCardId++, color, type, value };
}

// ── createGameState ─────────────────────────────────────────

describe('createGameState()', () => {
  it('deals 7 cards per player (4 players default)', () => {
    const state = createGameState(4);
    assertEqual(state.hands.length, 4);
    for (let i = 0; i < 4; i++) {
      assertEqual(state.hands[i].length, 7, 'player ' + i + ' should have 7');
    }
  });

  it('deals 7 cards per player (2 players)', () => {
    const state = createGameState(2);
    assertEqual(state.hands.length, 2);
    for (let i = 0; i < 2; i++) {
      assertEqual(state.hands[i].length, 7, 'player ' + i + ' should have 7');
    }
  });

  it('starts discard pile with a number card', () => {
    const state = createGameState(4);
    const top = getTopCard(state);
    assertEqual(top.type, 'number', 'starting card should be a number');
  });

  it('has correct initial state values', () => {
    const state = createGameState(4);
    assertEqual(state.currentPlayer, 0);
    assertEqual(state.direction, 1);
    assertEqual(state.gameOver, false);
    assertEqual(state.winner, null);
    assertEqual(state.numPlayers, 4);
    assert(COLORS.includes(state.currentColor), 'currentColor should be a valid color');
    assert(state.drawPile.length > 0, 'draw pile should not be empty');
    assertEqual(state.discardPile.length, 1, 'discard pile should have 1 card');
  });

  it('total card count is preserved (108)', () => {
    const state = createGameState(4);
    const handCards = state.hands.reduce((sum, h) => sum + h.length, 0);
    const total = handCards + state.drawPile.length + state.discardPile.length;
    assertEqual(total, 108);
  });
});

// ── canPlayCard ─────────────────────────────────────────────

describe('canPlayCard()', () => {
  const topCard = card('red', 'number', 5);

  it('matches by color', () => {
    const c = card('red', 'number', 3);
    assert(canPlayCard(c, topCard, 'red'), 'red card should match red top');
  });

  it('matches by number', () => {
    const c = card('blue', 'number', 5);
    assert(canPlayCard(c, topCard, 'red'), 'blue 5 should match red 5');
  });

  it('matches by special type', () => {
    const topSkip = card('red', 'special', SPECIAL_TYPES.SKIP);
    const playSkip = card('blue', 'special', SPECIAL_TYPES.SKIP);
    assert(canPlayCard(playSkip, topSkip, 'red'), 'skip should match skip');
  });

  it('wild is always playable', () => {
    const w = card('wild', 'special', SPECIAL_TYPES.WILD);
    assert(canPlayCard(w, topCard, 'red'), 'wild should be playable');
  });

  it('wild draw four is always playable', () => {
    const wd4 = card('wild', 'special', SPECIAL_TYPES.WILD_DRAW_FOUR);
    assert(canPlayCard(wd4, topCard, 'red'), 'wild draw four should be playable');
  });

  it('rejects non-matching card', () => {
    const c = card('blue', 'number', 3);
    assert(!canPlayCard(c, topCard, 'red'), 'blue 3 should not match red 5');
  });

  it('rejects non-matching special types', () => {
    const topSkip = card('red', 'special', SPECIAL_TYPES.SKIP);
    const playReverse = card('blue', 'special', SPECIAL_TYPES.REVERSE);
    assert(!canPlayCard(playReverse, topSkip, 'red'), 'blue reverse should not match red skip');
  });

  it('matches color even if top is special', () => {
    const topSkip = card('red', 'special', SPECIAL_TYPES.SKIP);
    const c = card('red', 'number', 7);
    assert(canPlayCard(c, topSkip, 'red'), 'red number should match red skip by color');
  });
});

// ── nextPlayerIndex ─────────────────────────────────────────

describe('nextPlayerIndex()', () => {
  it('advances forward in 4-player game', () => {
    assertEqual(nextPlayerIndex(0, 1, 4), 1);
    assertEqual(nextPlayerIndex(1, 1, 4), 2);
    assertEqual(nextPlayerIndex(2, 1, 4), 3);
  });

  it('wraps around forward in 4-player game', () => {
    assertEqual(nextPlayerIndex(3, 1, 4), 0);
  });

  it('goes backward in 4-player game', () => {
    assertEqual(nextPlayerIndex(0, -1, 4), 3);
    assertEqual(nextPlayerIndex(3, -1, 4), 2);
  });

  it('wraps forward in 2-player game', () => {
    assertEqual(nextPlayerIndex(0, 1, 2), 1);
    assertEqual(nextPlayerIndex(1, 1, 2), 0);
  });

  it('wraps backward in 2-player game', () => {
    assertEqual(nextPlayerIndex(0, -1, 2), 1);
    assertEqual(nextPlayerIndex(1, -1, 2), 0);
  });

  it('wraps forward in 3-player game', () => {
    assertEqual(nextPlayerIndex(2, 1, 3), 0);
  });

  it('wraps backward in 3-player game', () => {
    assertEqual(nextPlayerIndex(0, -1, 3), 2);
  });
});

// ── playCard: number cards ──────────────────────────────────

describe('playCard() — number cards', () => {
  it('removes card from hand and adds to discard', () => {
    const state = createGameState(4);
    const top = getTopCard(state);
    const hand = state.hands[0];
    const playable = hand.find(c => canPlayCard(c, top, state.currentColor));
    if (!playable) return; // guard: random deal may have no playable

    const handSizeBefore = hand.length;
    const discardSizeBefore = state.discardPile.length;
    const result = playCard(state, 0, playable.id, playable.color === 'wild' ? 'red' : undefined);

    assert(result, 'playCard should return true');
    // hand may be less by 1 (unless game over detection already happened)
    assert(hand.length <= handSizeBefore, 'hand should not grow');
    assert(state.discardPile.length > discardSizeBefore, 'discard should grow');
  });

  it('advances to next player after playing a number card', () => {
    const state = createGameState(4);
    state.currentPlayer = 0;
    state.direction = 1;
    // Inject a known number card into hand[0]
    const numCard = card('red', 'number', 7);
    state.hands[0].push(numCard);
    // Set discard to red so the card is playable
    state.discardPile.push(card('red', 'number', 3));
    state.currentColor = 'red';

    playCard(state, 0, numCard.id);
    assertEqual(state.currentPlayer, 1, 'should advance to player 1');
  });

  it('returns false for unplayable card', () => {
    const state = createGameState(4);
    state.currentColor = 'red';
    state.discardPile.push(card('red', 'number', 5));

    const unplayable = card('blue', 'number', 3);
    state.hands[0].push(unplayable);

    const result = playCard(state, 0, unplayable.id);
    assertEqual(result, false);
  });

  it('returns false for card not in hand', () => {
    const state = createGameState(4);
    const result = playCard(state, 0, 99999);
    assertEqual(result, false);
  });
});

// ── playCard: Skip ──────────────────────────────────────────

describe('playCard() — Skip', () => {
  it('skips the next player', () => {
    const state = createGameState(4);
    state.currentPlayer = 0;
    state.direction = 1;
    state.currentColor = 'red';
    state.discardPile.push(card('red', 'number', 1));

    const skipCard = card('red', 'special', SPECIAL_TYPES.SKIP);
    state.hands[0].push(skipCard);

    playCard(state, 0, skipCard.id);
    // Player 1 is skipped, so current should be player 2
    assertEqual(state.currentPlayer, 2, 'should skip to player 2');
  });
});

// ── playCard: Reverse ───────────────────────────────────────

describe('playCard() — Reverse', () => {
  it('reverses direction in 4-player game', () => {
    const state = createGameState(4);
    state.currentPlayer = 0;
    state.direction = 1;
    state.currentColor = 'green';
    state.discardPile.push(card('green', 'number', 1));

    const revCard = card('green', 'special', SPECIAL_TYPES.REVERSE);
    state.hands[0].push(revCard);

    playCard(state, 0, revCard.id);
    assertEqual(state.direction, -1, 'direction should be reversed');
    // After reverse from player 0 with direction -1, next is player 3
    assertEqual(state.currentPlayer, 3, 'should go to player 3');
  });

  it('acts as skip in 2-player game', () => {
    const state = createGameState(2);
    state.currentPlayer = 0;
    state.direction = 1;
    state.currentColor = 'blue';
    state.discardPile.push(card('blue', 'number', 1));

    const revCard = card('blue', 'special', SPECIAL_TYPES.REVERSE);
    state.hands[0].push(revCard);

    playCard(state, 0, revCard.id);
    assertEqual(state.direction, -1, 'direction should reverse');
    // In 2p, reverse acts like skip: current player stays 0
    assertEqual(state.currentPlayer, 0, 'should stay on player 0 (skip behavior)');
  });
});

// ── playCard: Draw Two ──────────────────────────────────────

describe('playCard() — Draw Two', () => {
  it('next player draws 2 and gets skipped', () => {
    const state = createGameState(4);
    state.currentPlayer = 0;
    state.direction = 1;
    state.currentColor = 'yellow';
    state.discardPile.push(card('yellow', 'number', 1));

    const dt = card('yellow', 'special', SPECIAL_TYPES.DRAW_TWO);
    state.hands[0].push(dt);

    const player1HandBefore = state.hands[1].length;
    playCard(state, 0, dt.id);

    assertEqual(state.hands[1].length, player1HandBefore + 2, 'player 1 should draw 2 cards');
    // Player 1 is skipped, so current should be player 2
    assertEqual(state.currentPlayer, 2, 'should skip to player 2');
  });
});

// ── playCard: Wild Draw Four ────────────────────────────────

describe('playCard() — Wild Draw Four', () => {
  it('next player draws 4, is skipped, and color changes', () => {
    const state = createGameState(4);
    state.currentPlayer = 0;
    state.direction = 1;
    state.currentColor = 'red';
    state.discardPile.push(card('red', 'number', 1));

    const wd4 = card('wild', 'special', SPECIAL_TYPES.WILD_DRAW_FOUR);
    state.hands[0].push(wd4);

    const player1HandBefore = state.hands[1].length;
    playCard(state, 0, wd4.id, 'green');

    assertEqual(state.hands[1].length, player1HandBefore + 4, 'player 1 should draw 4');
    assertEqual(state.currentPlayer, 2, 'should skip to player 2');
    assertEqual(state.currentColor, 'green', 'color should change to green');
  });
});

// ── playCard: Wild ──────────────────────────────────────────

describe('playCard() — Wild', () => {
  it('changes the current color', () => {
    const state = createGameState(4);
    state.currentPlayer = 0;
    state.direction = 1;
    state.currentColor = 'red';
    state.discardPile.push(card('red', 'number', 1));

    const w = card('wild', 'special', SPECIAL_TYPES.WILD);
    state.hands[0].push(w);

    playCard(state, 0, w.id, 'blue');
    assertEqual(state.currentColor, 'blue', 'color should change to blue');
    assertEqual(state.currentPlayer, 1, 'should advance to player 1');
  });

  it('defaults to red if no color chosen', () => {
    const state = createGameState(4);
    state.currentPlayer = 0;
    state.direction = 1;
    state.currentColor = 'green';
    state.discardPile.push(card('green', 'number', 1));

    const w = card('wild', 'special', SPECIAL_TYPES.WILD);
    state.hands[0].push(w);

    playCard(state, 0, w.id);
    assertEqual(state.currentColor, 'red', 'should default to red');
  });
});

// ── playCard: game over ─────────────────────────────────────

describe('playCard() — game over', () => {
  it('detects empty hand as game over', () => {
    const state = createGameState(4);
    state.currentPlayer = 0;
    state.direction = 1;
    state.currentColor = 'red';
    state.discardPile.push(card('red', 'number', 1));

    // Give player 0 exactly one playable card
    const lastCard = card('red', 'number', 9);
    state.hands[0] = [lastCard];

    playCard(state, 0, lastCard.id);
    assertEqual(state.gameOver, true, 'game should be over');
    assertEqual(state.winner, 0, 'player 0 should be the winner');
  });
});

// ── drawCards ────────────────────────────────────────────────

describe('drawCards()', () => {
  it('draws cards from the pile into player hand', () => {
    const state = createGameState(4);
    const handBefore = state.hands[0].length;
    const pileBefore = state.drawPile.length;

    const drawn = drawCards(state, 0, 3);
    assertEqual(drawn.length, 3);
    assertEqual(state.hands[0].length, handBefore + 3);
    assertEqual(state.drawPile.length, pileBefore - 3);
  });

  it('reshuffles discard pile when draw pile is empty', () => {
    const state = createGameState(4);
    // Artificially empty the draw pile
    const topDiscard = getTopCard(state);
    // Move all draw pile cards to discard (keep top)
    while (state.drawPile.length > 0) {
      state.discardPile.push(state.drawPile.pop());
    }
    // Now draw pile is empty, discard has many cards
    const discardBefore = state.discardPile.length;

    const drawn = drawCards(state, 0, 2);
    assertEqual(drawn.length, 2, 'should draw 2 cards');
    assert(state.drawPile.length > 0 || state.discardPile.length <= 1,
      'draw pile should be replenished or discard exhausted');
  });

  it('stops when both piles are empty', () => {
    const state = createGameState(4);
    // Empty both piles: keep only 1 card in discard
    state.drawPile = [];
    const topCard = state.discardPile[state.discardPile.length - 1];
    state.discardPile = [topCard];

    const drawn = drawCards(state, 0, 5);
    assertEqual(drawn.length, 0, 'should draw 0 when both piles exhausted');
  });
});
