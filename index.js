const express = require('express');
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const app = express();
const cors = require('cors');
const server = http.createServer(app);
const io = require('socket.io')(server);
const  NodeMediaServer  = require('node-media-server');
// Allow all origins
app.use(cors());

const config = {
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 60,
    ping_timeout: 30,
    allow_origin: '*'
  },
  http: {
    port: 5000,
    allow_origin: '*'
  },
};

const nms = new NodeMediaServer(config);
nms.run();

nms.on('prePublish', (id, StreamPath, args) => {
  console.log('[NodeEvent on prePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
});

nms.on('donePublish', (id, StreamPath, args) => {
  console.log('[NodeEvent on donePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
});

console.log('Node Media Server started');
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    console.log('Client connected');

    let ffmpegProcess;

    socket.on('binarystream', (data) => {
        // console.log('Received binary data from client');

        if (!ffmpegProcess) {
          const ffmpegOptions = [
            '-i', '-', // Input from stdin
              '-c:v', 'libx264',
              '-preset', 'ultrafast',
              '-tune', 'zerolatency',
              '-r', '25',
              '-g', '50',
              '-keyint_min', '25',
              '-crf', '25',
              '-pix_fmt', 'yuv420p',
              '-sc_threshold', '0',
              '-profile:v', 'main',
              '-level', '3.1',
              '-c:a', 'aac',
              '-b:a', '128k',
              '-ar', '32000',
              '-f', 'flv', // Output format for RTMP
              'rtmp://localhost:1935/live/hamza', // RTMP server URL, replace with actual server addr
          ];

            // const ffmpegOptions = [
            //     '-i',
            //     '-',
            //     '-c:v', 'libx264',
            //     '-preset', 'ultrafast',
            //     '-tune', 'zerolatency',
            //     '-r', `${25}`,
            //     '-g', `${25 * 2}`,
            //     '-keyint_min', '25',
            //     '-crf', '25',
            //     '-pix_fmt', 'yuv420p',
            //     '-sc_threshold', '0',
            //     '-profile:v', 'main',
            //     '-level', '3.1',
            //     '-c:a', 'aac',
            //     '-b:a', '128k',
            //     '-ar', Math.floor(128000 / 4),
            //     '-f', 'hls',
            //     '-hls_time', '2',
            //     '-hls_list_size', '3',
            //     '-hls_flags', 'delete_segments+program_date_time',
            //     '-start_number', '1',
            //     'public/output.m3u8', // HLS output path in public folder
            // ];

            ffmpegProcess = spawn('ffmpeg', ffmpegOptions);

            ffmpegProcess.stdout.on('data', (data) => {
                console.log(`ffmpeg stdout: ${data}`);
            });

            ffmpegProcess.stderr.on('data', (data) => {
                console.error(`ffmpeg stderr: ${data}`);
            });

            ffmpegProcess.on('close', (code) => {
                console.log(`ffmpeg process exited with code ${code}`);
            });
        }

        ffmpegProcess.stdin.write(data, (error) => {
            if (error) {
                console.error(`Error writing to ffmpeg stdin: ${error}`);
            }
        });
    });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Express server running at http://localhost:${PORT}`);
});
