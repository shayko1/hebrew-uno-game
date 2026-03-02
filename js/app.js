import { PLAYER_NAMES, SPECIAL_TYPES } from './constants.js';
import { createGameState, getTopCard, playCard, drawCards, getPlayableCards, nextPlayerIndex } from './state.js';
import { renderGame, showScreen, showUnoPopup, showColorPicker, hideColorPicker, showEndScreen, renderWelcomeDecorations, showToast, announce } from './ui.js';
import { botChooseCard, botChooseColor } from './bot.js';
import { showConfetti, showActionFeedback, animateCardToDiscard, flyCard, flyFlipCard, flyCardBack } from './animations.js';
import { initAudio, soundCardPlay, soundCardDraw, soundSkip, soundReverse, soundDrawTwo, soundWild, soundUno, soundWin, soundLose, soundBotPlay, soundYourTurn } from './sounds.js';
import { initPWA } from './pwa.js';
import { recordGame, renderStatsOverlay } from './stats.js';

let state = null;
let botTurnTimeout = null;
let selectedPlayerCount = 4;
let turnCount = 0;
let animating = false;

function init() {
  initAudio();
  initPWA();
  showScreen('welcome-screen');
  renderWelcomeDecorations();

  document.getElementById('start-btn').addEventListener('click', startGame);
  document.getElementById('play-again-btn').addEventListener('click', startGame);
  document.getElementById('restart-btn').addEventListener('click', handleRestart);
  document.getElementById('draw-pile').addEventListener('click', handleDrawPile);
  document.getElementById('uno-btn').addEventListener('click', handleUnoCall);
  document.getElementById('stats-btn').addEventListener('click', () => renderStatsOverlay());

  // Player count selector
  document.querySelectorAll('.player-count-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedPlayerCount = parseInt(btn.dataset.count, 10);
      document.querySelectorAll('.player-count-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Color picker buttons
  document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => handleColorChoice(btn.dataset.color));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state && state.pendingAction && state.pendingAction.type === 'colorPick') {
      state.pendingAction = null;
      hideColorPicker();
    }
  });
}

function handleRestart() {
  if (!state) return;
  startGame();
  showToast('משחק חדש!');
}

function startGame() {
  if (botTurnTimeout !== null) {
    clearTimeout(botTurnTimeout);
    botTurnTimeout = null;
  }
  animating = false;
  state = createGameState(selectedPlayerCount);
  turnCount = 0;
  showScreen('game-screen');
  renderGame(state, handleCardClick);

  // If first player isn't human, start bot turns
  if (state.currentPlayer !== 0) {
    scheduleBotTurn();
  }
}

function playSpecialSound(cardValue) {
  switch (cardValue) {
    case SPECIAL_TYPES.SKIP:
      soundSkip();
      break;
    case SPECIAL_TYPES.REVERSE:
      soundReverse();
      break;
    case SPECIAL_TYPES.DRAW_TWO:
      soundDrawTwo();
      break;
    case SPECIAL_TYPES.WILD:
    case SPECIAL_TYPES.WILD_DRAW_FOUR:
      soundWild();
      break;
  }
}

async function handleCardClick(card) {
  if (!state || state.gameOver) return;
  if (state.currentPlayer !== 0) return;
  if (state.pendingAction) return;
  if (animating) return;

  // Wild card: show color picker first
  if (card.color === 'wild') {
    state.pendingAction = { type: 'colorPick', card };
    showColorPicker();
    return;
  }

  // Find the card element before state change removes it
  const cardEl = document.querySelector('[data-card-id="' + card.id + '"]');

  const success = playCard(state, 0, card.id);
  if (!success) return;

  // Animate card flight to discard pile
  animating = true;
  try {
    soundCardPlay();
    const discardEl = document.getElementById('discard-pile');
    await flyCard(cardEl, discardEl);
    animateCardToDiscard();
  } finally {
    animating = false;
  }

  if (card.type === 'special') {
    playSpecialSound(card.value);
    showActionFeedback(card.value);
  }

  // UNO penalty: player has 1 card left but didn't call UNO
  if (state.hands[0].length === 1 && !state.unoCalledBy.has(0)) {
    drawCards(state, 0, 2);
  }
  state.unoCalledBy.delete(0);

  afterPlay();
}

async function handleColorChoice(color) {
  if (!state || !state.pendingAction || state.pendingAction.type !== 'colorPick') return;
  if (animating) return;

  const card = state.pendingAction.card;
  const cardEl = document.querySelector('[data-card-id="' + card.id + '"]');
  state.pendingAction = null;
  hideColorPicker();

  playCard(state, 0, card.id, color);

  animating = true;
  try {
    soundWild();
    const discardEl = document.getElementById('discard-pile');
    await flyCard(cardEl, discardEl);
    animateCardToDiscard();
  } finally {
    animating = false;
  }

  if (card.value === SPECIAL_TYPES.WILD_DRAW_FOUR) {
    showActionFeedback('wild_draw_four');
  }

  // UNO penalty: player has 1 card left but didn't call UNO
  if (state.hands[0].length === 1 && !state.unoCalledBy.has(0)) {
    drawCards(state, 0, 2);
  }
  state.unoCalledBy.delete(0);

  afterPlay();
}

async function handleDrawPile() {
  if (!state || state.gameOver) return;
  if (state.currentPlayer !== 0) return;
  if (state.pendingAction) return;
  if (animating) return;

  const drawn = drawCards(state, 0, 1);
  if (drawn.length === 0) return;

  const drawnCard = drawn[0];

  animating = true;
  try {
    soundCardDraw();
    const drawPileEl = document.getElementById('draw-pile');
    const handEl = document.getElementById('player-hand');
    await flyFlipCard(drawPileEl, handEl, drawnCard);
  } finally {
    animating = false;
  }

  const topCard = getTopCard(state);
  const playable = getPlayableCards([drawnCard], topCard, state.currentColor);

  if (playable.length > 0) {
    // Card is playable — re-render so the player can click it
    renderGame(state, handleCardClick);
  } else {
    // Not playable — advance turn
    showToast('שלפת קלף ועברת...');
    state.currentPlayer = nextPlayerIndex(state.currentPlayer, state.direction, state.numPlayers);
    afterTurnEnd();
  }
}

function handleUnoCall() {
  if (!state) return;
  state.unoCalledBy.add(0);
  soundUno();
  showUnoPopup();
  renderGame(state, handleCardClick);
}

function afterPlay() {
  turnCount++;
  if (state.gameOver) {
    endGame();
    return;
  }

  renderGame(state, handleCardClick);

  if (state.currentPlayer !== 0) {
    scheduleBotTurn();
  } else {
    soundYourTurn();
  }
}

function afterTurnEnd() {
  turnCount++;
  if (state.gameOver) {
    endGame();
    return;
  }

  renderGame(state, handleCardClick);

  if (state.currentPlayer !== 0) {
    scheduleBotTurn();
  } else {
    soundYourTurn();
  }
}

function scheduleBotTurn() {
  const delay = 800 + Math.random() * 700;
  botTurnTimeout = setTimeout(() => {
    botTurnTimeout = null;
    executeBotTurn();
  }, delay);
}

async function executeBotTurn() {
  if (!state || state.gameOver) return;

  const botIndex = state.currentPlayer;
  const botName = PLAYER_NAMES[botIndex];

  // Safety: if it's somehow the human's turn, just re-render
  if (botIndex === 0) {
    renderGame(state, handleCardClick);
    return;
  }

  const hand = state.hands[botIndex];
  const topCard = getTopCard(state);
  const card = botChooseCard(hand, topCard, state.currentColor);

  // Determine bot area element for animation start position
  const botPositions = { 1: 'bot-left', 2: 'bot-top', 3: 'bot-right' };
  let botAreaId = botPositions[botIndex];
  if (state.numPlayers === 2) botAreaId = 'bot-top';
  else if (state.numPlayers === 3 && botIndex === 2) botAreaId = 'bot-right';
  const botAreaEl = document.getElementById(botAreaId);
  const discardEl = document.getElementById('discard-pile');
  const drawPileEl = document.getElementById('draw-pile');

  if (card) {
    let chosenColor = null;

    if (card.color === 'wild') {
      chosenColor = botChooseColor(hand);
    }

    // Bot calls UNO when going from 2 cards to 1
    if (hand.length === 2) {
      soundUno();
      showUnoPopup();
    }

    playCard(state, botIndex, card.id, chosenColor);

    // Animate: card-back flies from bot area to discard, flips to reveal
    soundBotPlay();
    await flyFlipCard(botAreaEl, discardEl, card);
    animateCardToDiscard();

    // Show toast and feedback for special cards
    if (card.type === 'special') {
      playSpecialSound(card.value);
      showActionFeedback(card.value);

      if (card.value === SPECIAL_TYPES.DRAW_TWO) {
        showToast(botName + ' משחק +2!');
      } else if (card.value === SPECIAL_TYPES.WILD_DRAW_FOUR) {
        showToast(botName + ' משחק +4!');
      } else if (card.value === SPECIAL_TYPES.SKIP) {
        showToast(botName + ' משחק דילוג!');
      } else if (card.value === SPECIAL_TYPES.REVERSE) {
        showToast(botName + ' משחק הפוך!');
      }
    }
  } else {
    // No playable card — draw one
    const drawn = drawCards(state, botIndex, 1);
    showToast(botName + ' שולף קלף');
    soundCardDraw();

    // Animate: card-back flies from draw pile to bot area
    await flyCardBack(drawPileEl, botAreaEl);

    if (drawn.length > 0) {
      const drawnCard = drawn[0];
      const currentTopCard = getTopCard(state);
      const playable = getPlayableCards([drawnCard], currentTopCard, state.currentColor);

      if (playable.length > 0) {
        let chosenColor = null;
        if (drawnCard.color === 'wild') {
          chosenColor = botChooseColor(state.hands[botIndex]);
        }
        playCard(state, botIndex, drawnCard.id, chosenColor);

        // Animate: bot plays the drawn card
        soundBotPlay();
        await flyFlipCard(botAreaEl, discardEl, drawnCard);
        animateCardToDiscard();

        if (drawnCard.type === 'special') {
          playSpecialSound(drawnCard.value);
          showActionFeedback(drawnCard.value);
        }
      } else {
        // Can't play drawn card — advance turn
        state.currentPlayer = nextPlayerIndex(state.currentPlayer, state.direction, state.numPlayers);
      }
    } else {
      // Nothing to draw — advance turn
      state.currentPlayer = nextPlayerIndex(state.currentPlayer, state.direction, state.numPlayers);
    }
  }

  afterTurnEnd();
}

function endGame() {
  recordGame(state.winner === 0, state.numPlayers, turnCount);
  if (state.winner === 0) {
    soundWin();
    showEndScreen('כל הכבוד! ניצחת!');
    announce('כל הכבוד! ניצחת!');
    showConfetti();
  } else {
    soundLose();
    const winnerName = PLAYER_NAMES[state.winner] || '';
    showEndScreen(winnerName + ' ניצח! נסה שוב');
    announce(winnerName + ' ניצח! נסה שוב');
  }
}

init();
