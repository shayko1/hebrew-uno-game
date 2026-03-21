/**
 * Game state persistence — save/load/clear snapshots to localStorage.
 * Handles Set serialization, pendingAction by cardId, schema versioning.
 */

const STORAGE_KEY = 'tsivoni_game_snapshot';
const PLAYER_COUNT_KEY = 'tsivoni_player_count';
const SCHEMA_VERSION = 1;

/**
 * Serialize game state to a JSON-safe snapshot.
 */
function serialize(state) {
  return {
    v: SCHEMA_VERSION,
    ts: Date.now(),
    hands: state.hands,
    drawPile: state.drawPile,
    discardPile: state.discardPile,
    numPlayers: state.numPlayers,
    currentPlayer: state.currentPlayer,
    direction: state.direction,
    currentColor: state.currentColor,
    gameOver: state.gameOver,
    winner: state.winner,
    lastCardCalledBy: [...state.lastCardCalledBy],
    pendingCardId: state.pendingAction ? state.pendingAction.card.id : null,
    hasDrawnThisTurn: state.hasDrawnThisTurn || false
  };
}

/**
 * Deserialize a snapshot back to a live game state.
 * Returns null if snapshot is invalid/corrupt.
 */
function deserialize(snapshot) {
  try {
    if (!snapshot || snapshot.v !== SCHEMA_VERSION) return null;
    if (!Array.isArray(snapshot.hands) || !Array.isArray(snapshot.drawPile) || !Array.isArray(snapshot.discardPile)) return null;
    if (typeof snapshot.currentPlayer !== 'number' || typeof snapshot.direction !== 'number') return null;
    if (!snapshot.currentColor || typeof snapshot.numPlayers !== 'number') return null;

    const state = {
      hands: snapshot.hands,
      drawPile: snapshot.drawPile,
      discardPile: snapshot.discardPile,
      numPlayers: snapshot.numPlayers,
      currentPlayer: snapshot.currentPlayer,
      direction: snapshot.direction,
      currentColor: snapshot.currentColor,
      gameOver: snapshot.gameOver || false,
      winner: snapshot.winner ?? null,
      lastCardCalledBy: new Set(snapshot.lastCardCalledBy || []),
      pendingAction: null,
      hasDrawnThisTurn: snapshot.hasDrawnThisTurn || false
    };

    // Reconstruct pendingAction if a wild card was pending
    if (snapshot.pendingCardId != null) {
      const card = state.hands[0]?.find(c => c.id === snapshot.pendingCardId);
      if (card) {
        state.pendingAction = { type: 'colorPick', card };
      }
    }

    // Validate hands array length matches numPlayers
    if (state.hands.length !== state.numPlayers) return null;

    // Validate discard pile has at least one card
    if (state.discardPile.length === 0) return null;

    return state;
  } catch {
    return null;
  }
}

/**
 * Save current game state to localStorage.
 */
export function saveSnapshot(state) {
  if (!state) return;
  try {
    const snapshot = serialize(state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Storage full or unavailable — silent fail
  }
}

/**
 * Load and restore game state from localStorage.
 * Returns null if no snapshot or invalid.
 */
export function loadSnapshot() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const snapshot = JSON.parse(raw);
    return deserialize(snapshot);
  } catch {
    clearSnapshot();
    return null;
  }
}

/**
 * Clear persisted game snapshot.
 */
export function clearSnapshot() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // silent
  }
}

/**
 * Save selected player count.
 */
export function savePlayerCount(count) {
  try {
    localStorage.setItem(PLAYER_COUNT_KEY, String(count));
  } catch {
    // silent
  }
}

/**
 * Load saved player count. Returns null if not set.
 */
export function loadPlayerCount() {
  try {
    const val = localStorage.getItem(PLAYER_COUNT_KEY);
    if (val == null) return null;
    const num = parseInt(val, 10);
    return (num >= 2 && num <= 4) ? num : null;
  } catch {
    return null;
  }
}
