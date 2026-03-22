import { PLAYER_NAMES, SPECIAL_TYPES } from './constants.js';
import { createGameState, getTopCard, playCard, drawCards, getPlayableCards, nextPlayerIndex } from './state.js';
import { renderGame, showScreen, showLastCardPopup, showColorPicker, hideColorPicker, showEndScreen, renderWelcomeDecorations, showToast, announce } from './ui.js';
import { botChooseCard, botChooseColor } from './bot.js';
import { showConfetti, showActionFeedback, animateCardToDiscard, flyCard, flyFlipCard, flyCardBack } from './animations.js';
import { initAudio, toggleMute, isMuted, soundCardPlay, soundCardDraw, soundSkip, soundReverse, soundDrawTwo, soundWild, soundLastCard, soundWin, soundLose, soundBotPlay, soundYourTurn } from './sounds.js';
import { initPWA } from './pwa.js';
import { recordGame, renderStatsOverlay } from './stats.js';
import {
  saveSnapshot,
  loadSnapshot,
  clearSnapshot,
  savePlayerCount,
  loadPlayerCount,
  saveGameMode,
  loadGameMode,
  saveMatchMode,
  loadMatchMode,
  saveNickname,
  loadNickname
} from './persistence.js';

const DEFAULT_TARGET_SCORE = 250;
const ROOM_STORAGE_PREFIX = 'tsivoni_room_';
const ROOM_TTL_MS = 2 * 60 * 60 * 1000;

let state = null;
let botTurnTimeout = null;
let quickMatchTimeout = null;
let selectedPlayerCount = 4;
let selectedGameMode = 'local';
let selectedMatchMode = 'single';
let selectedNickname = '';
let pendingRoomCode = null;
let turnCount = 0;
let animating = false;

function syncMuteButton(btn) {
  if (!btn) return;
  const m = isMuted();
  btn.textContent = m ? '\u{1F507}' : '\u{1F50A}';
  btn.setAttribute('aria-label', m ? 'הפעל צלילים' : 'השתק צלילים');
  btn.classList.toggle('muted', m);
}

function clearBotTurnTimer() {
  if (botTurnTimeout !== null) {
    clearTimeout(botTurnTimeout);
    botTurnTimeout = null;
  }
}

function clearOnlineTimers() {
  if (quickMatchTimeout !== null) {
    clearTimeout(quickMatchTimeout);
    quickMatchTimeout = null;
  }
}

function persistState() {
  saveSnapshot(state);
}

function normalizeRoomCode(code) {
  if (typeof code !== 'string') return '';
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

function generateRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

function saveRoomMeta(code, hostNickname) {
  const normalizedCode = normalizeRoomCode(code);
  if (!normalizedCode) return;

  const roomData = {
    code: normalizedCode,
    host: (hostNickname || '').trim().slice(0, 20),
    createdAt: Date.now()
  };

  try {
    localStorage.setItem(ROOM_STORAGE_PREFIX + normalizedCode, JSON.stringify(roomData));
  } catch {
    // silent
  }
}

function loadRoomMeta(code) {
  const normalizedCode = normalizeRoomCode(code);
  if (!normalizedCode) return null;

  try {
    const raw = localStorage.getItem(ROOM_STORAGE_PREFIX + normalizedCode);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || parsed.code !== normalizedCode || typeof parsed.createdAt !== 'number') {
      return null;
    }

    if (Date.now() - parsed.createdAt > ROOM_TTL_MS) {
      localStorage.removeItem(ROOM_STORAGE_PREFIX + normalizedCode);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function setOnlineStatus(message, tone = '') {
  const statusEl = document.getElementById('online-status');
  if (!statusEl) return;
  statusEl.textContent = message || '';
  statusEl.classList.remove('warn', 'error', 'success');
  if (tone) {
    statusEl.classList.add(tone);
  }
}

function readNickname() {
  const input = document.getElementById('nickname-input');
  const fromInput = input ? input.value : '';
  const nickname = (fromInput || selectedNickname || '').trim().slice(0, 20);

  if (input) {
    input.value = nickname;
  }

  selectedNickname = nickname;
  saveNickname(nickname);
  return nickname;
}

function toggleOnlineControls(disabled) {
  ['quick-match-btn', 'create-room-btn', 'join-room-btn'].forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = disabled;
  });
}

function syncWelcomeControls() {
  const onlinePanel = document.getElementById('online-panel');
  const startBtn = document.getElementById('start-btn');

  document.querySelectorAll('.player-count-btn').forEach((btn) => {
    btn.classList.toggle('active', parseInt(btn.dataset.count, 10) === selectedPlayerCount);
  });

  document.querySelectorAll('.game-mode-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === selectedGameMode);
  });

  document.querySelectorAll('.match-mode-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.matchMode === selectedMatchMode);
  });

  if (onlinePanel) {
    if (selectedGameMode === 'online') {
      onlinePanel.classList.remove('hidden');
    } else {
      onlinePanel.classList.add('hidden');
    }
  }

  if (startBtn) {
    startBtn.textContent = selectedGameMode === 'online' ? 'התאמה מהירה' : 'בואו נשחק!';
    startBtn.setAttribute('aria-label', selectedGameMode === 'online' ? 'התאמה מהירה' : 'התחל משחק');
  }

  const nicknameInput = document.getElementById('nickname-input');
  if (nicknameInput && !nicknameInput.value && selectedNickname) {
    nicknameInput.value = selectedNickname;
  }

  if (pendingRoomCode) {
    const roomCodeInput = document.getElementById('room-code-input');
    if (roomCodeInput) {
      roomCodeInput.value = pendingRoomCode;
    }
  }
}

function clearChildren(el) {
  if (!el) return;
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

function renderSessionBanner() {
  const banner = document.getElementById('session-banner');
  if (!banner) return;

  if (!state) {
    banner.textContent = '';
    banner.classList.add('hidden');
    return;
  }

  const parts = [];
  if (state.gameMode === 'online') {
    parts.push(state.roomCode ? 'אונליין • חדר ' + state.roomCode : 'אונליין • התאמה מהירה');
  } else {
    parts.push('מקומי');
  }

  if (state.matchMode === 'points') {
    const scores = state.matchScores.map((score, index) => PLAYER_NAMES[index] + ' ' + score).join(' | ');
    parts.push('סיבוב ' + state.roundNumber);
    parts.push('יעד ' + state.targetScore);
    parts.push(scores);
  } else {
    parts.push('סיבוב יחיד');
  }

  banner.textContent = parts.join('  •  ');
  banner.classList.remove('hidden');
}

function renderCurrentGame() {
  renderGame(state, handleCardClick);
  renderSessionBanner();
}

function getCardScore(card) {
  if (!card) return 0;
  if (card.type === 'number') {
    return Number(card.value) || 0;
  }

  if (card.value === SPECIAL_TYPES.WILD || card.value === SPECIAL_TYPES.WILD_DRAW_FOUR) {
    return 50;
  }

  return 20;
}

function getRoundPoints(winnerIndex) {
  if (!state || typeof winnerIndex !== 'number') return 0;

  let points = 0;
  for (let i = 0; i < state.hands.length; i++) {
    if (i === winnerIndex) continue;
    for (let j = 0; j < state.hands[i].length; j++) {
      points += getCardScore(state.hands[i][j]);
    }
  }

  return points;
}

function renderEndScoreboard(roundPoints, matchComplete) {
  const board = document.getElementById('end-scoreboard');
  if (!board) return;

  clearChildren(board);

  if (!state || state.matchMode !== 'points') {
    return;
  }

  const title = document.createElement('div');
  title.className = 'end-score-title';
  if (matchComplete) {
    title.textContent = 'סיכום משחק נקודות • יעד ' + state.targetScore;
  } else {
    const winnerName = PLAYER_NAMES[state.winner] || 'שחקן';
    title.textContent = 'סיבוב ' + state.roundNumber + ' • +' + roundPoints + ' נק\' ל' + winnerName;
  }
  board.appendChild(title);

  state.matchScores.forEach((score, index) => {
    const row = document.createElement('div');
    row.className = 'end-score-row';

    if (matchComplete && state.matchWinner === index) {
      row.classList.add('active');
    }

    const name = document.createElement('span');
    name.textContent = PLAYER_NAMES[index] || ('שחקן ' + (index + 1));

    const value = document.createElement('span');
    value.textContent = String(score);

    row.appendChild(name);
    row.appendChild(value);
    board.appendChild(row);
  });
}

function updateEndButtons(matchComplete) {
  const playAgainBtn = document.getElementById('play-again-btn');
  if (!playAgainBtn) return;

  let label = 'שחק שוב';
  if (state && state.matchMode === 'points') {
    label = matchComplete ? 'משחק חדש' : 'סיבוב הבא';
  }

  playAgainBtn.textContent = label;
  playAgainBtn.setAttribute('aria-label', label);
}

function init() {
  initAudio();
  initPWA();
  renderWelcomeDecorations();

  const savedCount = loadPlayerCount();
  if (savedCount) {
    selectedPlayerCount = savedCount;
  }

  const savedGameMode = loadGameMode();
  if (savedGameMode) {
    selectedGameMode = savedGameMode;
  }

  const savedMatchMode = loadMatchMode();
  if (savedMatchMode) {
    selectedMatchMode = savedMatchMode;
  }

  selectedNickname = loadNickname();
  syncWelcomeControls();

  const savedState = loadSnapshot();
  if (savedState && !savedState.gameOver) {
    showResumePrompt(savedState);
  } else {
    clearSnapshot();
    showScreen('welcome-screen');
  }

  const startBtn = document.getElementById('start-btn');
  if (startBtn) startBtn.addEventListener('click', handleStartButton);

  const playAgainBtn = document.getElementById('play-again-btn');
  if (playAgainBtn) playAgainBtn.addEventListener('click', handlePlayAgain);

  const backToMenuBtn = document.getElementById('back-to-menu-btn');
  if (backToMenuBtn) backToMenuBtn.addEventListener('click', backToMenu);

  const restartBtn = document.getElementById('restart-btn');
  if (restartBtn) restartBtn.addEventListener('click', handleRestart);

  const drawPile = document.getElementById('draw-pile');
  if (drawPile) drawPile.addEventListener('click', handleDrawPile);

  const lastCardBtn = document.getElementById('last-card-btn');
  if (lastCardBtn) lastCardBtn.addEventListener('click', handleLastCardCall);

  const statsBtn = document.getElementById('stats-btn');
  if (statsBtn) statsBtn.addEventListener('click', () => renderStatsOverlay());

  const quickMatchBtn = document.getElementById('quick-match-btn');
  if (quickMatchBtn) quickMatchBtn.addEventListener('click', handleQuickMatch);

  const createRoomBtn = document.getElementById('create-room-btn');
  if (createRoomBtn) createRoomBtn.addEventListener('click', handleCreateRoom);

  const joinRoomBtn = document.getElementById('join-room-btn');
  if (joinRoomBtn) joinRoomBtn.addEventListener('click', handleJoinRoom);

  document.querySelectorAll('.game-mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode === 'online' ? 'online' : 'local';
      selectedGameMode = mode;
      saveGameMode(mode);

      if (mode === 'local') {
        pendingRoomCode = null;
        setOnlineStatus('');
      }

      syncWelcomeControls();
    });
  });

  document.querySelectorAll('.match-mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.matchMode === 'points' ? 'points' : 'single';
      selectedMatchMode = mode;
      saveMatchMode(mode);
      syncWelcomeControls();
    });
  });

  // Mute buttons
  const muteBtn = document.getElementById('mute-btn');
  const welcomeMuteBtn = document.getElementById('welcome-mute-btn');
  syncMuteButton(muteBtn);
  syncMuteButton(welcomeMuteBtn);
  muteBtn.addEventListener('click', () => {
    toggleMute();
    syncMuteButton(muteBtn);
    syncMuteButton(welcomeMuteBtn);
  });
  welcomeMuteBtn.addEventListener('click', () => {
    toggleMute();
    syncMuteButton(muteBtn);
    syncMuteButton(welcomeMuteBtn);
  });

  // Restart confirmation buttons
  document.getElementById('restart-confirm-yes').addEventListener('click', confirmRestart);
  document.getElementById('restart-confirm-no').addEventListener('click', cancelRestart);

  // Player count selector
  document.querySelectorAll('.player-count-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedPlayerCount = parseInt(btn.dataset.count, 10);
      savePlayerCount(selectedPlayerCount);
      syncWelcomeControls();
    });
  });

  // Color picker buttons
  document.querySelectorAll('.color-btn').forEach((btn) => {
    btn.addEventListener('click', () => handleColorChoice(btn.dataset.color));
  });

  document.getElementById('color-picker-cancel').addEventListener('click', cancelColorPick);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const restartOverlay = document.getElementById('restart-confirm');
      if (restartOverlay && restartOverlay.classList.contains('visible')) {
        cancelRestart();
        return;
      }
      if (state && state.pendingAction && state.pendingAction.type === 'colorPick') {
        cancelColorPick();
      }
    }
  });

  const nicknameInput = document.getElementById('nickname-input');
  if (nicknameInput) {
    nicknameInput.addEventListener('change', () => {
      readNickname();
    });
  }

  const roomCodeInput = document.getElementById('room-code-input');
  if (roomCodeInput) {
    roomCodeInput.addEventListener('input', () => {
      roomCodeInput.value = normalizeRoomCode(roomCodeInput.value);
    });
  }

  // Lifecycle autosave
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && state) persistState();
  });
  window.addEventListener('pagehide', () => {
    if (state) persistState();
  });
}

function showResumePrompt(savedState) {
  showScreen('welcome-screen');
  const overlay = document.createElement('div');
  overlay.className = 'overlay resume-overlay';
  overlay.innerHTML = '';

  const box = document.createElement('div');
  box.className = 'resume-prompt';

  const title = document.createElement('h2');
  title.textContent = 'יש משחק שמור';
  box.appendChild(title);

  const subtitle = document.createElement('p');
  subtitle.textContent = 'רוצה להמשיך מאיפה שעצרת?';
  box.appendChild(subtitle);

  const btnRow = document.createElement('div');
  btnRow.className = 'resume-buttons';

  const resumeBtn = document.createElement('button');
  resumeBtn.className = 'btn btn-primary';
  resumeBtn.textContent = 'המשך משחק';
  resumeBtn.addEventListener('click', () => {
    overlay.remove();
    resumeGame(savedState);
  });
  btnRow.appendChild(resumeBtn);

  const newBtn = document.createElement('button');
  newBtn.className = 'btn btn-secondary';
  newBtn.textContent = 'משחק חדש';
  newBtn.addEventListener('click', () => {
    overlay.remove();
    clearSnapshot();
  });
  btnRow.appendChild(newBtn);

  box.appendChild(btnRow);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

function resumeGame(savedState) {
  state = savedState;
  turnCount = 0;

  selectedPlayerCount = state.numPlayers || selectedPlayerCount;
  selectedGameMode = state.gameMode === 'online' ? 'online' : 'local';
  selectedMatchMode = state.matchMode === 'points' ? 'points' : 'single';
  selectedNickname = state.nickname || selectedNickname;
  pendingRoomCode = state.roomCode || null;

  savePlayerCount(selectedPlayerCount);
  saveGameMode(selectedGameMode);
  saveMatchMode(selectedMatchMode);
  saveNickname(selectedNickname);
  syncWelcomeControls();

  showScreen('game-screen');
  renderCurrentGame();

  if (state.pendingAction) {
    showColorPicker();
  } else if (state.currentPlayer !== 0) {
    scheduleBotTurn();
  }
}

function cancelColorPick() {
  if (!state || !state.pendingAction || state.pendingAction.type !== 'colorPick') return;
  state.pendingAction = null;
  hideColorPicker();
}

function handleRestart() {
  if (!state || state.gameOver) {
    startGame();
    showToast('משחק חדש!');
    return;
  }
  showRestartConfirm();
}

function showRestartConfirm() {
  const overlay = document.getElementById('restart-confirm');
  overlay.classList.remove('hidden');
  void overlay.offsetWidth;
  overlay.classList.add('visible');
}

function hideRestartConfirm() {
  const overlay = document.getElementById('restart-confirm');
  overlay.classList.remove('visible');
  overlay.addEventListener('transitionend', function handler() {
    overlay.removeEventListener('transitionend', handler);
    overlay.classList.add('hidden');
  });
}

function confirmRestart() {
  hideRestartConfirm();
  startGame();
  showToast('משחק חדש!');
}

function cancelRestart() {
  hideRestartConfirm();
}

function handleStartButton() {
  if (selectedGameMode === 'online') {
    handleQuickMatch();
    return;
  }

  startGame();
}

function handleQuickMatch() {
  if (selectedGameMode !== 'online') {
    selectedGameMode = 'online';
    saveGameMode(selectedGameMode);
    syncWelcomeControls();
  }

  const nickname = readNickname();
  if (!nickname) {
    setOnlineStatus('בחר כינוי כדי להתחיל אונליין.', 'warn');
    return;
  }

  clearOnlineTimers();
  pendingRoomCode = null;
  syncWelcomeControls();
  setOnlineStatus('מחפש יריב... אם לא נמצא, נתחיל מול בוט.', 'warn');
  toggleOnlineControls(true);

  const delay = 2400 + Math.random() * 2200;
  quickMatchTimeout = setTimeout(() => {
    quickMatchTimeout = null;
    toggleOnlineControls(false);
    setOnlineStatus('לא נמצא יריב כרגע. מתחילים מול בוט במצב אונליין.', 'success');
    startGame({
      gameMode: 'online',
      nickname,
      roomCode: null
    });
  }, delay);
}

function handleCreateRoom() {
  if (selectedGameMode !== 'online') {
    selectedGameMode = 'online';
    saveGameMode(selectedGameMode);
    syncWelcomeControls();
  }

  const nickname = readNickname();
  if (!nickname) {
    setOnlineStatus('בחר כינוי לפני יצירת חדר.', 'warn');
    return;
  }

  clearOnlineTimers();

  const roomCode = generateRoomCode();
  pendingRoomCode = roomCode;
  saveRoomMeta(roomCode, nickname);

  const roomCodeInput = document.getElementById('room-code-input');
  if (roomCodeInput) {
    roomCodeInput.value = roomCode;
  }

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(roomCode).catch(() => {});
  }

  setOnlineStatus('החדר נוצר: ' + roomCode + '. כרגע מצב בטא, מתחילים מול בוט.', 'success');

  startGame({
    gameMode: 'online',
    nickname,
    roomCode
  });
}

function handleJoinRoom() {
  if (selectedGameMode !== 'online') {
    selectedGameMode = 'online';
    saveGameMode(selectedGameMode);
    syncWelcomeControls();
  }

  const nickname = readNickname();
  if (!nickname) {
    setOnlineStatus('בחר כינוי לפני הצטרפות לחדר.', 'warn');
    return;
  }

  const roomCodeInput = document.getElementById('room-code-input');
  const requestedCode = roomCodeInput ? normalizeRoomCode(roomCodeInput.value) : '';
  if (!requestedCode) {
    setOnlineStatus('צריך להזין קוד חדר.', 'error');
    return;
  }

  const room = loadRoomMeta(requestedCode);
  if (!room) {
    setOnlineStatus('לא מצאנו חדר עם הקוד הזה.', 'error');
    return;
  }

  pendingRoomCode = room.code;
  if (roomCodeInput) {
    roomCodeInput.value = room.code;
  }

  setOnlineStatus('הצטרפת לחדר ' + room.code + '. כרגע מצב בטא, מתחילים מול בוט.', 'success');

  startGame({
    gameMode: 'online',
    nickname,
    roomCode: room.code
  });
}

function buildStartOptions(overrides = {}) {
  const numPlayers = Number.isInteger(overrides.numPlayers) ? overrides.numPlayers : selectedPlayerCount;
  const gameMode = overrides.gameMode || selectedGameMode;
  const matchMode = overrides.matchMode || selectedMatchMode;
  const targetScore = (typeof overrides.targetScore === 'number' && overrides.targetScore > 0)
    ? Math.floor(overrides.targetScore)
    : DEFAULT_TARGET_SCORE;

  const nickname = typeof overrides.nickname === 'string'
    ? overrides.nickname.trim().slice(0, 20)
    : selectedNickname;

  const roomCode = overrides.roomCode !== undefined
    ? overrides.roomCode
    : (gameMode === 'online' ? pendingRoomCode : null);

  let matchScores = overrides.matchScores;
  if (!Array.isArray(matchScores) || matchScores.length !== numPlayers) {
    matchScores = Array(numPlayers).fill(0);
  }

  const roundNumber = (Number.isInteger(overrides.roundNumber) && overrides.roundNumber > 0)
    ? overrides.roundNumber
    : 1;

  return {
    numPlayers,
    gameMode,
    matchMode,
    targetScore,
    nickname,
    roomCode,
    matchScores,
    roundNumber
  };
}

function startGame(overrides = {}) {
  clearBotTurnTimer();
  clearOnlineTimers();
  toggleOnlineControls(false);
  animating = false;
  clearSnapshot();

  const options = buildStartOptions(overrides);

  selectedPlayerCount = options.numPlayers;
  selectedGameMode = options.gameMode;
  selectedMatchMode = options.matchMode;
  selectedNickname = options.nickname;
  pendingRoomCode = options.roomCode || null;

  savePlayerCount(selectedPlayerCount);
  saveGameMode(selectedGameMode);
  saveMatchMode(selectedMatchMode);
  saveNickname(selectedNickname);
  syncWelcomeControls();

  state = createGameState(options.numPlayers, {
    gameMode: options.gameMode,
    matchMode: options.matchMode,
    targetScore: options.targetScore,
    matchScores: options.matchScores,
    roundNumber: options.roundNumber,
    roomCode: options.roomCode,
    nickname: options.nickname
  });

  state.hasDrawnThisTurn = false;
  turnCount = 0;

  showScreen('game-screen');
  renderCurrentGame();
  persistState();

  if (state.currentPlayer !== 0) {
    scheduleBotTurn();
  }
}

function startNextRound() {
  if (!state) return;

  startGame({
    numPlayers: state.numPlayers,
    gameMode: state.gameMode,
    matchMode: state.matchMode,
    targetScore: state.targetScore,
    matchScores: [...state.matchScores],
    roundNumber: (state.roundNumber || 1) + 1,
    roomCode: state.roomCode,
    nickname: state.nickname
  });
}

function handlePlayAgain() {
  if (!state) {
    startGame();
    return;
  }

  if (state.matchMode === 'points' && state.matchWinner == null) {
    startNextRound();
    return;
  }

  startGame({
    numPlayers: state.numPlayers,
    gameMode: state.gameMode,
    matchMode: state.matchMode,
    targetScore: state.targetScore,
    roomCode: state.roomCode,
    nickname: state.nickname
  });
}

function backToMenu() {
  clearBotTurnTimer();
  clearOnlineTimers();
  clearSnapshot();
  state = null;
  animating = false;
  showScreen('welcome-screen');
  syncWelcomeControls();
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
    persistState();
    showColorPicker();
    return;
  }

  // Find the card element before state change removes it
  const cardEl = document.querySelector('[data-card-id="' + card.id + '"]');

  const success = playCard(state, 0, card.id);
  if (!success) return;

  state.hasDrawnThisTurn = false;

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

  // Last card penalty: player has 1 card left but didn't call last card
  if (state.hands[0].length === 1 && !state.lastCardCalledBy.has(0)) {
    drawCards(state, 0, 2);
  }
  state.lastCardCalledBy.delete(0);

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
  state.hasDrawnThisTurn = false;

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

  // Last card penalty: player has 1 card left but didn't call last card
  if (state.hands[0].length === 1 && !state.lastCardCalledBy.has(0)) {
    drawCards(state, 0, 2);
  }
  state.lastCardCalledBy.delete(0);

  afterPlay();
}

async function handleDrawPile() {
  if (!state || state.gameOver) return;
  if (state.currentPlayer !== 0) return;
  if (state.pendingAction) return;
  if (animating) return;

  // One draw per turn — block additional draws
  if (state.hasDrawnThisTurn) {
    showToast('כבר שלפת, תורך עבר');
    state.hasDrawnThisTurn = false;
    state.currentPlayer = nextPlayerIndex(state.currentPlayer, state.direction, state.numPlayers);
    afterTurnEnd();
    return;
  }

  const drawn = drawCards(state, 0, 1);
  if (drawn.length === 0) return;

  state.hasDrawnThisTurn = true;
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
    renderCurrentGame();
    persistState();
  } else {
    showToast('שלפת קלף ועברת...');
    state.hasDrawnThisTurn = false;
    state.currentPlayer = nextPlayerIndex(state.currentPlayer, state.direction, state.numPlayers);
    afterTurnEnd();
  }
}

function handleLastCardCall() {
  if (!state) return;
  state.lastCardCalledBy.add(0);
  soundLastCard();
  showLastCardPopup();
  renderCurrentGame();
}

function afterPlay() {
  turnCount++;
  if (state.gameOver) {
    endGame();
    return;
  }

  state.hasDrawnThisTurn = false;
  persistState();
  renderCurrentGame();

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

  state.hasDrawnThisTurn = false;
  persistState();
  renderCurrentGame();

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
    renderCurrentGame();
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

    if (hand.length === 2) {
      soundLastCard();
      showLastCardPopup();
    }

    playCard(state, botIndex, card.id, chosenColor);

    soundBotPlay();
    await flyFlipCard(botAreaEl, discardEl, card);
    animateCardToDiscard();

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
    const drawn = drawCards(state, botIndex, 1);
    showToast(botName + ' שולף קלף');
    soundCardDraw();

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

        soundBotPlay();
        await flyFlipCard(botAreaEl, discardEl, drawnCard);
        animateCardToDiscard();

        if (drawnCard.type === 'special') {
          playSpecialSound(drawnCard.value);
          showActionFeedback(drawnCard.value);
        }
      } else {
        state.currentPlayer = nextPlayerIndex(state.currentPlayer, state.direction, state.numPlayers);
      }
    } else {
      state.currentPlayer = nextPlayerIndex(state.currentPlayer, state.direction, state.numPlayers);
    }
  }

  afterTurnEnd();
}

function endGame() {
  clearSnapshot();

  const roundPoints = getRoundPoints(state.winner);
  let matchComplete = false;

  if (state.matchMode === 'points') {
    const updatedScores = [...state.matchScores];
    updatedScores[state.winner] += roundPoints;
    state.matchScores = updatedScores;

    if (updatedScores[state.winner] >= state.targetScore) {
      state.matchWinner = state.winner;
      matchComplete = true;
    } else {
      state.matchWinner = null;
    }
  } else {
    matchComplete = true;
    state.matchWinner = state.winner;
  }

  if (state.matchMode === 'single' || matchComplete) {
    recordGame(state.matchWinner === 0, state.numPlayers, turnCount);
  }

  const endScreen = document.getElementById('end-screen');
  if (endScreen) {
    endScreen.classList.remove('end-win', 'end-lose');
  }

  const winnerName = PLAYER_NAMES[state.winner] || '';

  if (state.matchMode === 'points' && !matchComplete) {
    if (state.winner === 0) {
      if (endScreen) endScreen.classList.add('end-win');
      soundWin();
      showConfetti();
      showEndScreen('ניצחת בסיבוב!', '+' + roundPoints + ' נק\' נוספו לך');
      announce('ניצחת בסיבוב וקיבלת ' + roundPoints + ' נקודות.');
    } else {
      if (endScreen) endScreen.classList.add('end-lose');
      soundLose();
      showEndScreen(winnerName + ' ניצח בסיבוב', '+' + roundPoints + ' נק\' ל' + winnerName);
      announce(winnerName + ' ניצח בסיבוב וקיבל ' + roundPoints + ' נקודות.');
    }
  } else if (state.matchWinner === 0) {
    if (endScreen) endScreen.classList.add('end-win');
    soundWin();
    if (state.matchMode === 'points') {
      showEndScreen('\u{1F389} ניצחת במשחק הנקודות!', 'הגעת ל' + state.matchScores[0] + ' נקודות');
      announce('כל הכבוד. ניצחת במשחק הנקודות.');
    } else {
      showEndScreen('\u{1F389} כל הכבוד! ניצחת!', 'שיחקת מעולה!');
      announce('כל הכבוד! ניצחת!');
    }
    showConfetti();
  } else {
    if (endScreen) endScreen.classList.add('end-lose');
    soundLose();

    if (state.matchMode === 'points') {
      const champion = PLAYER_NAMES[state.matchWinner] || winnerName;
      showEndScreen(champion + ' ניצח במשחק הנקודות', 'אפשר רימאץ\' מיד');
      announce(champion + ' ניצח במשחק הנקודות.');
    } else {
      const encouragements = [
        'כמעט הצלחת! עוד סיבוב?',
        'לא נורא, בפעם הבאה!',
        'שיחקת טוב! נסה שוב?',
        'היה קרוב! עוד משחק?'
      ];
      const subtitle = encouragements[Math.floor(Math.random() * encouragements.length)];
      showEndScreen(winnerName + ' ניצח הפעם', subtitle);
      announce(winnerName + ' ניצח הפעם. ' + subtitle);
    }
  }

  renderEndScoreboard(roundPoints, matchComplete);
  updateEndButtons(matchComplete);
}

init();
