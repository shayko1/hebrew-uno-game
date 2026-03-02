import { describe, it, assert, assertEqual } from './runner.js';
import { createDeck, shuffle, deal } from '../js/deck.js';
import { COLORS } from '../js/constants.js';

// ── createDeck ──────────────────────────────────────────────

describe('createDeck()', () => {
  const deck = createDeck();

  it('returns exactly 108 cards', () => {
    assertEqual(deck.length, 108);
  });

  it('has 76 number cards', () => {
    const numbers = deck.filter(c => c.type === 'number');
    assertEqual(numbers.length, 76);
  });

  it('has 24 colored special cards', () => {
    const specials = deck.filter(c => c.type === 'special' && c.color !== 'wild');
    assertEqual(specials.length, 24);
  });

  it('has 8 wild cards', () => {
    const wilds = deck.filter(c => c.color === 'wild');
    assertEqual(wilds.length, 8);
  });

  it('has one 0 per color', () => {
    for (const color of COLORS) {
      const zeros = deck.filter(c => c.type === 'number' && c.color === color && c.value === 0);
      assertEqual(zeros.length, 1, color + ' should have 1 zero');
    }
  });

  it('has two of each 1-9 per color', () => {
    for (const color of COLORS) {
      for (let n = 1; n <= 9; n++) {
        const matches = deck.filter(c => c.type === 'number' && c.color === color && c.value === n);
        assertEqual(matches.length, 2, color + ' ' + n + ' should have 2');
      }
    }
  });

  it('has 2 Skip, 2 Reverse, 2 Draw Two per color', () => {
    for (const color of COLORS) {
      for (const special of ['skip', 'reverse', 'draw_two']) {
        const matches = deck.filter(c => c.type === 'special' && c.color === color && c.value === special);
        assertEqual(matches.length, 2, color + ' ' + special + ' should have 2');
      }
    }
  });

  it('has 4 Wild and 4 Wild Draw Four', () => {
    const wilds = deck.filter(c => c.color === 'wild' && c.value === 'wild');
    assertEqual(wilds.length, 4, '4 Wild');
    const wd4 = deck.filter(c => c.color === 'wild' && c.value === 'wild_draw_four');
    assertEqual(wd4.length, 4, '4 Wild Draw Four');
  });

  it('every card has a unique id', () => {
    const ids = new Set(deck.map(c => c.id));
    assertEqual(ids.size, deck.length);
  });
});

// ── shuffle ─────────────────────────────────────────────────

describe('shuffle()', () => {
  it('returns a new array (not the same reference)', () => {
    const deck = createDeck();
    const shuffled = shuffle(deck);
    assert(shuffled !== deck, 'should be a different array reference');
  });

  it('returns the same cards (same ids)', () => {
    const deck = createDeck();
    const shuffled = shuffle(deck);
    assertEqual(shuffled.length, deck.length);

    const originalIds = deck.map(c => c.id).sort((a, b) => a - b);
    const shuffledIds = shuffled.map(c => c.id).sort((a, b) => a - b);
    for (let i = 0; i < originalIds.length; i++) {
      assertEqual(shuffledIds[i], originalIds[i]);
    }
  });

  it('changes order (at least one card moved)', () => {
    const deck = createDeck();
    const shuffled = shuffle(deck);
    let different = false;
    for (let i = 0; i < deck.length; i++) {
      if (shuffled[i].id !== deck[i].id) {
        different = true;
        break;
      }
    }
    assert(different, 'shuffled order should differ from original');
  });
});

// ── deal ────────────────────────────────────────────────────

describe('deal()', () => {
  it('deals 7 cards to each of 2 players', () => {
    const deck = shuffle(createDeck());
    const { hands, remaining } = deal(deck, 2, 7);
    assertEqual(hands.length, 2);
    assertEqual(hands[0].length, 7);
    assertEqual(hands[1].length, 7);
    assertEqual(remaining.length, 108 - 14);
  });

  it('deals 7 cards to each of 3 players', () => {
    const deck = shuffle(createDeck());
    const { hands, remaining } = deal(deck, 3, 7);
    assertEqual(hands.length, 3);
    for (let i = 0; i < 3; i++) {
      assertEqual(hands[i].length, 7, 'player ' + i + ' should have 7');
    }
    assertEqual(remaining.length, 108 - 21);
  });

  it('deals 7 cards to each of 4 players', () => {
    const deck = shuffle(createDeck());
    const { hands, remaining } = deal(deck, 4, 7);
    assertEqual(hands.length, 4);
    for (let i = 0; i < 4; i++) {
      assertEqual(hands[i].length, 7, 'player ' + i + ' should have 7');
    }
    assertEqual(remaining.length, 108 - 28);
  });
});
