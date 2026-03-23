import { createGameState, playCard, drawCards, getTopCard, getPlayableCards, nextPlayerIndex } from './state.js';
import { botChooseCard, botChooseColor } from './bot.js';
import { PLAYER_NAMES, SPECIAL_TYPES } from './constants.js';
import { getUid } from './firebase-config.js';
import { listenToRoom, updateGameState, setRoomStatus, stopListening, getRoomRef, isPlayerStale } from './online.js';
import { updateDoc } from 'https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js';

const DISCONNECT_TIMEOUT_MS = 30000;
const BOT_TURN_DELAY_MS = 1000;

let state = null;
let roomCode = null;
let guestUid = null;
let disconnectTimer = null;
let botTurnTimer = null;
let lastMoveIndex = 0;
let guestReplacedByBot = false;
let callbacks = {};

export function getHostState() {
  return state;
}

export function isGuestBot() {
  return guestReplacedByBot;
}

export async function hostGame(code, numPlayers, matchMode, nickname, onCallbacks) {
  roomCode = code;
  callbacks = onCallbacks || {};
  lastMoveIndex = 0;
  guestReplacedByBot = false;

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

  // Detect guest joining
  const players = data.players || {};
  const playerUids = Object.keys(players);
  const otherUid = playerUids.find((id) => id !== uid);

  if (otherUid && !guestUid && data.status === 'playing') {
    guestUid = otherUid;
    const guestNickname = players[otherUid].nickname || 'guest';
    if (callbacks.onGuestJoined) callbacks.onGuestJoined(guestNickname);
    startGame(data);
  }

  // Track guest presence via heartbeat stale check
  if (guestUid && !guestReplacedByBot) {
    const guestPlayer = players[guestUid];
    if (isPlayerStale(guestPlayer)) {
      startDisconnectTimer();
    } else {
      clearDisconnectTimer();
      if (callbacks.onGuestReconnected) callbacks.onGuestReconnected();
    }
  }

  // Process guest moves — read from processedMoveIndex onward
  if (state && data.moves) {
    const processed = data.processedMoveIndex || 0;
    const newMoves = data.moves.slice(processed);
    if (newMoves.length > 0) {
      lastMoveIndex = data.moves.length;
      for (const move of newMoves) {
        if (move.playerId !== guestUid) continue;
        processGuestMove(move);
      }
    }
  }
}

async function startGame(data) {
  state = createGameState(2, {
    gameMode: 'online',
    matchMode: data.matchMode || 'single',
    targetScore: data.targetScore || 250,
    roomCode: roomCode,
    nickname: data.players[getUid()]?.nickname || ''
  });

  // Sync initial state to Firebase
  await syncState();

  if (callbacks.onGameStart) callbacks.onGameStart(state);

  // If bot/host goes first, proceed
  if (state.currentPlayer === 0) {
    if (callbacks.onMyTurn) callbacks.onMyTurn(state);
  }
}

async function processGuestMove(move) {
  if (!state || state.gameOver) return;
  if (state.currentPlayer !== 1) return; // Not guest's turn

  if (move.type === 'play') {
    const hand = state.hands[1];
    const card = hand.find((c) => c.id === move.cardId);
    if (!card) return; // Invalid card

    const success = playCard(state, 1, move.cardId, move.chosenColor || null);
    if (!success) return; // Invalid play

    // Last card penalty for guest
    if (state.hands[1].length === 1 && !state.lastCardCalledBy.has(1)) {
      drawCards(state, 1, 2);
    }
    state.lastCardCalledBy.delete(1);

    await syncState();

    if (state.gameOver) {
      endGame();
      return;
    }

    advanceTurn();
  } else if (move.type === 'draw') {
    const drawn = drawCards(state, 1, 1);

    if (drawn.length > 0) {
      const drawnCard = drawn[0];
      const topCard = getTopCard(state);
      const playable = getPlayableCards([drawnCard], topCard, state.currentColor);

      if (playable.length === 0) {
        // Can't play drawn card, advance turn
        state.currentPlayer = nextPlayerIndex(state.currentPlayer, state.direction, state.numPlayers);
      }
      // If playable, guest keeps their turn to play the drawn card
    } else {
      state.currentPlayer = nextPlayerIndex(state.currentPlayer, state.direction, state.numPlayers);
    }

    await syncState();
    advanceTurn();
  } else if (move.type === 'pass') {
    // Guest passes after drawing a playable card
    state.currentPlayer = nextPlayerIndex(state.currentPlayer, state.direction, state.numPlayers);
    await syncState();
    advanceTurn();
  } else if (move.type === 'lastCard') {
    state.lastCardCalledBy.add(1);
  }
}

function advanceTurn() {
  if (state.gameOver) {
    endGame();
    return;
  }

  if (state.currentPlayer === 0) {
    // Host's turn
    if (callbacks.onMyTurn) callbacks.onMyTurn(state);
  } else if (state.currentPlayer === 1) {
    if (guestReplacedByBot) {
      scheduleBotTurn();
    } else {
      // Guest's turn — wait for their move via Firebase
      if (callbacks.onOpponentTurn) callbacks.onOpponentTurn(state);
    }
  }
}

function scheduleBotTurn() {
  clearBotTimer();
  botTurnTimer = setTimeout(() => {
    botTurnTimer = null;
    executeBotTurn();
  }, BOT_TURN_DELAY_MS);
}

async function executeBotTurn() {
  if (!state || state.gameOver) return;
  if (state.currentPlayer !== 1) return;

  const hand = state.hands[1];
  const topCard = getTopCard(state);
  const card = botChooseCard(hand, topCard, state.currentColor);

  if (card) {
    let chosenColor = null;
    if (card.color === 'wild') {
      chosenColor = botChooseColor(hand);
    }
    playCard(state, 1, card.id, chosenColor);
  } else {
    const drawn = drawCards(state, 1, 1);
    if (drawn.length > 0) {
      const drawnCard = drawn[0];
      const currentTop = getTopCard(state);
      const playable = getPlayableCards([drawnCard], currentTop, state.currentColor);
      if (playable.length > 0) {
        let color = null;
        if (drawnCard.color === 'wild') {
          color = botChooseColor(state.hands[1]);
        }
        playCard(state, 1, drawnCard.id, color);
      } else {
        state.currentPlayer = nextPlayerIndex(state.currentPlayer, state.direction, state.numPlayers);
      }
    } else {
      state.currentPlayer = nextPlayerIndex(state.currentPlayer, state.direction, state.numPlayers);
    }
  }

  await syncState();
  advanceTurn();
}

export async function hostPlayCard(cardId, chosenColor) {
  if (!state || state.gameOver) return false;
  if (state.currentPlayer !== 0) return false;

  const success = playCard(state, 0, cardId, chosenColor);
  if (!success) return false;

  // Last card penalty for host
  if (state.hands[0].length === 1 && !state.lastCardCalledBy.has(0)) {
    drawCards(state, 0, 2);
  }
  state.lastCardCalledBy.delete(0);

  await syncState();

  if (state.gameOver) {
    endGame();
    return true;
  }

  advanceTurn();
  return true;
}

export async function hostDrawCard() {
  if (!state || state.gameOver) return null;
  if (state.currentPlayer !== 0) return null;

  const drawn = drawCards(state, 0, 1);
  if (drawn.length === 0) return null;

  const drawnCard = drawn[0];
  const topCard = getTopCard(state);
  const playable = getPlayableCards([drawnCard], topCard, state.currentColor);

  if (playable.length === 0) {
    state.currentPlayer = nextPlayerIndex(state.currentPlayer, state.direction, state.numPlayers);
    await syncState();
    advanceTurn();
    return { card: drawnCard, canPlay: false };
  }

  await syncState();
  return { card: drawnCard, canPlay: true };
}

export async function hostPassAfterDraw() {
  if (!state || state.gameOver) return;
  if (state.currentPlayer !== 0) return;

  state.currentPlayer = nextPlayerIndex(state.currentPlayer, state.direction, state.numPlayers);
  await syncState();
  advanceTurn();
}

export function hostCallLastCard() {
  if (!state) return;
  state.lastCardCalledBy.add(0);
}

async function syncState() {
  if (!state) return;

  const serializedState = {
    drawPileCount: state.drawPile.length,
    discardPile: state.discardPile.map(serializeCard),
    currentPlayer: state.currentPlayer,
    direction: state.direction,
    currentColor: state.currentColor,
    gameOver: state.gameOver,
    winner: state.winner,
    numPlayers: state.numPlayers
  };

  const guestHand = state.hands[1].map(serializeCard);
  const hostHandCount = state.hands[0].length;

  const ref = getRoomRef(roomCode);

  // Simple updateDoc — no transaction needed. The processedMoveIndex tells
  // us where we left off; guest appends to moves[] independently.
  try {
    await updateDoc(ref, {
      gameState: serializedState,
      guestHand,
      hostHandCount,
      processedMoveIndex: lastMoveIndex
    });
  } catch (err) {
    // Retry once on failure
    try {
      await updateDoc(ref, {
        gameState: serializedState,
        guestHand,
        hostHandCount,
        processedMoveIndex: lastMoveIndex
      });
    } catch (retryErr) {
      if (callbacks.onError) callbacks.onError(retryErr);
    }
  }

  if (callbacks.onStateUpdate) callbacks.onStateUpdate(state);
}

function serializeCard(card) {
  return {
    id: card.id,
    color: card.color,
    type: card.type,
    value: card.value
  };
}

function endGame() {
  setRoomStatus('finished').catch(() => {});
  if (callbacks.onGameEnd) callbacks.onGameEnd(state);
}

function startDisconnectTimer() {
  if (disconnectTimer) return;
  if (callbacks.onGuestDisconnected) callbacks.onGuestDisconnected();

  disconnectTimer = setTimeout(() => {
    disconnectTimer = null;
    guestReplacedByBot = true;
    if (callbacks.onGuestReplacedByBot) callbacks.onGuestReplacedByBot();

    // If it's the guest's turn, bot plays
    if (state && state.currentPlayer === 1) {
      scheduleBotTurn();
    }
  }, DISCONNECT_TIMEOUT_MS);
}

function clearDisconnectTimer() {
  if (disconnectTimer) {
    clearTimeout(disconnectTimer);
    disconnectTimer = null;
  }
}

function clearBotTimer() {
  if (botTurnTimer) {
    clearTimeout(botTurnTimer);
    botTurnTimer = null;
  }
}

export function cleanup() {
  clearDisconnectTimer();
  clearBotTimer();
  stopListening();
  state = null;
  roomCode = null;
  guestUid = null;
  lastMoveIndex = 0;
  guestReplacedByBot = false;
  callbacks = {};
}
