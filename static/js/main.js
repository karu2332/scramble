var socket = io();

const $main = document.getElementsByTagName('main')[0];

// game state
let gameRound = 0;

// we have defined an event main that replaces the html in <main>...</main>
socket.on('main', function(html) {
  console.log('event: main');
  $main.innerHTML = html;
  addListeners();
});

// this updates the current list of players
socket.on('players', function(players) {
  console.log(`event: players: ${players}`);
  const $players = document.getElementById('players');
  if ($players) {
    let html = "";
    for (const name of players) {
      html += `<div class="player-name">${name}</div>`;
    }
    $players.innerHTML = html;
  }
});

// updates the round number
socket.on('round', function(round) {
  console.log(`event: round: ${round}`);
  gameRound = round;
  const $round = document.getElementById('round');
  if ($round) {
    $round.innerHTML = round;
  }
});

// after the main html has been replaced, add any remaining event listeners that apply
function addListeners() {
  // listen for clicks on the start button
  const $start = document.getElementById('start');
  if ($start) {
    $start.addEventListener('click', (e) => {
      e.preventDefault();
      socket.emit('start', '');
    });
  }
  // listen for changes on the name input field
  const $name = document.getElementById('name');
  if ($name) {
    $name.addEventListener('change', (e) => {
      e.preventDefault();
      socket.emit('username', $name.value);
    });
  }
  // listen for clicks on the begin round button
  const $ready = document.getElementById('ready');
  if ($ready) {
    $ready.addEventListener('click', (e) => {
      e.preventDefault();
      socket.emit('ready', gameRound);
    });
  }
}
