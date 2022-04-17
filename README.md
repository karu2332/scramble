# Scramble
Scramble is a multi-player word game that utilizes various Node.js libraries,
such as Express.js, SOCKET.IO, and EJS.

## Node.js
Node.js is an open-source, cross-platform, back-end JavaScript runtime
environment that runs on the V8 engine and executes JavaScript code
outside a web browser.

### Installation
Navigate to [Node.js](https://nodejs.org/en/) and download the version
that is right for you.

## Express.js
Express.js is a back end web application framework for Node.js,
released as free and open-source software under the MIT License.

## SOCKET.IO
SOCKET.IO is a library that enables low-latency, bidirectional
and event-based communication between a client and a server. Below is a
basic example with SOCKET.IO:

*Server*
`import { Server } from "socket.io";

const io = new Server(3000);

io.on("connection", (socket) => {
  // send a message to the client
  socket.emit("hello from server", 1, "2", { 3: Buffer.from([4]) });

  // receive a message from the client
  socket.on("hello from client", (...args) => {
    // ...
  });
});`

*Client*
`import { io } from "socket.io-client";

const socket = io("ws://localhost:3000");

// send a message to the server
socket.emit("hello from client", 5, "6", { 7: Uint8Array.from([8]) });

// receive a message from the server
socket.on("hello from server", (...args) => {
  // ...
});`

## EJS
