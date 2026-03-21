import { describe, it, assert, assertEqual } from './runner.js';

// We test the serialize/deserialize logic by importing from persistence.js
// Since persistence.js uses localStorage, we test the round-trip manually here.

const STORAGE_KEY = 'tsivoni_game_snapshot';
const PLAYER_COUNT_KEY = 'tsivoni_player_count';

// ── Helper: build a card with a given id ────────────────────
let testCardId = 8000;
function card(color, type, value) {
  return { id: testCardId++, color, type, value };
}

function makeTestState() {
  return {
    hands: [
      [card('red', 'number', 3), card('blue', 'number', 5)],
      [card('green', 'number', 7)]
    ],
    drawPile: [card('yellow', 'number', 1), card('red', 'number', 9)],
    discardPile: [card('blue', 'number', 4)],
    numPlayers: 2,
    currentPlayer: 0,
    direction: 1,
    currentColor: 'blue',
    gameOver: false,
    winner: null,
    lastCardCalledBy: new Set([0]),
    pendingAction: null,
    hasDrawnThisTurn: false
  };
}

// ── Snapshot round-trip ─────────────────────────────────────
describe('Persistence — snapshot round-trip', () => {
  it('serializes and deserializes a full state', async () => {
    // Dynamic import to test the module
    const { saveSnapshot, loadSnapshot, clearSnapshot } = await import('../js/persistence.js');

    const original = makeTestState();
    saveSnapshot(original);
    const restored = loadSnapshot();

    assert(restored !== null, 'restored state should not be null');
    assertEqual(restored.numPlayers, 2);
    assertEqual(restored.currentPlayer, 0);
    assertEqual(restored.direction, 1);
    assertEqual(restored.currentColor, 'blue');
    assertEqual(restored.gameOver, false);
    assertEqual(restored.winner, null);
    assertEqual(restored.hasDrawnThisTurn, false);
    assertEqual(restored.hands.length, 2);
    assertEqual(restored.hands[0].length, 2);
    assertEqual(restored.hands[1].length, 1);
    assertEqual(restored.drawPile.length, 2);
    assertEqual(restored.discardPile.length, 1);

    // Set round-trip
    assert(restored.lastCardCalledBy instanceof Set, 'lastCardCalledBy should be a Set');
    assert(restored.lastCardCalledBy.has(0), 'lastCardCalledBy should contain 0');

    clearSnapshot();
  });

  it('returns null for missing snapshot', async () => {
    const { loadSnapshot, clearSnapshot } = await import('../js/persistence.js');
    clearSnapshot();
    const result = loadSnapshot();
    assertEqual(result, null);
  });

  it('returns null for corrupted snapshot', async () => {
    const { loadSnapshot } = await import('../js/persistence.js');
    localStorage.setItem(STORAGE_KEY, '{"v":1,"garbage":true}');
    const result = loadSnapshot();
    assertEqual(result, null);
  });

  it('returns null for wrong schema version', async () => {
    const { loadSnapshot } = await import('../js/persistence.js');
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      v: 999,
      hands: [], drawPile: [], discardPile: [{}],
      numPlayers: 2, currentPlayer: 0, direction: 1, currentColor: 'red'
    }));
    const result = loadSnapshot();
    assertEqual(result, null);
  });

  it('restores pendingAction from cardId', async () => {
    const { saveSnapshot, loadSnapshot, clearSnapshot } = await import('../js/persistence.js');

    const state = makeTestState();
    const wildCard = card('wild', 'special', 'wild');
    state.hands[0].push(wildCard);
    state.pendingAction = { type: 'colorPick', card: wildCard };

    saveSnapshot(state);
    const restored = loadSnapshot();

    assert(restored.pendingAction !== null, 'pendingAction should be restored');
    assertEqual(restored.pendingAction.type, 'colorPick');
    assertEqual(restored.pendingAction.card.id, wildCard.id);

    clearSnapshot();
  });
});

// ── Player count persistence ────────────────────────────────
describe('Persistence — player count', () => {
  it('saves and loads player count', async () => {
    const { savePlayerCount, loadPlayerCount } = await import('../js/persistence.js');

    savePlayerCount(2);
    assertEqual(loadPlayerCount(), 2);

    savePlayerCount(3);
    assertEqual(loadPlayerCount(), 3);

    savePlayerCount(4);
    assertEqual(loadPlayerCount(), 4);
  });

  it('rejects invalid player counts', async () => {
    const { loadPlayerCount } = await import('../js/persistence.js');

    localStorage.setItem(PLAYER_COUNT_KEY, '99');
    assertEqual(loadPlayerCount(), null);

    localStorage.setItem(PLAYER_COUNT_KEY, 'abc');
    assertEqual(loadPlayerCount(), null);
  });
});

// ── Draw-gate logic ─────────────────────────────────────────
describe('Draw-gate — one draw per turn', () => {
  it('hasDrawnThisTurn flag persists through snapshot', async () => {
    const { saveSnapshot, loadSnapshot, clearSnapshot } = await import('../js/persistence.js');

    const state = makeTestState();
    state.hasDrawnThisTurn = true;

    saveSnapshot(state);
    const restored = loadSnapshot();

    assertEqual(restored.hasDrawnThisTurn, true);

    clearSnapshot();
  });
});
