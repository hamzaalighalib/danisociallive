const faceapi = require('@vladmandic/face-api');
const { createCanvas, Image } = require('@napi-rs/canvas');

// Monkey patching the environment so face-api thinks it's in a browser
const canvas = createCanvas(1, 1);
faceapi.env.monkeyPatch({ Canvas: canvas.constructor, Image });

const loadModels = async () => {
    // Using your own repo or the official weights
    const modelPath = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
    if (!faceapi.nets.tinyFaceDetector.params) await faceapi.nets.tinyFaceDetector.loadFromUri(modelPath);
    if (!faceapi.nets.faceRecognitionNet.params) await faceapi.nets.faceRecognitionNet.loadFromUri(modelPath);
    if (!faceapi.nets.faceLandmark68Net.params) await faceapi.nets.faceLandmark68Net.loadFromUri(modelPath);
};

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: "Use POST" });

    try {
        await loadModels();
        const { image } = req.body; 
        
        const img = new Image();
        img.src = Buffer.from(image.split(',')[1], 'base64');

        const detections = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
                                        .withFaceLandmarks()
                                        .withFaceDescriptor();

        if (!detections) return res.status(400).json({ error: "No face found" });

        return res.status(200).json({ descriptor: Array.from(detections.descriptor) });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
