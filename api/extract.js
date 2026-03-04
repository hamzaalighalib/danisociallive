const faceapi = require('@vladmandic/face-api');
const { createCanvas, Image } = require('@napi-rs/canvas');

// 1. Monkey patch the environment so face-api thinks it's in a browser
const canvas = createCanvas(1, 1);
faceapi.env.monkeyPatch({ Canvas: canvas.constructor, Image });

const modelPath = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

async function loadModels() {
    if (!faceapi.nets.tinyFaceDetector.params) await faceapi.nets.tinyFaceDetector.loadFromUri(modelPath);
    if (!faceapi.nets.faceRecognitionNet.params) await faceapi.nets.faceRecognitionNet.loadFromUri(modelPath);
    if (!faceapi.nets.faceLandmark68Net.params) await faceapi.nets.faceLandmark68Net.loadFromUri(modelPath);
}

export default async function handler(req, res) {
    // Handle GET for the landing page
    if (req.method === 'GET') {
        res.setHeader('Content-Type', 'text/html');
        return res.send(`
            <html>
                <body style="font-family:sans-serif; text-align:center; padding:50px;">
                    <h2>Face Descriptor Extractor</h2>
                    <p>Upload a photo to see the 128-number array (Landmarks)</p>
                    <input type="file" id="imageInput" accept="image/*">
                    <pre id="output" style="background:#eee; padding:20px; margin-top:20px; text-align:left; overflow:auto; max-height:400px;"></pre>
                    <script>
                        document.getElementById('imageInput').onchange = async (e) => {
                            const file = e.target.files[0];
                            const reader = new FileReader();
                            reader.onload = async () => {
                                document.getElementById('output').innerText = "Processing...";
                                const resp = await fetch('/api/extract', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ image: reader.result })
                                });
                                const data = await resp.json();
                                document.getElementById('output').innerText = JSON.stringify(data, null, 2);
                            };
                            reader.readAsDataURL(file);
                        };
                    </script>
                </body>
            </html>
        `);
    }

    // Handle POST for the API
    if (req.method === 'POST') {
        try {
            await loadModels();
            const { image } = req.body;
            if (!image) return res.status(400).json({ error: "No image provided" });

            const img = new Image();
            // Remove base64 header if present
            const base64Data = image.includes(',') ? image.split(',')[1] : image;
            img.src = Buffer.from(base64Data, 'base64');

            const detections = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
                                            .withFaceLandmarks()
                                            .withFaceDescriptor();

            if (!detections) return res.status(400).json({ error: "No face detected" });

            return res.status(200).json({ 
                status: "success",
                descriptor: Array.from(detections.descriptor) 
            });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }
}
