const { createLogger, transports, format } = require('winston');
const { combine, timestamp, printf } = format;

const logger = createLogger({
  format: combine(
    timestamp(),
    printf(info => {
      return `${info.timestamp} ${info.level}: ${info.message}`;
    })
  ),
  transports: [
    new transports.File({ filename: 'server.log' })
  ]
});

logger.info('Node Media Server is running');
logger.info(`RTMP server URL: rtmp://localhost:${config.rtmp.port}/live`);
logger.info(`HTTP server URL: http://localhost:${config.http.port}`);

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

nms.on('preConnect', (id, args) => {
  logger.info(`[NodeMediaServer] Client connected: ${id}`);
});

nms.on('postConnect', (id, args) => {
  logger.info(`[NodeMediaServer] Client connected: ${id}`);
});

nms.on('doneConnect', (id, args) => {
  logger.info(`[NodeMediaServer] Client disconnected: ${id}`);
});

nms.on('prePublish', (id, StreamPath, args) => {
  logger.info(`[NodeMediaServer] Stream published: ${StreamPath}`);
});

nms.on('donePublish', (id, StreamPath, args) => {
  logger.info(`[NodeMediaServer] Stream unpublished: ${StreamPath}`);
});

nms.on('donePlay', (id, StreamPath, args) => {
  logger.info(`[NodeMediaServer] Stream played: ${StreamPath}`);
});

nms.on('postPlay', (id, StreamPath, args) => {
  logger.info(`[NodeMediaServer] Stream stopped: ${StreamPath}`);
});

nms.run(() => {
  logger.info('Node Media Server is running');
  logger.info(`RTMP server URL: rtmp://localhost:${config.rtmp.port}/live`);
  logger.info(`HTTP server URL: http://localhost:${config.http.port}`);
});
