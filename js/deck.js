import { COLORS, SPECIAL_TYPES } from './constants.js';

let nextId = 0;

function makeCard(color, type, value) {
  return { id: nextId++, color, type, value };
}

/**
 * Creates a standard 108-card deck.
 * - For each of 4 colors: one 0, two each of 1-9,
 *   two each of Skip, Reverse, Draw Two
 * - 4 Wilds and 4 Wild Draw Fours (color = 'wild')
 */
export function createDeck() {
  nextId = 0;
  const cards = [];

  for (const color of COLORS) {
    // One zero per color
    cards.push(makeCard(color, 'number', 0));

    // Two each of 1-9
    for (let n = 1; n <= 9; n++) {
      cards.push(makeCard(color, 'number', n));
      cards.push(makeCard(color, 'number', n));
    }

    // Two each of Skip, Reverse, Draw Two
    const specials = [SPECIAL_TYPES.SKIP, SPECIAL_TYPES.REVERSE, SPECIAL_TYPES.DRAW_TWO];
    for (const special of specials) {
      cards.push(makeCard(color, 'special', special));
      cards.push(makeCard(color, 'special', special));
    }
  }

  // 4 Wilds
  for (let i = 0; i < 4; i++) {
    cards.push(makeCard('wild', 'special', SPECIAL_TYPES.WILD));
  }

  // 4 Wild Draw Fours
  for (let i = 0; i < 4; i++) {
    cards.push(makeCard('wild', 'special', SPECIAL_TYPES.WILD_DRAW_FOUR));
  }

  return cards;
}

/**
 * Fisher-Yates shuffle. Returns a new shuffled array.
 */
export function shuffle(cards) {
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Deals cards round-robin to numPlayers players.
 * Returns { hands: array of arrays, remaining: leftover cards }.
 */
export function deal(deck, numPlayers, cardsPerPlayer = 7) {
  const hands = Array.from({ length: numPlayers }, () => []);
  let index = 0;

  for (let round = 0; round < cardsPerPlayer; round++) {
    for (let player = 0; player < numPlayers; player++) {
      if (index < deck.length) {
        hands[player].push(deck[index]);
        index++;
      }
    }
  }

  const remaining = deck.slice(index);
  return { hands, remaining };
}
