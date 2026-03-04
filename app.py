from flask import Flask, request, jsonify
import face_recognition
import numpy as np

app = Flask(__name__)

@app.route('/check', methods=['POST'])
def check_face():
    if 'register_image' not in request.files or 'login_image' not in request.files:
        return jsonify({"error": "Missing images"}), 400

    # Load the uploaded files
    reg_file = request.files['register_image']
    log_file = request.files['login_image']

    # Convert to face encodings (the math bit)
    image_1 = face_recognition.load_image_file(reg_file)
    image_2 = face_recognition.load_image_file(log_file)

    try:
        # Get face encodings for both
        encoding_1 = face_recognition.face_encodings(image_1)[0]
        encoding_2 = face_recognition.face_encodings(image_2)[0]

        # Compare faces
        # tolerance 0.6 is standard; lower (like 0.5) is stricter/safer
        results = face_recognition.compare_faces([encoding_1], encoding_2, tolerance=0.5)
        distance = face_recognition.face_distance([encoding_1], encoding_2)

        return jsonify({
            "match": bool(results[0]),
            "similarity_score": float(1 - distance[0]) # Higher means more similar
        })
    except IndexError:
        return jsonify({"error": "No face detected in one of the images"}), 422
      
if __name__ == '__main__':
    # Render provides a $PORT environment variable
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
