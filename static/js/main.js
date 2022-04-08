var socket = io();

const $main = document.getElementsByTagName('main')[0];

socket.on('main', function(html) {
  console.log('event: main');
  $main.innerHTML = html;
  addListeners();
});

function addListeners() {
  const $start = document.getElementById('start');
  if ($start) {
    $start.addEventListener('click', (e) => {
      e.preventDefault();
      socket.emit('start', '');
    });
  }
}
