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
  socket.on('chat message', (msg) => {
    console.log('message: ' + msg);
    io.emit('chat message', msg);
  });
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});
