const ejs = require('ejs');
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.use('/css', express.static(__dirname + '/static/css'));

app.use('/js', express.static(__dirname + '/static/js'));

app.use('/img', express.static(__dirname + '/static/img'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/static/index.html');
});

io.on('connection', (socket) => {
  console.log('got a new connection!');

  // just connected, the first thing that the server sends to the client
  sendMain(socket, 'instructions');

  socket.on('start', (msg) => {
    console.log('event: start');
    sendMain(socket, 'username');
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
