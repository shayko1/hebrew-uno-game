import { describe, it, assert, assertEqual, showSummary } from './runner.js';
import { SPECIAL_TYPES } from '../js/constants.js';
import { botChooseCard, botChooseColor } from '../js/bot.js';

// ── Helper: build a card with a given id ────────────────────
let testCardId = 8000;
function card(color, type, value) {
  return { id: testCardId++, color, type, value };
}

// ── botChooseCard ───────────────────────────────────────────

describe('botChooseCard()', () => {
  const topCard = card('red', 'number', 5);
  const currentColor = 'red';

  it('returns null when no card is playable', () => {
    const hand = [
      card('blue', 'number', 3),
      card('green', 'number', 7),
      card('yellow', 'number', 1)
    ];
    const result = botChooseCard(hand, topCard, currentColor);
    assertEqual(result, null);
  });

  it('prefers color-matching number over other numbers', () => {
    const redNum = card('red', 'number', 2);
    const blueNum = card('blue', 'number', 5); // matches by value
    const hand = [blueNum, redNum];
    const result = botChooseCard(hand, topCard, currentColor);
    assertEqual(result.id, redNum.id, 'should pick color-matching number');
  });

  it('prefers any number over action cards', () => {
    const blueNum = card('blue', 'number', 5); // matches by value
    const redSkip = card('red', 'special', SPECIAL_TYPES.SKIP);
    const hand = [redSkip, blueNum];
    const result = botChooseCard(hand, topCard, currentColor);
    // blueNum matches by value (number 5), redSkip matches by color
    // redNum would be preferred, but only blueNum is a number matching by value
    // Since no color-matching numbers, it picks any number: blueNum
    // Wait, redSkip is color-matching. But priority is: color-matching numbers > any numbers > action cards
    // There are no color-matching numbers. Any numbers = blueNum. So blueNum wins.
    assertEqual(result.id, blueNum.id, 'should pick number over action card');
  });

  it('prefers action cards over wilds', () => {
    const redSkip = card('red', 'special', SPECIAL_TYPES.SKIP);
    const wildCard = card('wild', 'special', SPECIAL_TYPES.WILD);
    const hand = [wildCard, redSkip];
    const result = botChooseCard(hand, topCard, currentColor);
    assertEqual(result.id, redSkip.id, 'should pick action card over wild');
  });

  it('plays wild as last resort', () => {
    const wildCard = card('wild', 'special', SPECIAL_TYPES.WILD);
    const unplayable = card('blue', 'number', 3); // not playable on red 5
    const hand = [unplayable, wildCard];
    const result = botChooseCard(hand, topCard, currentColor);
    assertEqual(result.id, wildCard.id, 'should pick wild when nothing else plays');
  });

  it('prefers color-matching number over everything', () => {
    const redNum = card('red', 'number', 9);
    const redSkip = card('red', 'special', SPECIAL_TYPES.SKIP);
    const wildCard = card('wild', 'special', SPECIAL_TYPES.WILD);
    const hand = [wildCard, redSkip, redNum];
    const result = botChooseCard(hand, topCard, currentColor);
    assertEqual(result.id, redNum.id, 'should pick color-matching number first');
  });
});

// ── botChooseColor ──────────────────────────────────────────

describe('botChooseColor()', () => {
  it('picks the most frequent color in hand', () => {
    const hand = [
      card('blue', 'number', 1),
      card('blue', 'number', 3),
      card('blue', 'number', 7),
      card('red', 'number', 2),
      card('green', 'number', 4)
    ];
    assertEqual(botChooseColor(hand), 'blue');
  });

  it('defaults to red for empty hand', () => {
    assertEqual(botChooseColor([]), 'red');
  });

  it('defaults to red for all-wild hand', () => {
    const hand = [
      card('wild', 'special', SPECIAL_TYPES.WILD),
      card('wild', 'special', SPECIAL_TYPES.WILD_DRAW_FOUR)
    ];
    assertEqual(botChooseColor(hand), 'red');
  });

  it('red wins ties (COLORS order: red first)', () => {
    // One of each color: red is first in COLORS, so it wins ties
    const hand = [
      card('red', 'number', 1),
      card('blue', 'number', 2),
      card('green', 'number', 3),
      card('yellow', 'number', 4)
    ];
    assertEqual(botChooseColor(hand), 'red');
  });

  it('ignores wild cards when counting', () => {
    const hand = [
      card('wild', 'special', SPECIAL_TYPES.WILD),
      card('wild', 'special', SPECIAL_TYPES.WILD),
      card('green', 'number', 5)
    ];
    assertEqual(botChooseColor(hand), 'green');
  });
});

// ── Show summary (last test file loaded) ────────────────────
showSummary();
