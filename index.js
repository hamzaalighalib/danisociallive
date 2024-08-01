const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { spawn } = require('child_process');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors({ origin: '*' }))
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

let clients = [];
let ffmpeg = null;
let ffmpegRunning = false;

const startFFmpeg = () => {
  if (ffmpegRunning) return;

  ffmpegRunning = true;
  ffmpeg = spawn('ffmpeg', [
    '-i', 'pipe:0',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-tune', 'zerolatency',
    '-c:a', 'aac',
    '-f', 'hls',
    '-hls_time', '1',
    '-hls_list_size', '8',
    '-hls_flags', 'delete_segments+split_by_time',
    '-hls_segment_type', 'mpegts',
    '-hls_segment_filename', 'public/live/segment_%03d.ts',
    'public/live/output.m3u8'
  ]);

  ffmpeg.stdin.on('error', (e) => {
    console.error('FFmpeg stdin error:', e);
    stopFFmpeg();
  });

  ffmpeg.stderr.on('data', (data) => {
    console.error('FFmpeg stderr:', data.toString());
  });

  ffmpeg.on('close', (code) => {
    console.log('FFmpeg process closed with code', code);
    stopFFmpeg();
  });

  ffmpeg.on('error', (error) => {
    console.error('FFmpeg process error:', error);
    stopFFmpeg();
  });
};

const stopFFmpeg = () => {
  if (ffmpeg) {
    ffmpeg.stdin.end();
    ffmpeg.kill();
    ffmpeg = null;
    ffmpegRunning = false;
  }
};

wss.on('connection', (ws) => {
  clients.push(ws);
  console.log('New client connected');

  if (!ffmpeg) {
    startFFmpeg();
  }

  ws.on('message', (message) => {
    if (ffmpeg) {
      ffmpeg.stdin.write(message);
    }
  });

  ws.on('close', () => {
    clients = clients.filter(client => client !== ws);
    console.log('Client disconnected');

    if (clients.length === 0) {
      stopFFmpeg();
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

server.listen(3000, () => {
  console.log('Server is listening on port 3000');
});
