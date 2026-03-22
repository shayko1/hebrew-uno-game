/**
 * Game state persistence — save/load/clear snapshots to localStorage.
 * Handles Set serialization, pendingAction by cardId, schema versioning.
 */

const STORAGE_KEY = 'tsivoni_game_snapshot';
const PLAYER_COUNT_KEY = 'tsivoni_player_count';
const GAME_MODE_KEY = 'tsivoni_game_mode';
const MATCH_MODE_KEY = 'tsivoni_match_mode';
const NICKNAME_KEY = 'tsivoni_nickname';
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
    hasDrawnThisTurn: state.hasDrawnThisTurn || false,
    gameMode: state.gameMode || 'local',
    matchMode: state.matchMode || 'single',
    targetScore: state.targetScore || 250,
    matchScores: Array.isArray(state.matchScores) ? state.matchScores : null,
    roundNumber: state.roundNumber || 1,
    roomCode: state.roomCode || null,
    nickname: state.nickname || ''
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
      hasDrawnThisTurn: snapshot.hasDrawnThisTurn || false,
      gameMode: snapshot.gameMode === 'online' ? 'online' : 'local',
      matchMode: snapshot.matchMode === 'points' ? 'points' : 'single',
      targetScore: (typeof snapshot.targetScore === 'number' && snapshot.targetScore > 0) ? snapshot.targetScore : 250,
      matchScores: null,
      roundNumber: (Number.isInteger(snapshot.roundNumber) && snapshot.roundNumber > 0) ? snapshot.roundNumber : 1,
      roomCode: typeof snapshot.roomCode === 'string' ? snapshot.roomCode : null,
      nickname: typeof snapshot.nickname === 'string' ? snapshot.nickname : ''
    };

    if (Array.isArray(snapshot.matchScores) && snapshot.matchScores.length === state.numPlayers) {
      state.matchScores = snapshot.matchScores.map(score => {
        if (typeof score !== 'number' || score < 0) return 0;
        return Math.floor(score);
      });
    } else {
      state.matchScores = Array(state.numPlayers).fill(0);
    }

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

/**
 * Save selected game mode.
 */
export function saveGameMode(mode) {
  try {
    if (mode !== 'local' && mode !== 'online') return;
    localStorage.setItem(GAME_MODE_KEY, mode);
  } catch {
    // silent
  }
}

/**
 * Load selected game mode.
 */
export function loadGameMode() {
  try {
    const mode = localStorage.getItem(GAME_MODE_KEY);
    if (mode === 'local' || mode === 'online') return mode;
    return null;
  } catch {
    return null;
  }
}

/**
 * Save selected match mode.
 */
export function saveMatchMode(mode) {
  try {
    if (mode !== 'single' && mode !== 'points') return;
    localStorage.setItem(MATCH_MODE_KEY, mode);
  } catch {
    // silent
  }
}

/**
 * Load selected match mode.
 */
export function loadMatchMode() {
  try {
    const mode = localStorage.getItem(MATCH_MODE_KEY);
    if (mode === 'single' || mode === 'points') return mode;
    return null;
  } catch {
    return null;
  }
}

/**
 * Save online nickname.
 */
export function saveNickname(nickname) {
  try {
    if (typeof nickname !== 'string') return;
    localStorage.setItem(NICKNAME_KEY, nickname.trim());
  } catch {
    // silent
  }
}

/**
 * Load online nickname.
 */
export function loadNickname() {
  try {
    const nickname = localStorage.getItem(NICKNAME_KEY);
    if (nickname == null) return '';
    return String(nickname).trim().slice(0, 20);
  } catch {
    return '';
  }
}
