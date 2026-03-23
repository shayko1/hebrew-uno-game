import { getUid } from './firebase-config.js';
import { listenToRoom, writeMove, updatePresence, stopListening } from './online.js';
import { canPlayCard, getPlayableCards } from './state.js';

const DISCONNECT_TIMEOUT_MS = 30000;

let roomCode = null;
let myHand = [];
let hostHandCount = 0;
let gameState = null;
let disconnectTimer = null;
let callbacks = {};
let hostUid = null;
let hasDrawnThisTurn = false;

export function getGuestHand() {
  return myHand;
}

export function getGuestGameState() {
  return gameState;
}

export function getHostHandCount() {
  return hostHandCount;
}

export async function guestGame(code, onCallbacks) {
  roomCode = code;
  callbacks = onCallbacks || {};
  hasDrawnThisTurn = false;

  listenToRoom(code, {
    onUpdate: handleRoomUpdate,
    onDeleted: () => {
      cleanup();
      if (callbacks.onRoomDeleted) callbacks.onRoomDeleted();
    },
    onError: (err) => {
      if (callbacks.onError) callbacks.onError(err);
    }
  });
}

function handleRoomUpdate(data) {
  const uid = getUid();

  // Track host UID
  if (!hostUid && data.hostId) {
    hostUid = data.hostId;
  }

  // Track host presence
  if (hostUid) {
    const hostPlayer = data.players?.[hostUid];
    if (hostPlayer && !hostPlayer.connected) {
      startDisconnectTimer();
    } else if (hostPlayer && hostPlayer.connected) {
      clearDisconnectTimer();
      if (callbacks.onHostReconnected) callbacks.onHostReconnected();
    }
  }

  // Game state update from host
  if (data.guestHand) {
    myHand = data.guestHand;
  }

  if (typeof data.hostHandCount === 'number') {
    hostHandCount = data.hostHandCount;
  }

  if (data.gameState) {
    const isFirstState = !gameState;
    gameState = data.gameState;

    // Build a view for rendering
    const viewState = buildViewState(data);

    // Detect game start (first time we receive game state)
    if (isFirstState) {
      if (callbacks.onGameStart) callbacks.onGameStart(viewState);
    }

    if (data.gameState.gameOver) {
      if (callbacks.onGameEnd) callbacks.onGameEnd(viewState);
      return;
    }

    if (callbacks.onStateUpdate) callbacks.onStateUpdate(viewState);

    // Detect turn change
    if (gameState.currentPlayer === 1) {
      hasDrawnThisTurn = false;
      if (callbacks.onMyTurn) callbacks.onMyTurn(viewState);
    } else {
      if (callbacks.onOpponentTurn) callbacks.onOpponentTurn(viewState);
    }
  }
}

function buildViewState(data) {
  const gs = data.gameState;
  if (!gs) return null;

  // Build hands array: index 0 = host (we only know count), index 1 = guest (our hand)
  // For rendering: we flip the perspective so guest sees themselves at bottom
  const fakeHostHand = Array.from({ length: data.hostHandCount || 0 }, (_, i) => ({
    id: 'hidden-' + i,
    color: 'hidden',
    type: 'hidden',
    value: 'hidden'
  }));

  // Create a fake drawPile array so ui.js can read .length
  const drawPileCount = gs.drawPileCount || 0;
  const fakeDrawPile = new Array(drawPileCount);

  return {
    hands: [myHand, fakeHostHand],
    discardPile: gs.discardPile || [],
    drawPile: fakeDrawPile,
    drawPileCount,
    currentPlayer: gs.currentPlayer === 1 ? 0 : 1, // Flip perspective: guest is player 0 in their view
    direction: gs.direction,
    currentColor: gs.currentColor,
    gameOver: gs.gameOver,
    winner: gs.winner === 1 ? 0 : gs.winner === 0 ? 1 : gs.winner,
    numPlayers: 2,
    gameMode: 'online',
    isGuestView: true,
    realCurrentPlayer: gs.currentPlayer,
    realWinner: gs.winner,
    hasDrawnThisTurn,
    lastCardCalledBy: new Set()
  };
}

export async function guestPlayCard(cardId, chosenColor) {
  if (!gameState || gameState.gameOver) return false;
  if (gameState.currentPlayer !== 1) return false;

  const card = myHand.find((c) => c.id === cardId);
  if (!card) return false;

  // Local validation
  const topCard = gameState.discardPile[gameState.discardPile.length - 1];
  if (!canPlayCard(card, topCard, gameState.currentColor)) return false;

  await writeMove({
    type: 'play',
    cardId,
    chosenColor: chosenColor || null
  });

  hasDrawnThisTurn = false;
  return true;
}

export async function guestDrawCard() {
  if (!gameState || gameState.gameOver) return false;
  if (gameState.currentPlayer !== 1) return false;
  if (hasDrawnThisTurn) return false;

  hasDrawnThisTurn = true;

  await writeMove({
    type: 'draw'
  });

  return true;
}

export async function guestPassAfterDraw() {
  if (!gameState || gameState.gameOver) return;
  if (gameState.currentPlayer !== 1) return;

  hasDrawnThisTurn = false;

  await writeMove({
    type: 'pass'
  });
}

export async function guestCallLastCard() {
  await writeMove({
    type: 'lastCard'
  });
}

function startDisconnectTimer() {
  if (disconnectTimer) return;
  if (callbacks.onHostDisconnected) callbacks.onHostDisconnected();

  disconnectTimer = setTimeout(() => {
    disconnectTimer = null;
    // Host is gone — game can't continue without the authority
    if (callbacks.onHostAbandoned) callbacks.onHostAbandoned();
  }, DISCONNECT_TIMEOUT_MS);
}

function clearDisconnectTimer() {
  if (disconnectTimer) {
    clearTimeout(disconnectTimer);
    disconnectTimer = null;
  }
}

export function cleanup() {
  clearDisconnectTimer();
  stopListening();
  roomCode = null;
  myHand = [];
  hostHandCount = 0;
  gameState = null;
  hostUid = null;
  hasDrawnThisTurn = false;
  callbacks = {};
}
