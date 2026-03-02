// UI rendering and DOM manipulation

import { SPECIAL_SYMBOLS, COLOR_HEX, PLAYER_NAMES, BOT_AVATARS, COLOR_NAMES } from './constants.js';
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
    el.classList.add('card-back');
    const backOval = document.createElement('div');
    backOval.classList.add('card-back-oval');
    backOval.textContent = 'UNO';
    el.appendChild(backOval);
    return el;
  }

  // Add color class
  el.classList.add('card-' + card.color);

  // Determine the display value (symbols only, no Hebrew)
  let symbol;
  if (card.type === 'number') {
    symbol = String(card.value);
  } else {
    symbol = SPECIAL_SYMBOLS[card.value] || '';
  }

  // Top-left corner
  const cornerTop = document.createElement('span');
  cornerTop.classList.add('card-corner', 'card-corner-top');
  cornerTop.textContent = symbol;

  // Tilted white oval with large centered symbol
  const oval = document.createElement('div');
  oval.classList.add('card-oval');
  const value = document.createElement('span');
  value.classList.add('card-value');
  value.textContent = symbol;
  oval.appendChild(value);

  // Bottom-right corner (upside-down)
  const cornerBottom = document.createElement('span');
  cornerBottom.classList.add('card-corner', 'card-corner-bottom');
  cornerBottom.textContent = symbol;

  el.appendChild(cornerTop);
  el.appendChild(oval);
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

  const hand = state.hands[0];
  const topCard = getTopCard(state);
  const isMyTurn = state.currentPlayer === 0;
  const count = hand.length;

  // Card width depends on screen size
  const isMobile = window.innerWidth < 600;
  const cardW = isMobile ? 68 : 88;

  // Calculate overlap: always show at least 30px of each card
  const minVisible = isMobile ? 26 : 34;
  const maxVisible = cardW * 0.65;
  const availableW = window.innerWidth * 0.94;

  let visiblePerCard;
  if (count <= 1) {
    visiblePerCard = cardW;
  } else {
    visiblePerCard = Math.min(maxVisible, Math.max(minVisible, (availableW - cardW) / (count - 1)));
  }
  const overlap = cardW - visiblePerCard;

  hand.forEach((card, i) => {
    const el = createCardElement(card, true);
    el.classList.add('hand-card');

    const playable = isMyTurn && canPlayCard(card, topCard, state.currentColor);
    if (playable) {
      el.classList.add('playable');
      el.addEventListener('click', () => onCardClick(card));
    } else {
      el.classList.add('not-playable');
      el.setAttribute('aria-disabled', 'true');
    }

      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
      const colorName = card.color === 'wild' ? 'ג\'וקר' :
        ({ red: 'אדום', blue: 'כחול', green: 'ירוק', yellow: 'צהוב' }[card.color] || card.color);
      const valueName = card.type === 'number' ? String(card.value) :
        ({ skip: 'דילוג', reverse: 'הפוך', draw_two: 'פלוס 2', wild: 'ג\'וקר', wild_draw_four: 'פלוס 4' }[card.value] || '');
      el.setAttribute('aria-label', colorName + ' ' + valueName);
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onCardClick(card);
        }
      });

    if (i > 0) {
      el.style.marginLeft = -overlap + 'px';
    }
    el.style.zIndex = i;

    container.appendChild(el);
  });
}

/**
 * Returns the bot-to-position mapping based on number of players.
 * Maps player indices (1+) to visual positions (left/top/right).
 */
function getBotLayout(numPlayers) {
  if (numPlayers === 2) return [{ index: 1, pos: 'top' }];
  if (numPlayers === 3) return [{ index: 1, pos: 'left' }, { index: 2, pos: 'right' }];
  return [{ index: 1, pos: 'left' }, { index: 2, pos: 'top' }, { index: 3, pos: 'right' }];
}

/**
 * Renders the bot hands (card backs + count badge + name).
 * Dynamically shows/hides bot areas based on player count.
 * @param {object} state - Game state
 */
export function renderBotHands(state) {
  const numPlayers = state.numPlayers || 4;
  const layout = getBotLayout(numPlayers);
  const allPositions = ['left', 'top', 'right'];

  // Determine which positions are active
  const activePositions = new Set(layout.map(b => b.pos));

  // Hide unused bot areas
  allPositions.forEach(pos => {
    const container = document.getElementById('bot-' + pos);
    if (!container) return;
    if (activePositions.has(pos)) {
      container.classList.remove('hidden');
    } else {
      container.classList.add('hidden');
    }
  });

  layout.forEach(({ index, pos }) => {
    const containerId = 'bot-' + pos;
    const handId = 'bot-' + pos + '-hand';
    const container = document.getElementById(containerId);
    const handContainer = document.getElementById(handId);
    if (!container || !handContainer) return;
    clearChildren(handContainer);

    // Toggle active-player glow
    if (state.currentPlayer === index) {
      container.classList.add('active-player');
    } else {
      container.classList.remove('active-player');
    }

    const cardCount = state.hands[index].length;
    const shown = Math.min(cardCount, 7);

    for (let i = 0; i < shown; i++) {
      const cardBack = document.createElement('div');
      cardBack.classList.add('bot-card-back');
      cardBack.textContent = 'UNO';
      handContainer.appendChild(cardBack);
    }

    // Count badge
    const existingBadge = container.querySelector('.bot-count');
    if (existingBadge) existingBadge.remove();
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
    if (state.currentPlayer === 0) {
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

  // Toggle UNO button visibility (player is always index 0)
  const unoBtn = document.getElementById('uno-btn');
  if (unoBtn) {
    const isMyTurn = state.currentPlayer === 0;
    const hasTwoCards = state.hands[0].length === 2;
    if (isMyTurn && hasTwoCards) {
      unoBtn.classList.remove('hidden');
    } else {
      unoBtn.classList.add('hidden');
    }
  }

  // Toggle active-player on player area
  const playerArea = document.querySelector('.player-area');
  if (playerArea) {
    if (state.currentPlayer === 0) {
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
