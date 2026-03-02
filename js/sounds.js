let audioCtx = null;
let audioEnabled = true;

try {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
} catch (e) {
  audioEnabled = false;
}

function playTone(freq, duration, type = 'sine', volume = 0.3) {
  if (!audioEnabled || !audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    // Silently ignore audio errors
  }
}

export function soundCardPlay() {
  playTone(800, 0.1, 'sine', 0.2);
  setTimeout(() => playTone(1000, 0.08, 'sine', 0.15), 50);
}

export function soundCardDraw() {
  playTone(400, 0.15, 'triangle', 0.2);
}

export function soundSkip() {
  playTone(300, 0.15, 'square', 0.15);
  setTimeout(() => playTone(200, 0.2, 'square', 0.1), 100);
}

export function soundReverse() {
  playTone(600, 0.1, 'sine', 0.2);
  setTimeout(() => playTone(400, 0.1, 'sine', 0.2), 100);
  setTimeout(() => playTone(600, 0.1, 'sine', 0.2), 200);
}

export function soundDrawTwo() {
  playTone(300, 0.1, 'sawtooth', 0.15);
  setTimeout(() => playTone(350, 0.1, 'sawtooth', 0.15), 120);
}

export function soundWild() {
  playTone(500, 0.15, 'sine', 0.2);
  setTimeout(() => playTone(700, 0.15, 'sine', 0.2), 100);
  setTimeout(() => playTone(900, 0.15, 'sine', 0.2), 200);
  setTimeout(() => playTone(1100, 0.2, 'sine', 0.25), 300);
}

export function soundUno() {
  // Exciting ascending arpeggio
  [500, 630, 750, 1000].forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.15, 'sine', 0.25), i * 80);
  });
}

export function soundWin() {
  // Victory fanfare
  const notes = [523, 659, 784, 1047, 784, 1047];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.2, 'sine', 0.3), i * 120);
  });
}

export function soundLose() {
  // Sad descending
  [400, 350, 300, 250].forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.25, 'triangle', 0.2), i * 150);
  });
}

export function soundBotPlay() {
  playTone(600, 0.08, 'triangle', 0.15);
}

export function soundYourTurn() {
  playTone(880, 0.1, 'sine', 0.15);
  setTimeout(() => playTone(1100, 0.12, 'sine', 0.2), 100);
}

// Resume audio context on first user interaction (browser policy)
export function initAudio() {
  document.addEventListener('click', () => {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  }, { once: true });
}
