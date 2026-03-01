// UI rendering and DOM manipulation

export function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.add('hidden');
  });
  const target = document.getElementById(screenId);
  if (target) {
    target.classList.remove('hidden');
  }
}

export function renderHand(hand, containerId) {
  // TODO: implement
}

export function renderBotHand(cardCount, containerId) {
  // TODO: implement
}

export function renderDiscardPile(card) {
  // TODO: implement
}

export function updateTurnMessage(message) {
  // TODO: implement
}

export function updateDirectionIndicator(direction) {
  // TODO: implement
}

export function showColorPicker() {
  // TODO: implement
}

export function hideColorPicker() {
  // TODO: implement
}

export function showEndScreen(message) {
  // TODO: implement
}
