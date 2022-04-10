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
    console.log(`event: username: ${name}`);
    gamePlayers[socket.id] = name;
    sendMain(socket, 'players');
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
  socket.on('total', (points) => {
    console.log(`event: total points: ${points}`);
  });
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});

  function sendMain(socket, page) {
    ejs.renderFile(`pages/${page}.ejs`, (err, str) => {
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
