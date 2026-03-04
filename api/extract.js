const faceapi = require('@vladmandic/face-api');
const { createCanvas, Image } = require('@napi-rs/canvas');
const path = require('path');

// 1. Setup the Canvas environment for Node.js
const canvas = createCanvas(1, 1); 
faceapi.env.monkeyPatch({ Canvas: canvas.constructor, Image });

// 2. Function to load models from your root 'models' folder
async function loadModels() {
    // process.cwd() points to the root of your project on Vercel
    const modelPath = path.join(process.cwd(), 'models');
    
    // Only load if not already loaded to save memory
    if (!faceapi.nets.tinyFaceDetector.params) {
        await faceapi.nets.tinyFaceDetector.loadFromDisk(modelPath);
    }
    if (!faceapi.nets.faceRecognitionNet.params) {
        await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);
    }
    if (!faceapi.nets.faceLandmark68Net.params) {
        await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
    }
}

export default async function handler(req, res) {
    // HANDLE GET: Show the Upload UI
    if (req.method === 'GET') {
        res.setHeader('Content-Type', 'text/html');
        return res.send(`
            <html>
                <head>
                    <title>Face Extractor - Hamza</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                </head>
                <body style="font-family:sans-serif; text-align:center; padding:20px; background:#f4f4f9;">
                    <div style="max-width:500px; margin:auto; background:white; padding:30px; border-radius:10px; box-shadow:0 2px 10px rgba(0,0,0,0.1);">
                        <h2>Face Data Extractor</h2>
                        <p>Select a photo to get the 128-bit descriptor</p>
                        <input type="file" id="imageInput" accept="image/*" style="display:block; width:100%; margin:20px 0;">
                        <div id="status" style="margin:10px; font-weight:bold; color:#555;"></div>
                        <pre id="output" style="background:#222; color:#0f0; padding:15px; border-radius:5px; text-align:left; overflow:auto; max-height:250px; font-size:11px; display:none;"></pre>
                    </div>

                    <script>
                        const imgInput = document.getElementById('imageInput');
                        const status = document.getElementById('status');
                        const output = document.getElementById('output');

                        imgInput.onchange = async (e) => {
                            const file = e.target.files[0];
                            if(!file) return;

                            const reader = new FileReader();
                            reader.onload = async () => {
                                status.innerText = "⏳ Processing Face... Please wait...";
                                status.style.color = "blue";
                                output.style.display = "none";

                                try {
                                    const resp = await fetch('/api/extract', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ image: reader.result })
                                    });
                                    
                                    const data = await resp.json();
                                    
                                    if(data.status === "success") {
                                        status.innerText = "✅ Success!";
                                        status.style.color = "green";
                                        output.innerText = JSON.stringify(data.descriptor, null, 2);
                                        output.style.display = "block";
                                    } else {
                                        status.innerText = "❌ Error: " + (data.error || "No face found");
                                        status.style.color = "red";
                                    }
                                } catch (err) {
                                    status.innerText = "❌ Server Error";
                                    status.style.color = "red";
                                }
                            };
                            reader.readAsDataURL(file);
                        };
                    </script>
                </body>
            </html>
        `);
    }

    // HANDLE POST: Process the image
    if (req.method === 'POST') {
        try {
            await loadModels();
            
            const { image } = req.body;
            if (!image) return res.status(400).json({ error: "No image provided" });

            // Create Image object from Base64
            const img = new Image();
            const base64Data = image.includes(',') ? image.split(',')[1] : image;
            img.src = Buffer.from(base64Data, 'base64');

            // Actual Face Detection
            const detections = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
                                            .withFaceLandmarks()
                                            .withFaceDescriptor();

            if (!detections) {
                return res.status(200).json({ status: "error", error: "No face detected" });
            }

            return res.status(200).json({ 
                status: "success",
                descriptor: Array.from(detections.descriptor) 
            });

        } catch (err) {
            console.error(err);
            return res.status(500).json({ status: "error", error: err.message });
        }
    }
}
