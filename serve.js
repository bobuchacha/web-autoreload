const HTML_FOLDER = __dirname + "/html";
const HTTP_PORT = 8000;
const WEBSOCKET_PORT = 8001;

const static = require('node-static');
const file = new static.Server(HTML_FOLDER);
const WebSocket = require('ws');
const url = require("url");
const chokidar = require('chokidar');
const REFRESH_SCRIPT = `
var ws = new WebSocket("ws://127.0.0.1:8000/listener");
ws.onopen = ()=>console.log("opened");
ws.onmessage = (e)=>{
    if (e.data == 'changed') history.go(0)
}
`;

console.log('Starting mini web server');

// start development web server
const server = require('http').createServer(function (request, response) {
    request.addListener('end', function () {
        if(request.url == '/index.js') {
            response.writeHead(200, {
              'Content-Type': 'text/javascript',
              'Content-Length': REFRESH_SCRIPT.length
            }); 
            response.write(REFRESH_SCRIPT);
            response.end();
        }else
       file.serve(request, response);
    }).resume();
});

// create websocket for change bradcating
const wss1 = new WebSocket.Server({ noServer: true });
wss1.on('connection', function connection(ws) {
    ws.send("Welcome to mini web dev server")
});

// upgrade connection to websocket connection
server.on('upgrade', function upgrade(request, socket, head) {
    const pathname = url.parse(request.url).pathname;
    if (pathname === '/listener') {
      wss1.handleUpgrade(request, socket, head, function done(ws) {
        wss1.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
});

// start the web server
server.listen(HTTP_PORT);

// watch file change and set change signal to all connected listener
var watcher = chokidar.watch(HTML_FOLDER, {ignored: /^\./, persistent: true});

// once wather detects changes, it tell wws1 to send 'changed' message to all connected clients
watcher.on('all', function(){
    wss1.clients.forEach(client => {
        client.send('changed')
    })
});