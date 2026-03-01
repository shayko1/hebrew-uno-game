// Animation helpers

/**
 * Shows a confetti celebration by creating 80 animated pieces.
 * Each piece has random position, color, size, shape, and timing.
 * Automatically cleans up after 4000ms.
 */
export function showConfetti() {
  const container = document.getElementById('confetti-container');
  if (!container) return;

  // Clear any existing confetti
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  const colors = ['#FF5555', '#5555FF', '#55AA55', '#FFAA00', '#e94560', '#FFD700'];

  for (let i = 0; i < 80; i++) {
    const piece = document.createElement('div');
    piece.classList.add('confetti-piece');

    const left = Math.random() * 100;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = 5 + Math.random() * 8; // 5-13px
    const isCircle = Math.random() > 0.5;
    const duration = 1.5 + Math.random() * 2; // 1.5-3.5s
    const delay = Math.random() * 1.5; // 0-1.5s

    piece.style.left = left + '%';
    piece.style.backgroundColor = color;
    piece.style.width = size + 'px';
    piece.style.height = size + 'px';
    piece.style.borderRadius = isCircle ? '50%' : '0';
    piece.style.animationDuration = duration + 's';
    piece.style.animationDelay = delay + 's';

    container.appendChild(piece);
  }

  // Clean up after animation completes
  setTimeout(() => {
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
  }, 4000);
}

export function animateCardPlay(cardElement, targetElement) {
  // TODO: implement card play animation
}

export function animateCardDraw(targetElement) {
  // TODO: implement card draw animation
}

export function showActionFeedback(actionType) {
  const feedback = document.createElement('div');
  feedback.classList.add('action-feedback');

  switch (actionType) {
    case 'skip':
      feedback.textContent = '⊘ דילוג!';
      break;
    case 'reverse':
      feedback.textContent = '⟲ הפוך!';
      break;
    case 'draw_two':
      feedback.textContent = '+2 !';
      break;
    case 'wild_draw_four':
      feedback.textContent = '+4 !';
      break;
  }

  document.body.appendChild(feedback);
  requestAnimationFrame(() => feedback.classList.add('show'));

  setTimeout(() => {
    feedback.classList.remove('show');
    setTimeout(() => feedback.remove(), 400);
  }, 1200);
}

export function animateCardToDiscard(callback) {
  const discard = document.getElementById('discard-pile');
  if (!discard) { if (callback) callback(); return; }

  discard.classList.add('card-played-flash');
  setTimeout(() => {
    discard.classList.remove('card-played-flash');
    if (callback) callback();
  }, 300);
}
