// Bot AI logic

import { COLORS } from './constants.js';
import { canPlayCard } from './state.js';

/**
 * Bot selects a card to play from its hand.
 * Priority: color-matching numbers > any numbers > action cards > wilds (last resort).
 * Returns null if no playable card.
 *
 * @param {Array} hand - Bot's hand of cards
 * @param {object} topCard - Top card on discard pile
 * @param {string} currentColor - Currently active color
 * @returns {object|null} The card to play, or null
 */
export function botChooseCard(hand, topCard, currentColor) {
  const playable = hand.filter(card => canPlayCard(card, topCard, currentColor));

  if (playable.length === 0) {
    return null;
  }

  // Color-matching number cards
  const colorNumbers = playable.filter(
    card => card.type === 'number' && card.color === currentColor
  );
  if (colorNumbers.length > 0) {
    return colorNumbers[0];
  }

  // Any number cards
  const anyNumbers = playable.filter(card => card.type === 'number');
  if (anyNumbers.length > 0) {
    return anyNumbers[0];
  }

  // Action/special cards (non-wild)
  const actionCards = playable.filter(
    card => card.type === 'special' && card.color !== 'wild'
  );
  if (actionCards.length > 0) {
    return actionCards[0];
  }

  // Wilds (last resort)
  return playable[0];
}

/**
 * Bot chooses a color after playing a wild card.
 * Counts cards per color in hand (ignoring wilds) and picks the most frequent.
 * Defaults to 'red' if hand is empty or all wilds.
 *
 * @param {Array} hand - Bot's remaining hand after playing the wild
 * @returns {string} Chosen color
 */
export function botChooseColor(hand) {
  const counts = {};
  for (const color of COLORS) {
    counts[color] = 0;
  }

  for (const card of hand) {
    if (card.color !== 'wild') {
      counts[card.color]++;
    }
  }

  let bestColor = 'red';
  let bestCount = 0;

  for (const color of COLORS) {
    if (counts[color] > bestCount) {
      bestCount = counts[color];
      bestColor = color;
    }
  }

  return bestColor;
}
