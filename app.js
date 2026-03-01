const app = document.getElementById('app');

const colors = ['red', 'green', 'blue', 'yellow'];
const specialCards = ['skip', 'reverse', 'drawtwo', 'wild', 'wilddrawfour'];
const hebrewNumbers = ['אחד', 'שתיים', 'שלוש', 'ארבע', 'חמש', 'שש', 'שבע', 'שמונה', 'תשע'];

function createCard(color, number) {
  const card = document.createElement('div');
  card.classList.add('card');
  card.style.backgroundColor = color;
  card.textContent = number;
  app.appendChild(card);
}

function initGame() {
  colors.forEach(color => {
    hebrewNumbers.forEach(number => {
      createCard(color, number);
    });
    specialCards.forEach(special => {
      createCard(color, special);
    });
  });
  specialCards.slice(3).forEach(special => {
    createCard('black', special);
  });
}

initGame();
