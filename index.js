const NodeMediaServer = require('node-media-server');

const config = {
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
  },
  http: {
    port: 8000,
    allow_origin: '*'
  }
};

var nms = new NodeMediaServer(config);

// // Function to redirect console logs to the document
// function redirectConsoleToDocument() {
//   const originalConsoleLog = console.log;
//   console.log = function (message) {
//     document.write(`<p>${message}</p>`);
//     originalConsoleLog.apply(console, arguments);
//   };
// }

// // Redirect console logs to the document
// redirectConsoleToDocument();

nms.on('preConnect', (id, args) => {
  console.log(`[NodeMediaServer] Client connected: ${id}`);
});

nms.on('postConnect', (id, args) => {
  console.log(`[NodeMediaServer] Client connected: ${id}`);
});

nms.on('doneConnect', (id, args) => {
  console.log(`[NodeMediaServer] Client disconnected: ${id}`);
});

nms.on('prePublish', (id, StreamPath, args) => {
  console.log(`[NodeMediaServer] Stream published: ${StreamPath}`);
});

nms.on('donePublish', (id, StreamPath, args) => {
  console.log(`[NodeMediaServer] Stream unpublished: ${StreamPath}`);
});

nms.on('donePlay', (id, StreamPath, args) => {
  console.log(`[NodeMediaServer] Stream played: ${StreamPath}`);
});

nms.on('postPlay', (id, StreamPath, args) => {
  console.log(`[NodeMediaServer] Stream stopped: ${StreamPath}`);
});

nms.run(() => {
  console.log('Node Media Server is running');
  console.log(`RTMP server URL: rtmp://localhost:${config.rtmp.port}/live`);
  console.log(`HTTP server URL: http://localhost:${config.http.port}`);
});
