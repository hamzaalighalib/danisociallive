const faceapi = require('@vladmandic/face-api');
const { Canvas, Image } = require('canvas');

// Load models once when the server starts
const loadModels = async () => {
    const modelPath = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
    await faceapi.nets.tinyFaceDetector.loadFromUri(modelPath);
    await faceapi.nets.faceRecognitionNet.loadFromUri(modelPath);
    await faceapi.nets.faceLandmark68Net.loadFromUri(modelPath);
};

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

    try {
        await loadModels();
        const { image } = req.body; // Base64 string from your PHP site
        
        const img = new Image();
        img.src = image;

        const detections = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
                                        .withFaceLandmarks()
                                        .withFaceDescriptor();

        if (!detections) return res.status(400).json({ error: "No face detected" });

        // Return the 128-number array to your PHP site
        return res.status(200).json({ descriptor: Array.from(detections.descriptor) });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
