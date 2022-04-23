const fs = require('fs');
const ejs = require('ejs');
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

// map of rooms- key is the room name and the value is the game state for that room
let rooms = {};
const roomLetters = 'bcdfghjkmnpqrstwxyz2346789';
// the key is the socket.id and the value is an obejct with room and name fields
let socketInfo = {};

// create a room code
function createRoom() {
  if (Object.keys(rooms).length > 5000) {
    console.log(`room limit reached`);
    return null;
  }
  for (let n = 0; n < 200; n++) {
    let room = '';
    for (let i = 0; i < 4; i++) {
      room += roomLetters[Math.floor(Math.random() * roomLetters.length)];
    }
    if (!rooms[room]) {
      return room;
    }
  }
  console.log(`no free rooms`);
  return null;
}

// game state
class Game {
  constructor(room) {
    this.room = room;
    this.players = {};
    this.round = 0;
    this.roundStart = new Date();
    this.letters = [];
    this.scores = {};
    this.firstPlayer = null;
  }
  addPlayer(name) {
    if (this.firstPlayer === null) {
      this.firstPlayer = name;
    }
    this.players[name] = true;
    if (!this.scores[name]) {
      this.scores[name] = [];
    }
  }
  removePlayer(name) {
    delete(this.players[name]);
  }
  allPlayers() {
    return Object.keys(this.players);
  }
  existingPlayer(name) {
    return this.players[name];
  }
  scorePlayers() {
      return Object.keys(this.scores);
  }

  scoreAddRound(player, round, score) {
      this.scores[player][round] = score;
  }

  scoreGetRound(player, round) {
      return this.scores[player][round];
  }

  scoreGetTotal(player) {
      let total = 0;
      this.scores[player].forEach((score) => {
          total += score;
      });
      return total;
  }

  scoreTbody(round) {
      let tbodyList = [];
      let maxRound = 0;
      let maxTotal = 0;
      for (const player of this.scorePlayers()) {
          const playerRound = this.scoreGetRound(player, round);
          if (playerRound > maxRound) {
              maxRound = playerRound;
          }
          const playerTotal = this.scoreGetTotal(player);
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
}

let wordChoices = [];
loadWordChoices();

app.use('/css', express.static(__dirname + '/static/css'));

app.use('/js', express.static(__dirname + '/static/js'));

app.use('/img', express.static(__dirname + '/static/img'));

// this is the url for a room
app.get(/^\/[a-zA-Z0-9]{4}$/, (req, res) => {
  const room = req.url.replace('/', '');
  console.log(`get room ${room}`);
  const roomLowerCase = room.toLowerCase();
  if (room != roomLowerCase) {
    res.redirect(`/${roomLowerCase}`);
  }
  if (rooms[room]) {
    res.sendFile(__dirname + '/static/index.html');
  } else {
    res.sendFile(__dirname + '/static/badroom.html');
  }
});

// this is the url for creating a new room
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/static/newroom.html');
});

// this is a request to create a new room
app.post('/', (req, res) => {
  console.log(`post /`);
  const room = createRoom();
  if (room) {
    rooms[room] = new Game(room);
    res.redirect(room);
  } else {
    res.sendFile(__dirname + '/static/noroom.html');
  }
});

app.get('/favicon.ico', (req, res) => {
  res.sendFile(__dirname + '/favicon.ico');
});

app.get('/dict.txt', (req, res) => {
  res.sendFile(__dirname + '/static/dict.txt');
});

// handles connection from browsers
io.on('connection', (socket) => {
  console.log('got a new connection!');

  // join room
  socket.on('join', (room) => {
    console.log(`event: join ${room}`);
    if (rooms[room]) {
      socket.join(room);
      socketInfo[socket.id] = {room: room, name: 'unknown'};
      sendMain(socket, 'instructions');
    } else {
      sendMain(socket, 'badroom');
    }
  });

  socket.on('start', (msg) => {
    if (!socketInfo[socket.id]) {
      // old left over socket
      console.log(`start: disconnect`);
      socket.disconnect();
      return;
    }
    console.log('event: start');
    sendMain(socket, 'username');
  });
  socket.on('username', (name) => {
    if (!socketInfo[socket.id]) {
      // old left over socket
      console.log(`username: disconnect`);
      socket.disconnect();
      return;
    }
    // sanitize name
    name = name.replace(/[^a-z0-9_!@#$^*()=+:.-]/ig, '_')
      .replace(/_+/g, '_')
      .replace(/(.{15}).*/, '$1');
    console.log(`event: username: ${name}`);
    const room = socketInfo[socket.id].room;
    const game = rooms[room];
    // check if name is already in use
    if (game.existingPlayer(name)) {
      socket.emit('error', 'Name is already in use.');
      return;
    }
    if (name.length < 2) {
      socket.emit('error', 'Name too short.');
      return;
    }
    socketInfo[socket.id].name = name;
    game.addPlayer(name);
    sendMain(socket, 'players', { nextRound: game.round + 1, player: name, firstPlayer: game.firstPlayer });
    // broadcast the updated list of players
    io.to(room).emit('players', game.allPlayers());

  });
  // handles disconnects
  socket.on('disconnect', () => {
    if (!socketInfo[socket.id]) {
      // old left over socket
      console.log(`disconnect: old socket`);
      return;
    }
    const { room, name } = socketInfo[socket.id];
    console.log(`user disconnect: ${name} from ${room}`);
    const game = rooms[room];
    if (game) {
      game.removePlayer(name);
      // broadcast the updated list of players
      io.to(room).emit('players', game.allPlayers());
    }
    delete(socketInfo[socket.id]);
  });
  socket.on('ready', (round) => {
    if (!socketInfo[socket.id]) {
      // old left over socket
      console.log(`ready: disconnect`);
      socket.disconnect();
      return;
    }
    const { room, name } = socketInfo[socket.id];
    const game = rooms[room];
    if (!game) {
      console.log(`ready: no game`);
      sendMain(socket, 'badroom');
      return;
    }
    console.log(`event: ready round: ${round} in room ${room}`);
    // start next round
    game.round++;
    game.roundStart = new Date();
    io.to(room).emit('round', game.round);
    sendMain(io.to(room), 'game');
    // pick letters for this round
    game.letters = chooseLetters();
    // broadcast all letters to players
    io.to(room).emit('letters', game.letters);
  });
  socket.on('end', (round) => {
    if (!socketInfo[socket.id]) {
      // old left over socket
      console.log(`end: disconnect`);
      socket.disconnect();
      return;
    }
    const { room, name } = socketInfo[socket.id];
    const game = rooms[room];
    if (!game) {
      console.log(`end: no game`);
      sendMain(socket, 'badroom');
      return;
    }
    console.log(`event: end`);
    // remove the room
    delete(rooms[room]);
    io.in(room).disconnectSockets();
  });
  socket.on('total', (results) => {
    if (!socketInfo[socket.id]) {
      // old left over socket
      console.log(`total: disconnect`);
      socket.disconnect();
      return;
    }
    const { room, name } = socketInfo[socket.id];
    const game = rooms[room];
    if (!game) {
      console.log(`total: no game`);
      sendMain(socket, 'badroom');
      return;
    }
    console.log(`event: total points: ${results.total} for round ${results.round}`);
    game.scoreAddRound(name, results.round, results.total);
    sendMain(socket, 'stats', { lastRound: results.round, player: name, firstPlayer: game.firstPlayer});
    // broadcast to everyone the updated scores
    io.to(room).emit('scores', game.scoreTbody(results.round));
  });
});

// check for expired rooms every minute
setInterval(function() {
  const roomList = Object.keys(rooms);
  if (roomList.length > 0) {
    const d = new Date();
    console.log(d.toLocaleString());
    for (const room of roomList) {
      const game = rooms[room];
      console.log(`${room} ${game.roundStart.toLocaleString()} ${game.round} ${Object.keys(game.players)}`);
      if (d - game.roundStart > 1000 * 60 * 60) {
        console.log(`expire: ${room}`);
        // expire the room
        delete(rooms[room]);
        io.in(room).disconnectSockets();
      }
    }
  }
}, 1000 * 60);

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
      wordChoices = data.trim().split('\n');
      console.log(`${wordChoices.length} word choices`);
    } catch (err) {
      console.error(err);
    }
  }

  function chooseLetters() {
    const word = wordChoices[Math.floor(Math.random() * wordChoices.length)];
    console.log(`chose word: ${word}`);
    let letters = [];
    for (const c of word) {
      letters.push(c);
    }
    letters.sort();
    return letters;
  }
