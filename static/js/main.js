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
let gameRoundPoints = 0;
let gameLetters = [];

// we have defined an event main that replaces the html in <main>...</main>
socket.on('main', function(html) {
  console.log('event: main');
  $main.innerHTML = html;
  addListeners();
  addSummary();
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
});

// provides letters for the round
socket.on('letters', function(letters) {
  console.log(`event: letters: ${letters}`);
  // update the game page to start round
  gameLetters = letters;
  gameWordsFound = {};
  gameRoundPoints = 0;
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

socket.on('scores', function(html) {
  console.log('event: scores');
  const $tbody = document.getElementById('scores-tbody');
  if ($tbody) {
    $tbody.innerHTML = html;
  }
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
  if (gameClock >= 0) {
      if (gameClock < 10) {
          $clock.innerHTML = `<span class="low-time">:${pad(gameClock)}</span>`;
      } else {
          $clock.innerHTML = `:${pad(gameClock)}`;
      }
      setTimeout(clockTick, 1000);
  } else {
    // timer expired
    const $expired = document.createElement('div');
    $expired.classList.add('time-expired');
    $expired.innerHTML= `Time&nbsp;Expired!`;
    $main.appendChild($expired);
    setTimeout(function() {
      socket.emit('total', { round: gameRound, total: gameRoundPoints});
    }, 3000);
  }
}

// after the main html has been replaced, add any remaining event listeners that apply
function addListeners() {
  // Get the button that opens the modal
  const $modalButton = document.getElementsByClassName('modal-button')[0];
  if ($modalButton) {
    // Get the modal
    const $modal = document.getElementById('my-modal');
    $modalButton.addEventListener('click', (e) => {
      e.preventDefault();
      $modal.style.display = 'block';
    });
    // Get the <span> element that closes the modal
    var $close = document.getElementsByClassName('close')[0];
    $close.addEventListener('click', (e) => {
      e.preventDefault();
      $modal.style.display = 'none';
    });
    $modal.addEventListener('click', (e) => {
      if (e.target === $modal) {
        e.preventDefault();
        $modal.style.display = 'none';
      }
    });
  }

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

// fill in summary section if it exists
function addSummary() {
  const $summary = document.getElementById('summary');
  if ($summary) {
    const nWords = Object.keys(gameWordsFound).length;
    const allWords = findAllWords(gameLetters);
    const nPossible = allWords.length;
    let html = `<p>You found ${nWords} out of ${nPossible} <a class="modal-button" id="possible" href="#">possible words</a>.</p>`;
    const possiblePoints = calculatePoints(allWords);
    html += `<p>You scored ${gameRoundPoints} out of ${possiblePoints} possible points.</p>`;
    $summary.innerHTML = html;
    html = '';
    for (const word of allWords) {
      if (gameWordsFound[word]) {
        html += `<mark>${word}</mark> `;
      } else {
        html += `<span>${word}</span> `;
      }
    }
    const $modalBody = document.getElementsByClassName('modal-body')[0];
    $modalBody.innerHTML = html;
    addListeners();
  }
}

// calculates total possible points
function calculatePoints(words) {
  let total = 0;
  for (const word of words) {
    total += pointsByLength[word.length];
  }
  return total;
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
  $feedback.innerHTML = `<span class="fade-away">${msg}</span>`;
}

function goodWord(word) {
  const $feedback = document.getElementById('game-feedback');
  const $wordsFound = document.getElementById('words-found');
  const $wordsFoundLabel = document.getElementById('words-found-label');
  const points = pointsByLength[word.length];
  const nWords = Object.keys(gameWordsFound).length;
  $feedback.innerHTML = `<span class="fly-away">${points} points!</span>`;
  gameRoundPoints += points;
  const $word = document.createElement('div');
  $word.innerHTML = word;
  $wordsFound.appendChild($word);
  if (nWords === 1) {
    $wordsFoundLabel.innerHTML = `1 word found (${gameRoundPoints} points)`;
  } else {
    $wordsFoundLabel.innerHTML = `${nWords} words found (${gameRoundPoints} points)`;
  }
}

// find all words length 3-7 in dict using given letters
function findAllWords(letters) {
  let found = {};

  // helper function to recursively check combinations
  const tryAll = function(chars, maxLen, prefix) {
    if (maxLen === 0) {
      // end of recursion, reached max length
      if (dict[prefix]) {
        // combination is a valid word
        found[prefix] = 1;
      }
      return;
    }

    // for each possible character in chars
    for (let i = 0; i < chars.length; i++) {
      // fill in the slot with this character
      const word = prefix + chars[i];
      // remove it from the set of available characters
      var newChars = [...chars];
      newChars.splice(i, 1);
      // recursive call to select next character
      tryAll(newChars, maxLen - 1, word);
    }
  }

  // check all combinations length 3 through 7
  for (let len = 3; len < 8; len++) {
    tryAll(letters, len, '');
  }

  // sort by length and then alphabetically
  return Object.keys(found).sort((a, b) => {
    return a.length - b.length || a.localeCompare(b);
  });
}

// with lots of tapping on the input circle going on,
// prevent double-tap-zoom.
document.addEventListener('dblclick', function(event) {
  event.preventDefault();
}, { passive: false });
