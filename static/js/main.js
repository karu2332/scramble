var socket = io();

const $main = document.getElementsByTagName('main')[0];

// dictionary of valid words
let dict = {};

// load in the dictionary
fetch('dict.txt')
  .then(r => r.text())
  .then(data => {
    data.trim().split('\n').forEach(function(word) {
      dict[word] = 1;
    });
    console.log(`${Object.keys(dict).length} words loaded`);
  });

const pointsByLength = {
  3: 2,
  4: 3,
  5: 5,
  6: 10,
  7: 15
};

// game state
let gameRound = 0;
let gameClock = 0;
let gameWordsFound = {};
let gameTotalPoints = 0;

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

// provides letters for the round
socket.on('letters', function(letters) {
  console.log(`event: letters: ${letters}`);
  // update the game page to start round

  // create the inputSeven widget
  inputSeven('game-input', letters, (word) => {
    if (word != "") {
      wordEntered(word);
    }
  });
  // start game clock
  gameClock = 30;
  setTimeout(clockTick, 1000);
});

function pad(t) {
  if (t < 10) {
    return '0' + t;
  } else {
    return t;
  }
}

function clockTick() {
  const $clock = document.getElementById('clock');
  gameClock--;
  $clock.innerHTML = `:${pad(gameClock)}`;
  if (gameClock > 0) {
      setTimeout(clockTick, 1000);
  } else {
    // timer expired
    const $expired = document.getElementById('time-expired');
    $expired.style.opacity = 1;
    setTimeout(function() {
      socket.emit('total', gameTotalPoints);
    }, 2000);
  }
}

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

// called when a word is guessed
function wordEntered(word) {
  console.log(`word entered: ${word}`);
  if (word.length < 3) {
    badWord('Word too short!');
  } else if (gameWordsFound[word]) {
    badWord('Word already found!');
  } else if (dict[word]) {
    gameWordsFound[word] = 1;
    goodWord(word);
  } else {
    badWord('Word not found!');
  }
}

// display message in 'game-feedback'
function badWord(msg) {
  const $feedback = document.getElementById('game-feedback');
  $feedback.innerHTML = msg;
}

function goodWord(word) {
  const $feedback = document.getElementById('game-feedback');
  const $wordsFound = document.getElementById('words-found');
  const $wordsFoundLabel = document.getElementById('words-found-label');
  const points = pointsByLength[word.length];
  const nWords = Object.keys(gameWordsFound).length;
  $feedback.innerHTML = `<span class="fade-away">${points} points!</span>`;
  gameTotalPoints += points;
  $wordsFound.innerHTML = Object.keys(gameWordsFound).sort().join(' ');
  if (nWords === 1) {
    $wordsFoundLabel.innerHTML = `1 word found (${gameTotalPoints} points)`;
  } else {
    $wordsFoundLabel.innerHTML = `${nWords} words found (${gameTotalPoints} points)`;
  }
}

// with lots of tapping on the input circle going on,
// prevent double-tap-zoom.
document.addEventListener('dblclick', function(event) {
  event.preventDefault();
}, { passive: false });
