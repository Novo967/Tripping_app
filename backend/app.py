from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
import os

app = Flask(__name__)
UPLOAD_FOLDER = 'static/uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

import psycopg2
from dotenv import load_dotenv

load_dotenv()
import os

conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cursor = conn.cursor()


@app.route('/upload-profile-image', methods=['POST'])
def upload_image():
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400

    image = request.files['image']
    filename = secure_filename(image.filename)
    save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    image.save(save_path)

    # נניח שאתה מקבל את ה־uid מה-frontend
    uid = request.form.get('uid')

    # תוכל כאן לעדכן את מסד הנתונים עם הנתיב

    return jsonify({
        'message': 'Image uploaded successfully',
        'image_url': f'{request.host_url}{save_path}'
    })
