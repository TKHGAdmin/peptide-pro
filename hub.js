// Game selector hub. Loads on boot, swaps in the chosen game's container.
(function () {
'use strict';

const hub = document.getElementById('gameHub');
const greenheart = document.getElementById('greenheartGame');
const soccer = document.getElementById('soccerGame');

function showHub() {
  hub.classList.remove('hidden');
  greenheart.classList.add('hidden');
  soccer.classList.add('hidden');
}
function play(game) {
  hub.classList.add('hidden');
  if (game === 'greenheart') {
    greenheart.classList.remove('hidden');
    if (window.Greenheart) {
      window.Greenheart.onReturnToHub = showHub;
      window.Greenheart.start();
    }
  } else if (game === 'soccer') {
    soccer.classList.remove('hidden');
    if (window.Soccer) window.Soccer.start(soccer, showHub);
  }
}

document.querySelectorAll('.gameCard').forEach(card => {
  card.addEventListener('click', () => play(card.dataset.game));
});

window.GameHub = { show: showHub, play };
})();
