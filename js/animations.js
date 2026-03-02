// Animation helpers

import { createCardElement } from './ui.js';

/* ── internal helpers ─────────────────────────────────────────────── */

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getLayer() {
  return document.getElementById('animation-layer');
}

function clearLayer() {
  const layer = getLayer();
  if (!layer) return;
  while (layer.firstChild) {
    layer.removeChild(layer.firstChild);
  }
}

function rectCenter(rect) {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/* ── flight animations ────────────────────────────────────────────── */

/**
 * Fly a clone of sourceEl to targetEl with a CSS transition.
 * Hides sourceEl during flight and removes the clone afterwards.
 * @param {HTMLElement} sourceEl
 * @param {HTMLElement} targetEl
 * @param {object}      opts
 * @param {number}      [opts.duration=300]   transition ms
 * @param {number|null} [opts.rotation]       final rotation deg (default random +/-15)
 * @returns {Promise<void>}
 */
export function flyCard(sourceEl, targetEl, opts = {}) {
  if (prefersReducedMotion()) return Promise.resolve();

  const layer = getLayer();
  if (!layer || !sourceEl || !targetEl) return Promise.resolve();

  const duration = opts.duration ?? 300;
  const rotation = opts.rotation ?? ((Math.random() - 0.5) * 30);

  const srcRect = sourceEl.getBoundingClientRect();
  const tgtRect = targetEl.getBoundingClientRect();
  const tgtCenter = rectCenter(tgtRect);

  // Clone & position at source
  const clone = sourceEl.cloneNode(true);
  clone.classList.add('card-flight');
  clone.style.position = 'fixed';
  clone.style.left = srcRect.left + 'px';
  clone.style.top = srcRect.top + 'px';
  clone.style.width = srcRect.width + 'px';
  clone.style.height = srcRect.height + 'px';
  clone.style.margin = '0';
  clone.style.transition = `transform ${duration}ms ease-in-out`;
  clone.style.zIndex = '10000';
  clone.style.pointerEvents = 'none';

  layer.appendChild(clone);

  // Hide original
  sourceEl.style.opacity = '0';

  const dx = tgtCenter.x - (srcRect.left + srcRect.width / 2);
  const dy = tgtCenter.y - (srcRect.top + srcRect.height / 2);

  return new Promise((resolve) => {
    const safetyTimeout = setTimeout(() => {
      cleanup();
      resolve();
    }, duration + 200);

    function cleanup() {
      clearTimeout(safetyTimeout);
      if (clone.parentNode) clone.parentNode.removeChild(clone);
    }

    function onEnd(e) {
      if (e && e.target !== clone) return;
      clone.removeEventListener('transitionend', onEnd);
      cleanup();
      resolve();
    }

    clone.addEventListener('transitionend', onEnd);

    // Double rAF to ensure the browser has painted the initial position
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        clone.style.transform =
          `translate(${dx}px, ${dy}px) rotate(${rotation}deg)`;
      });
    });
  });
}

/**
 * Fly a card from sourceEl to targetEl with a mid-flight flip reveal.
 * Uses createCardElement for both faces.
 * @param {HTMLElement} sourceEl
 * @param {HTMLElement} targetEl
 * @param {object}      card       game card object
 * @param {object}      opts
 * @param {number}      [opts.duration=350]
 * @returns {Promise<void>}
 */
export function flyFlipCard(sourceEl, targetEl, card, opts = {}) {
  if (prefersReducedMotion()) return Promise.resolve();

  const layer = getLayer();
  if (!layer || !sourceEl || !targetEl) return Promise.resolve();

  const duration = opts.duration ?? 350;

  const isMobile = window.innerWidth < 600;
  const isSmall = window.innerWidth < 380;
  const cardW = isSmall ? 58 : (isMobile ? 68 : 88);
  const cardH = isSmall ? 87 : (isMobile ? 102 : 132);

  const srcRect = sourceEl.getBoundingClientRect();
  const tgtRect = targetEl.getBoundingClientRect();
  const srcCenter = rectCenter(srcRect);
  const tgtCenter = rectCenter(tgtRect);

  // Wrapper (carries perspective)
  const wrapper = document.createElement('div');
  wrapper.classList.add('card-flip-wrapper');
  wrapper.style.position = 'fixed';
  wrapper.style.left = (srcCenter.x - cardW / 2) + 'px';
  wrapper.style.top = (srcCenter.y - cardH / 2) + 'px';
  wrapper.style.width = cardW + 'px';
  wrapper.style.height = cardH + 'px';
  wrapper.style.perspective = '600px';
  wrapper.style.transition = `transform ${duration}ms ease-in-out`;
  wrapper.style.zIndex = '10000';
  wrapper.style.pointerEvents = 'none';

  // Inner (handles the 3-D flip)
  const inner = document.createElement('div');
  inner.classList.add('card-flip-inner');
  inner.style.width = '100%';
  inner.style.height = '100%';
  inner.style.position = 'relative';
  inner.style.transformStyle = 'preserve-3d';
  inner.style.transition = `transform ${duration}ms ease-in-out`;

  // Back face (visible initially)
  const backFace = createCardElement(card, false);
  backFace.classList.add('card-flip-face');
  backFace.style.width = '100%';
  backFace.style.height = '100%';
  backFace.style.position = 'absolute';
  backFace.style.backfaceVisibility = 'hidden';

  // Front face (hidden initially, revealed on flip)
  const frontFace = createCardElement(card, true);
  frontFace.classList.add('card-flip-face', 'card-flip-face-front');
  frontFace.style.width = '100%';
  frontFace.style.height = '100%';
  frontFace.style.position = 'absolute';
  frontFace.style.backfaceVisibility = 'hidden';
  frontFace.style.transform = 'rotateY(180deg)';

  inner.appendChild(backFace);
  inner.appendChild(frontFace);
  wrapper.appendChild(inner);
  layer.appendChild(wrapper);

  // Hide original
  sourceEl.style.opacity = '0';

  const dx = tgtCenter.x - srcCenter.x;
  const dy = tgtCenter.y - srcCenter.y;

  return new Promise((resolve) => {
    let flipTimeout;
    const safetyTimeout = setTimeout(() => {
      cleanup();
      resolve();
    }, duration + 200);

    function cleanup() {
      clearTimeout(safetyTimeout);
      clearTimeout(flipTimeout);
      if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
    }

    function onEnd(e) {
      if (e && e.target !== wrapper) return;
      wrapper.removeEventListener('transitionend', onEnd);
      cleanup();
      resolve();
    }

    wrapper.addEventListener('transitionend', onEnd);

    // Double rAF to trigger transitions
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        wrapper.style.transform = `translate(${dx}px, ${dy}px)`;
        // Flip at mid-flight
        flipTimeout = setTimeout(() => {
          inner.classList.add('flipped');
          inner.style.transform = 'rotateY(180deg)';
        }, duration / 2);
      });
    });
  });
}

/**
 * Fly a card-back element from sourceEl to targetEl.
 * @param {HTMLElement} sourceEl
 * @param {HTMLElement} targetEl
 * @param {object}      opts
 * @param {number}      [opts.duration=250]
 * @returns {Promise<void>}
 */
export function flyCardBack(sourceEl, targetEl, opts = {}) {
  if (prefersReducedMotion()) return Promise.resolve();

  const layer = getLayer();
  if (!layer || !sourceEl || !targetEl) return Promise.resolve();

  const duration = opts.duration ?? 250;

  const isMobile = window.innerWidth < 600;
  const isSmall = window.innerWidth < 380;
  const cardW = isSmall ? 58 : (isMobile ? 68 : 88);
  const cardH = isSmall ? 87 : (isMobile ? 102 : 132);

  const srcRect = sourceEl.getBoundingClientRect();
  const tgtRect = targetEl.getBoundingClientRect();
  const srcCenter = rectCenter(srcRect);
  const tgtCenter = rectCenter(tgtRect);

  // Build card-back element
  const back = document.createElement('div');
  back.classList.add('card', 'card-back', 'card-flight');
  back.style.position = 'fixed';
  back.style.left = (srcCenter.x - cardW / 2) + 'px';
  back.style.top = (srcCenter.y - cardH / 2) + 'px';
  back.style.width = cardW + 'px';
  back.style.height = cardH + 'px';
  back.style.margin = '0';
  back.style.transition = `transform ${duration}ms ease-in-out`;
  back.style.zIndex = '10000';
  back.style.pointerEvents = 'none';

  const oval = document.createElement('div');
  oval.classList.add('card-back-oval');
  oval.textContent = 'UNO';
  back.appendChild(oval);

  layer.appendChild(back);

  const dx = tgtCenter.x - srcCenter.x;
  const dy = tgtCenter.y - srcCenter.y;

  return new Promise((resolve) => {
    const safetyTimeout = setTimeout(() => {
      cleanup();
      resolve();
    }, duration + 200);

    function cleanup() {
      clearTimeout(safetyTimeout);
      if (back.parentNode) back.parentNode.removeChild(back);
    }

    function onEnd(e) {
      if (e && e.target !== back) return;
      back.removeEventListener('transitionend', onEnd);
      cleanup();
      resolve();
    }

    back.addEventListener('transitionend', onEnd);

    // Double rAF to trigger the transition
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        back.style.transform = `translate(${dx}px, ${dy}px)`;
      });
    });
  });
}

/* ── existing animations ──────────────────────────────────────────── */

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

export function showActionFeedback(actionType) {
  const feedback = document.createElement('div');
  feedback.classList.add('action-feedback');

  switch (actionType) {
    case 'skip':
      feedback.textContent = '\u2298 \u05D3\u05D9\u05DC\u05D5\u05D2!';
      break;
    case 'reverse':
      feedback.textContent = '\u27F2 \u05D4\u05E4\u05D5\u05DA!';
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
