import { PLAYERS } from './constants.js';
import { createGameState, getTopCard, playCard, drawCards, getPlayableCards, nextPlayerIndex } from './state.js';
import { renderGame, showScreen, showUnoPopup, showColorPicker, hideColorPicker, showEndScreen, renderWelcomeDecorations } from './ui.js';
import { botChooseCard, botChooseColor } from './bot.js';
import { showConfetti } from './animations.js';

let state = null;
let botTurnTimeout = null;

function init() {
  showScreen('welcome-screen');
  renderWelcomeDecorations();

  document.getElementById('start-btn').addEventListener('click', startGame);
  document.getElementById('play-again-btn').addEventListener('click', startGame);
  document.getElementById('draw-pile').addEventListener('click', handleDrawPile);
  document.getElementById('uno-btn').addEventListener('click', handleUnoCall);

  // Color picker buttons
  document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => handleColorChoice(btn.dataset.color));
  });
}

function startGame() {
  if (botTurnTimeout !== null) {
    clearTimeout(botTurnTimeout);
    botTurnTimeout = null;
  }
  state = createGameState();
  showScreen('game-screen');
  renderGame(state, handleCardClick);

  // If first player isn't human, start bot turns
  if (state.currentPlayer !== PLAYERS.HUMAN) {
    scheduleBotTurn();
  }
}

function handleCardClick(card) {
  if (!state || state.gameOver) return;
  if (state.currentPlayer !== PLAYERS.HUMAN) return;
  if (state.pendingAction) return;

  // Wild card: show color picker first
  if (card.color === 'wild') {
    state.pendingAction = { type: 'colorPick', card };
    showColorPicker();
    return;
  }

  const success = playCard(state, PLAYERS.HUMAN, card.id);
  if (!success) return;

  // UNO penalty: player has 1 card left but didn't call UNO
  if (state.hands[PLAYERS.HUMAN].length === 1 && !state.unoCalledBy.has(PLAYERS.HUMAN)) {
    drawCards(state, PLAYERS.HUMAN, 2);
  }
  state.unoCalledBy.delete(PLAYERS.HUMAN);

  afterPlay();
}

function handleColorChoice(color) {
  if (!state || !state.pendingAction || state.pendingAction.type !== 'colorPick') return;

  const card = state.pendingAction.card;
  state.pendingAction = null;
  hideColorPicker();

  playCard(state, PLAYERS.HUMAN, card.id, color);

  // UNO penalty: player has 1 card left but didn't call UNO
  if (state.hands[PLAYERS.HUMAN].length === 1 && !state.unoCalledBy.has(PLAYERS.HUMAN)) {
    drawCards(state, PLAYERS.HUMAN, 2);
  }
  state.unoCalledBy.delete(PLAYERS.HUMAN);

  afterPlay();
}

function handleDrawPile() {
  if (!state || state.gameOver) return;
  if (state.currentPlayer !== PLAYERS.HUMAN) return;
  if (state.pendingAction) return;

  const drawn = drawCards(state, PLAYERS.HUMAN, 1);
  if (drawn.length === 0) return;

  const drawnCard = drawn[0];
  const topCard = getTopCard(state);
  const playable = getPlayableCards([drawnCard], topCard, state.currentColor);

  if (playable.length > 0) {
    // Card is playable — re-render so the player can click it
    renderGame(state, handleCardClick);
  } else {
    // Not playable — advance turn
    state.currentPlayer = nextPlayerIndex(state.currentPlayer, state.direction);
    afterTurnEnd();
  }
}

function handleUnoCall() {
  if (!state) return;
  state.unoCalledBy.add(PLAYERS.HUMAN);
  showUnoPopup();
  renderGame(state, handleCardClick);
}

function afterPlay() {
  if (state.gameOver) {
    endGame();
    return;
  }

  renderGame(state, handleCardClick);

  if (state.currentPlayer !== PLAYERS.HUMAN) {
    scheduleBotTurn();
  }
}

function afterTurnEnd() {
  if (state.gameOver) {
    endGame();
    return;
  }

  renderGame(state, handleCardClick);

  if (state.currentPlayer !== PLAYERS.HUMAN) {
    scheduleBotTurn();
  }
}

function scheduleBotTurn() {
  const delay = 800 + Math.random() * 700;
  botTurnTimeout = setTimeout(() => {
    botTurnTimeout = null;
    executeBotTurn();
  }, delay);
}

function executeBotTurn() {
  if (!state || state.gameOver) return;

  const botIndex = state.currentPlayer;

  // Safety: if it's somehow the human's turn, just re-render
  if (botIndex === PLAYERS.HUMAN) {
    renderGame(state, handleCardClick);
    return;
  }

  const hand = state.hands[botIndex];
  const topCard = getTopCard(state);
  const card = botChooseCard(hand, topCard, state.currentColor);

  if (card) {
    let chosenColor = null;

    if (card.color === 'wild') {
      chosenColor = botChooseColor(hand);
    }

    // Bot calls UNO when going from 2 cards to 1
    if (hand.length === 2) {
      showUnoPopup();
    }

    playCard(state, botIndex, card.id, chosenColor);
  } else {
    // No playable card — draw one
    const drawn = drawCards(state, botIndex, 1);

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
      } else {
        // Can't play drawn card — advance turn
        state.currentPlayer = nextPlayerIndex(state.currentPlayer, state.direction);
      }
    } else {
      // Nothing to draw — advance turn
      state.currentPlayer = nextPlayerIndex(state.currentPlayer, state.direction);
    }
  }

  afterTurnEnd();
}

function endGame() {
  if (state.winner === PLAYERS.HUMAN) {
    showEndScreen('כל הכבוד! ניצחת!');
    showConfetti();
  } else {
    showEndScreen('!נסה שוב');
  }
}

init();
