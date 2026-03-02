// Local game statistics — stored in localStorage

const STATS_KEY = 'tsivoni_game_stats';

function getStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    currentStreak: 0,
    longestStreak: 0,
    playerCounts: { 2: 0, 3: 0, 4: 0 },
    totalTurns: 0
  };
}

function saveStats(stats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (e) {}
}

export function recordGame(won, playerCount, turnCount) {
  const stats = getStats();
  stats.gamesPlayed++;
  if (won) {
    stats.gamesWon++;
    stats.currentStreak++;
    if (stats.currentStreak > stats.longestStreak) {
      stats.longestStreak = stats.currentStreak;
    }
  } else {
    stats.gamesLost++;
    stats.currentStreak = 0;
  }
  if (stats.playerCounts[playerCount] !== undefined) {
    stats.playerCounts[playerCount]++;
  }
  stats.totalTurns += (turnCount || 0);
  saveStats(stats);
}

function createStatItem(value, label) {
  const item = document.createElement('div');
  item.classList.add('stat-item');

  const valEl = document.createElement('span');
  valEl.classList.add('stat-value');
  valEl.textContent = String(value);
  item.appendChild(valEl);

  const labelEl = document.createElement('span');
  labelEl.classList.add('stat-label');
  labelEl.textContent = label;
  item.appendChild(labelEl);

  return item;
}

export function renderStatsOverlay() {
  if (document.getElementById('stats-overlay')) return;
  const stats = getStats();
  const winRate = stats.gamesPlayed > 0
    ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
    : 0;
  const avgTurns = stats.gamesPlayed > 0
    ? Math.round(stats.totalTurns / stats.gamesPlayed)
    : 0;

  // Find most played player count
  let favCount = 4;
  let favCountMax = 0;
  for (const [count, times] of Object.entries(stats.playerCounts)) {
    if (times > favCountMax) {
      favCountMax = times;
      favCount = count;
    }
  }

  const overlay = document.createElement('div');
  overlay.id = 'stats-overlay';
  overlay.classList.add('overlay');

  const content = document.createElement('div');
  content.classList.add('stats-content');

  const heading = document.createElement('h2');
  heading.textContent = 'סטטיסטיקות';
  content.appendChild(heading);

  const grid = document.createElement('div');
  grid.classList.add('stats-grid');
  grid.appendChild(createStatItem(stats.gamesPlayed, 'משחקים'));
  grid.appendChild(createStatItem(stats.gamesWon, 'ניצחונות'));
  grid.appendChild(createStatItem(winRate + '%', 'אחוז ניצחון'));
  grid.appendChild(createStatItem(stats.longestStreak, 'רצף שיא'));
  grid.appendChild(createStatItem(avgTurns, 'תורות ממוצע'));
  grid.appendChild(createStatItem(favCount, 'שחקנים מועדף'));
  content.appendChild(grid);

  const buttons = document.createElement('div');
  buttons.classList.add('stats-buttons');

  const closeBtn = document.createElement('button');
  closeBtn.classList.add('btn-stats-close');
  closeBtn.textContent = 'סגור';
  closeBtn.addEventListener('click', () => {
    overlay.remove();
    document.removeEventListener('keydown', onEsc);
  });
  buttons.appendChild(closeBtn);

  const resetBtn = document.createElement('button');
  resetBtn.classList.add('btn-stats-reset');
  resetBtn.textContent = 'אפס סטטיסטיקות';
  resetBtn.addEventListener('click', () => {
    localStorage.removeItem(STATS_KEY);
    overlay.remove();
    document.removeEventListener('keydown', onEsc);
  });
  buttons.appendChild(resetBtn);

  content.appendChild(buttons);
  overlay.appendChild(content);

  // Close on Escape
  const onEsc = (e) => {
    if (e.key === 'Escape') {
      overlay.remove();
      document.removeEventListener('keydown', onEsc);
    }
  };
  document.addEventListener('keydown', onEsc);

  document.body.appendChild(overlay);
}
