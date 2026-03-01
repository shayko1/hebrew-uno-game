import { SPECIAL_TYPES } from './constants.js';
import { createDeck, shuffle, deal } from './deck.js';

/**
 * Creates and returns the initial game state.
 * - Shuffled deck, 4 hands of 7 cards each
 * - First number card from remaining pile becomes starting discard
 * - Non-number cards encountered are placed back and pile is re-scanned
 */
export function createGameState() {
  const deck = shuffle(createDeck());
  const { hands, remaining } = deal(deck, 4, 7);

  // Find first number card in remaining pile for starting discard
  let startIndex = -1;
  for (let i = 0; i < remaining.length; i++) {
    if (remaining[i].type === 'number') {
      startIndex = i;
      break;
    }
  }

  let drawPile;
  let discardPile;

  if (startIndex !== -1) {
    const startCard = remaining[startIndex];
    // Remove the start card from the remaining pile
    drawPile = [...remaining.slice(0, startIndex), ...remaining.slice(startIndex + 1)];
    discardPile = [startCard];
  } else {
    // Extremely unlikely: no number cards in remaining pile
    // Just use the first card
    discardPile = [remaining[0]];
    drawPile = remaining.slice(1);
  }

  return {
    hands,
    drawPile,
    discardPile,
    currentPlayer: 0,
    direction: 1,
    currentColor: discardPile[0].color,
    gameOver: false,
    winner: null,
    unoCalledBy: new Set(),
    pendingAction: null
  };
}

/**
 * Returns the top card of the discard pile.
 */
export function getTopCard(state) {
  return state.discardPile[state.discardPile.length - 1];
}

/**
 * Checks if a card can be played on the current top card given the active color.
 * - Wild cards are always playable
 * - Match by color (card.color === currentColor)
 * - Match by number value (both number type, same value)
 * - Match by special type (both special type, same value)
 */
export function canPlayCard(card, topCard, currentColor) {
  // Wild cards are always playable
  if (card.color === 'wild') {
    return true;
  }

  // Match by color
  if (card.color === currentColor) {
    return true;
  }

  // Match by value (number-to-number)
  if (card.type === 'number' && topCard.type === 'number' && card.value === topCard.value) {
    return true;
  }

  // Match by special type (special-to-special with same value)
  if (card.type === 'special' && topCard.type === 'special' && card.value === topCard.value) {
    return true;
  }

  return false;
}

/**
 * Returns all playable cards from a hand.
 */
export function getPlayableCards(hand, topCard, currentColor) {
  return hand.filter(card => canPlayCard(card, topCard, currentColor));
}

/**
 * Calculates the next player index, wrapping around 0-3.
 */
export function nextPlayerIndex(current, direction) {
  return ((current + direction) % 4 + 4) % 4;
}

/**
 * Draws cards from the draw pile into a player's hand.
 * If the draw pile is empty, reshuffles the discard pile (keeping top card)
 * into the draw pile.
 * Returns the array of drawn cards.
 */
export function drawCards(state, playerIndex, count) {
  const drawn = [];

  for (let i = 0; i < count; i++) {
    // If draw pile is empty, reshuffle discard pile (keep top card)
    if (state.drawPile.length === 0) {
      if (state.discardPile.length <= 1) {
        // No cards to reshuffle; stop drawing
        break;
      }
      const topCard = state.discardPile.pop();
      state.drawPile = shuffle(state.discardPile);
      state.discardPile = [topCard];
    }

    const card = state.drawPile.pop();
    if (card) {
      state.hands[playerIndex].push(card);
      drawn.push(card);
    }
  }

  return drawn;
}

/**
 * Plays a card from a player's hand.
 * - Validates the card is in the hand and is playable
 * - Removes from hand, adds to discard pile
 * - Updates currentColor (chosenColor for wilds, card.color otherwise)
 * - Checks win condition (empty hand)
 * - Handles special card effects (skip, reverse, draw two, wild draw four)
 * - Advances currentPlayer
 * Returns true on success, false if invalid play.
 */
export function playCard(state, playerIndex, cardId, chosenColor) {
  const hand = state.hands[playerIndex];
  const cardIndex = hand.findIndex(c => c.id === cardId);

  if (cardIndex === -1) {
    return false;
  }

  const card = hand[cardIndex];
  const topCard = getTopCard(state);

  if (!canPlayCard(card, topCard, state.currentColor)) {
    return false;
  }

  // Remove card from hand and add to discard pile
  hand.splice(cardIndex, 1);
  state.discardPile.push(card);

  // Update current color
  if (card.color === 'wild') {
    state.currentColor = chosenColor || 'red';
  } else {
    state.currentColor = card.color;
  }

  // Check win condition
  if (hand.length === 0) {
    state.gameOver = true;
    state.winner = playerIndex;
    return true;
  }

  // Handle special card effects
  if (card.type === 'special') {
    switch (card.value) {
      case SPECIAL_TYPES.SKIP:
        // Skip next player: advance twice
        state.currentPlayer = nextPlayerIndex(playerIndex, state.direction);
        state.currentPlayer = nextPlayerIndex(state.currentPlayer, state.direction);
        return true;

      case SPECIAL_TYPES.REVERSE:
        // Flip direction
        state.direction *= -1;
        state.currentPlayer = nextPlayerIndex(playerIndex, state.direction);
        return true;

      case SPECIAL_TYPES.DRAW_TWO: {
        // Next player draws 2 and is skipped
        const nextPlayer = nextPlayerIndex(playerIndex, state.direction);
        drawCards(state, nextPlayer, 2);
        state.currentPlayer = nextPlayerIndex(nextPlayer, state.direction);
        return true;
      }

      case SPECIAL_TYPES.WILD_DRAW_FOUR: {
        // Next player draws 4 and is skipped
        const nextPlayer = nextPlayerIndex(playerIndex, state.direction);
        drawCards(state, nextPlayer, 4);
        state.currentPlayer = nextPlayerIndex(nextPlayer, state.direction);
        return true;
      }

      default:
        break;
    }
  }

  // Normal card: advance to next player
  state.currentPlayer = nextPlayerIndex(playerIndex, state.direction);
  return true;
}
