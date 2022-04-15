const fs = require('fs');
const ejs = require('ejs');
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

// game state
let gamePlayers = {};
let gameRound = 1;
let gameLetters = [];
let gameWordChoices = [];
let gameScores = {};

loadWordChoices();

app.use('/css', express.static(__dirname + '/static/css'));

app.use('/js', express.static(__dirname + '/static/js'));

app.use('/img', express.static(__dirname + '/static/img'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/static/index.html');
});

app.get('/dict.txt', (req, res) => {
  res.sendFile(__dirname + '/static/dict.txt');
});

// handles connection from browsers
io.on('connection', (socket) => {
  console.log('got a new connection!');

  // just connected, the first thing that the server sends to the client
  sendMain(socket, 'instructions');

  socket.on('start', (msg) => {
    console.log('event: start');
    sendMain(socket, 'username');
  });
  socket.on('username', (name) => {
    // sanitize name
    name = name.replace(/[^a-z0-9_!@#$^*()=+:.-]/ig, '_')
      .replace(/_+/g, '_')
      .replace(/(.{15}).*/, '$1');
    console.log(`event: username: ${name}`);
    gamePlayers[socket.id] = name;
    scoreAddPlayer(name);
    sendMain(socket, 'players', {round: gameRound});
    // broadcast the updated list of players
    io.emit('players', Object.values(gamePlayers));
    io.emit('round', gameRound);
  });
  // handles disconnects
  socket.on('disconnect', () => {
    const name = gamePlayers[socket.id];
    console.log(`user disconnect: ${name}`);
    delete(gamePlayers[socket.id]);
    // broadcast the updated list of players
    io.emit('players', Object.values(gamePlayers));
    // if all players have disconnected, reset game
    if (Object.keys(gamePlayers).length === 0) {
      gamePlayers = {};
      gameRound = 1;
      gameLetters = [];
      gameScores = {};
    }
  });
  socket.on('ready', (round) => {
    console.log(`event: ready round: ${round}`);
    if (round < gameRound) {
      // duplicate click from previous round - ignore
      return;
    }
    // this round has started, gameRound reflects the next round
    gameRound++;
    sendMain(io, 'game');
    // pick letters for this round
    gameLetters = chooseLetters();
    // broadcast all letters to players
    io.emit('letters', gameLetters);
  });
  socket.on('total', (results) => {
    console.log(`event: total points: ${results.total} for round ${results.round}`);
    const name = gamePlayers[socket.id];
    if (name) {
      scoreAddRound(name, results.round, results.total);
      console.table(gameScores);
      sendMain(socket, 'stats', { round: results.round });
      // broadcast to everyone the updated scores
      io.emit('scores', scoreTbody(results.round));
      io.emit('round', gameRound);
    }
  });
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});

  function sendMain(socket, page, data={}, options={}) {
    ejs.renderFile(`pages/${page}.ejs`, data, options, (err, str) => {
      if (err) {
        console.log(`ejs error on ${page}: ${err}`);
      } else {
        socket.emit('main', str);
      }
    });
  }

  function loadWordChoices() {
    try {
      const data = fs.readFileSync('seven.txt', 'utf8');
      gameWordChoices = data.trim().split('\n');
      console.log(`${gameWordChoices.length} word choices`);
    } catch (err) {
      console.error(err);
    }
  }

  function chooseLetters() {
    const word = gameWordChoices[Math.floor(Math.random() * gameWordChoices.length)];
    console.log(`chose word: ${word}`);
    let letters = [];
    for (const c of word) {
      letters.push(c);
    }
    letters.sort();
    return letters;
  }

  function scoreAddPlayer(player) {
      if (!gameScores[player]) {
          gameScores[player] = [];
      }
  }

  function scorePlayers() {
      return Object.keys(gameScores);
  }

  function scoreAddRound(player, round, score) {
      gameScores[player][round] = score;
  }

  function scoreGetRound(player, round) {
      return gameScores[player][round];
  }

  function scoreGetTotal(player) {
      let total = 0;
      gameScores[player].forEach((score) => {
          total += score;
      });
      return total;
  }

  function scoreTbody(round) {
      let tbodyList = [];
      let maxRound = 0;
      let maxTotal = 0;
      for (const player of scorePlayers()) {
          const playerRound = scoreGetRound(player, round);
          if (playerRound > maxRound) {
              maxRound = playerRound;
          }
          const playerTotal = scoreGetTotal(player);
          if (playerTotal > maxTotal) {
              maxTotal = playerTotal;
          }
          tbodyList.push({
              'name': player,
              'round': playerRound,
              'total': playerTotal,
          });
      }
      tbodyList.sort((a, b) => {
          return b.total - a.total;
      });

      let html = '';
      for (const line of tbodyList) {
          html += '<tr>';
          html += `<td>${line.name}</td>`;
          if (line.round === undefined) {
            html += `<td>&hellip;</td>`;
          } else if (line.round === maxRound) {
              html += `<td><mark>${line.round}</mark></td>`;
          } else {
              html += `<td>${line.round}</td>`;
          }
          if (line.total === maxTotal) {
              html += `<td><mark>${line.total}</mark></td>`;
          } else {
              html += `<td>${line.total}</td>`;
          }
          html += '</tr>';
      }

      return html;
  }
