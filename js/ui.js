// UI rendering and DOM manipulation

import { HEBREW_NUMBERS, SPECIAL_SYMBOLS, COLOR_HEX, PLAYERS, PLAYER_NAMES, BOT_AVATARS, COLOR_NAMES } from './constants.js';
import { getTopCard, canPlayCard } from './state.js';

export function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.add('hidden');
  });
  const target = document.getElementById(screenId);
  if (target) {
    target.classList.remove('hidden');
  }
}

export function showToast(message, duration = 2000) {
  const existing = document.querySelector('.game-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.classList.add('game-toast');
  toast.textContent = message;
  document.body.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Removes all child nodes from an element.
 */
function clearChildren(el) {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

/**
 * Creates a DOM element for a card.
 * @param {object} card - Card object with id, color, type, value
 * @param {boolean} faceUp - Whether card is face-up (default true)
 * @returns {HTMLElement} The card element
 */
export function createCardElement(card, faceUp = true) {
  const el = document.createElement('div');
  el.classList.add('card');
  el.dataset.cardId = card.id;

  // Face-down card
  if (!faceUp) {
    el.style.background = 'linear-gradient(135deg, #1a1a2e, #16213e)';
    el.style.border = '2px solid #e94560';
    el.style.color = '#e94560';
    el.style.fontSize = '16px';
    el.style.fontWeight = 'bold';
    el.textContent = 'UNO';
    return el;
  }

  // Add color class
  el.classList.add('card-' + card.color);

  // Determine display text and corner text
  let cornerText;
  let displayText;

  if (card.type === 'number') {
    cornerText = String(card.value);
    displayText = HEBREW_NUMBERS[card.value];
  } else {
    // Special card
    cornerText = SPECIAL_SYMBOLS[card.value] || '';
    displayText = SPECIAL_SYMBOLS[card.value] || '';
  }

  // Top corner
  const cornerTop = document.createElement('span');
  cornerTop.classList.add('card-corner', 'card-corner-top');
  cornerTop.textContent = cornerText;

  // Inner oval
  const inner = document.createElement('span');
  inner.classList.add('card-inner');
  inner.textContent = displayText;

  // Bottom corner
  const cornerBottom = document.createElement('span');
  cornerBottom.classList.add('card-corner', 'card-corner-bottom');
  cornerBottom.textContent = cornerText;

  el.appendChild(cornerTop);
  el.appendChild(inner);
  el.appendChild(cornerBottom);

  return el;
}

/**
 * Renders the human player's hand as a fan of cards.
 * @param {object} state - Game state
 * @param {function} onCardClick - Callback when a card is clicked
 */
export function renderPlayerHand(state, onCardClick) {
  const container = document.getElementById('player-hand');
  clearChildren(container);

  const hand = state.hands[PLAYERS.HUMAN];
  const topCard = getTopCard(state);
  const isMyTurn = state.currentPlayer === PLAYERS.HUMAN;

  const count = hand.length;
  const maxSpread = 50; // degrees
  const spread = Math.min(maxSpread, count * 6);
  const startAngle = -spread / 2;
  const angleStep = count > 1 ? spread / (count - 1) : 0;

  hand.forEach((card, i) => {
    const el = createCardElement(card, true);
    const playable = isMyTurn && canPlayCard(card, topCard, state.currentColor);

    if (playable) {
      el.classList.add('playable');
      el.classList.remove('not-playable');
      el.addEventListener('click', () => onCardClick(card));
    } else {
      el.classList.add('not-playable');
      el.classList.remove('playable');
    }

    const angle = startAngle + angleStep * i;
    const cardSpacing = Math.min(30, (window.innerWidth * 0.5) / Math.max(count, 1));
    const offset = (i - (count - 1) / 2) * cardSpacing;

    el.style.left = 'calc(50% + ' + offset + 'px - 50px)';
    el.style.transform = 'rotate(' + angle + 'deg)';
    el.style.zIndex = i;

    container.appendChild(el);
  });
}

/**
 * Renders the bot hands (card backs + count badge + name).
 * @param {object} state - Game state
 */
export function renderBotHands(state) {
  const bots = [
    { index: PLAYERS.BOT_LEFT, containerId: 'bot-left', handId: 'bot-left-hand' },
    { index: PLAYERS.BOT_TOP, containerId: 'bot-top', handId: 'bot-top-hand' },
    { index: PLAYERS.BOT_RIGHT, containerId: 'bot-right', handId: 'bot-right-hand' }
  ];

  bots.forEach(({ index, containerId, handId }) => {
    const container = document.getElementById(containerId);
    const handContainer = document.getElementById(handId);
    clearChildren(handContainer);

    // Toggle active-player glow
    if (state.currentPlayer === index) {
      container.classList.add('active-player');
    } else {
      container.classList.remove('active-player');
    }

    const cardCount = state.hands[index].length;
    const shown = Math.min(cardCount, 7);

    // Add card backs directly into the hand container (which already has .bot-hand class)
    for (let i = 0; i < shown; i++) {
      const cardBack = document.createElement('div');
      cardBack.classList.add('bot-card-back');
      cardBack.textContent = 'UNO';
      handContainer.appendChild(cardBack);
    }

    // Count badge
    const existingBadge = container.querySelector('.bot-count');
    if (existingBadge) {
      existingBadge.remove();
    }
    const badge = document.createElement('span');
    badge.classList.add('bot-count');
    badge.textContent = String(cardCount);
    container.appendChild(badge);

    // Name label with avatar
    const existingName = container.querySelector('.bot-name');
    if (existingName) {
      const avatar = BOT_AVATARS[index] || '';
      existingName.innerHTML = '';
      if (avatar) {
        const avatarSpan = document.createElement('span');
        avatarSpan.classList.add('bot-avatar');
        avatarSpan.textContent = avatar;
        existingName.appendChild(avatarSpan);
        existingName.appendChild(document.createTextNode(' '));
      }
      existingName.appendChild(document.createTextNode(PLAYER_NAMES[index]));

      // Thinking indicator
      const existingThinking = container.querySelector('.thinking-dots');
      if (existingThinking) existingThinking.remove();

      if (state.currentPlayer === index) {
        const thinking = document.createElement('span');
        thinking.classList.add('thinking-dots');
        existingName.appendChild(document.createTextNode(' '));
        existingName.appendChild(thinking);
      }
    }
  });
}

/**
 * Renders the center area: discard pile top card, direction indicator, turn message.
 * @param {object} state - Game state
 */
export function renderCenterArea(state) {
  const discardPile = document.getElementById('discard-pile');
  clearChildren(discardPile);

  const topCard = getTopCard(state);

  // Render the top card (non-interactive)
  const cardEl = createCardElement(topCard, true);
  cardEl.style.cursor = 'default';
  discardPile.appendChild(cardEl);

  // Always show current color indicator
  const existingIndicator = discardPile.querySelector('.color-indicator-bar');
  if (existingIndicator) {
    existingIndicator.remove();
  }

  const indicatorBar = document.createElement('div');
  indicatorBar.classList.add('color-indicator-bar');

  const dot = document.createElement('div');
  dot.classList.add('color-indicator-dot');
  dot.style.background = COLOR_HEX[state.currentColor] || COLOR_HEX.red;
  indicatorBar.appendChild(dot);

  const label = document.createElement('span');
  label.classList.add('color-indicator-label');
  label.textContent = COLOR_NAMES[state.currentColor] || '';
  indicatorBar.appendChild(label);

  discardPile.appendChild(indicatorBar);

  // Draw pile count
  const drawPileEl = document.getElementById('draw-pile');
  let drawCount = drawPileEl.querySelector('.draw-count');
  if (!drawCount) {
    drawCount = document.createElement('span');
    drawCount.classList.add('draw-count');
    drawPileEl.appendChild(drawCount);
  }
  drawCount.textContent = state.drawPile.length;

  // Direction indicator
  const dirIndicator = document.getElementById('direction-indicator');
  if (dirIndicator) {
    dirIndicator.textContent = state.direction === 1 ? '\u21BB' : '\u21BA';
  }

  // Turn message
  const turnMessage = document.getElementById('turn-message');
  if (turnMessage) {
    if (state.currentPlayer === PLAYERS.HUMAN) {
      turnMessage.textContent = '\u0021\u05EA\u05D5\u05E8\u05DA';
    } else {
      turnMessage.textContent = '';
    }
  }
}

/**
 * Renders the full game: all hands, center area, UNO button, active-player.
 * @param {object} state - Game state
 * @param {function} onCardClick - Callback when a player card is clicked
 */
export function renderGame(state, onCardClick) {
  renderPlayerHand(state, onCardClick);
  renderBotHands(state);
  renderCenterArea(state);

  // Toggle UNO button visibility
  const unoBtn = document.getElementById('uno-btn');
  if (unoBtn) {
    const isMyTurn = state.currentPlayer === PLAYERS.HUMAN;
    const hasTwoCards = state.hands[PLAYERS.HUMAN].length === 2;
    if (isMyTurn && hasTwoCards) {
      unoBtn.classList.remove('hidden');
    } else {
      unoBtn.classList.add('hidden');
    }
  }

  // Toggle active-player on player area
  const playerArea = document.querySelector('.player-area');
  if (playerArea) {
    if (state.currentPlayer === PLAYERS.HUMAN) {
      playerArea.classList.add('active-player');
    } else {
      playerArea.classList.remove('active-player');
    }
  }
}

/**
 * Shows a temporary UNO popup in the center of the screen.
 */
export function showUnoPopup() {
  const popup = document.createElement('div');
  popup.classList.add('uno-popup');
  popup.textContent = 'UNO!';
  document.body.appendChild(popup);

  setTimeout(() => {
    if (popup.parentNode) {
      popup.parentNode.removeChild(popup);
    }
  }, 1000);
}

export function showColorPicker() {
  const picker = document.getElementById('color-picker');
  if (picker) {
    picker.classList.remove('hidden');
  }
}

export function hideColorPicker() {
  const picker = document.getElementById('color-picker');
  if (picker) {
    picker.classList.add('hidden');
  }
}

/**
 * Adds floating card-back decorations to the welcome screen.
 */
export function renderWelcomeDecorations() {
  const welcomeScreen = document.getElementById('welcome-screen');
  if (!welcomeScreen) return;

  const count = 7;
  for (let i = 0; i < count; i++) {
    const card = document.createElement('div');
    card.classList.add('floating-card');
    card.textContent = 'UNO';
    card.style.top = (10 + Math.random() * 70) + '%';
    card.style.left = (5 + Math.random() * 85) + '%';
    card.style.animationDelay = (Math.random() * 5) + 's';
    card.style.animationDuration = (4 + Math.random() * 4) + 's';
    welcomeScreen.appendChild(card);
  }
}

export function showEndScreen(message) {
  const endMsg = document.getElementById('end-message');
  if (endMsg) {
    endMsg.textContent = message;
  }
  showScreen('end-screen');
}
