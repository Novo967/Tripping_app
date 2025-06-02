from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
from sqlalchemy import create_engine, Column, Integer, String, Text, ARRAY
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# הגדרות בסיסיות
app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# הגדרת DB
DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://trippingappdb_user:mmH6sl3iPNTJyrVg9hfY2iQWLB8KK8gl@dpg-d0u17ge3jp1c73f7kk2g-a.oregon-postgres.render.com/trippingappdb')
engine = create_engine(DATABASE_URL)
Base = declarative_base()
Session = sessionmaker(bind=engine)

# מודל משתמש
class User(Base):
    __tablename__ = 'users'
    uid = Column('uid', String, primary_key=True)
    profile_image = Column(String)
Base.metadata.create_all(engine)

# ----------------------------
# 🔵 GET USER PROFILE
# ----------------------------
@app.route('/get-user-profile', methods=['POST'])
def get_user_profile():
    uid = request.json.get('uid')
    session = Session()
    user = session.query(User).filter_by(uid=uid).first()
    data = request.get_json()
    print("Received data:", data)
    if user:
        return jsonify({
            'profile_image': user.profile_image,
        })
    else:
        return jsonify({
            'profile_image': '',
        })

# ----------------------------
# 🟡 UPDATE USER PROFILE
# ----------------------------
@app.route('/update-user-profile', methods=['POST'])
def update_user_profile():
    data = request.get_json()
    profile_image = data.get('profile_image')
    print("Received data:", data)
    uid = data.get('uid')
    session = Session()
    user = session.query(User).filter_by(uid=uid).first()
    if not user:
        user = User(uid=uid)
    if profile_image is not None:
        user.profile_image = profile_image
    session.add(user)

    session.commit()
    return jsonify({'status': 'success'})

# ----------------------------
# 🔴 UPLOAD IMAGE (PROFILE / GALLERY)
# ----------------------------
@app.route('/upload-profile-image', methods=['POST'])
def upload_image():
    file = request.files.get('image')
    uid = request.form.get('uid')
    image_type = request.form.get('type')  # 'profile' or 'gallery'

    if not file or not uid:
        return jsonify({'error': 'Missing data'}), 400

    filename = secure_filename(f"{uid}_{image_type}_{file.filename}")
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)

    # יצירת URL גישה ציבורי (בהנחה שאתה משרת מ /uploads/<filename>)
    image_url = f"https://tripping-app.onrender.com/uploads/{filename}"
    session = Session()
    user = session.query(User).filter_by(uid=uid).first()
    if not user:
        user = User(uid=uid, profile_image=image_url)
    user.profile_image = image_url
    session.add(user)
    try:
        session.commit()
    except Exception as e:
        session.rollback()
        print(f"Commit failed: {e}")
        return jsonify({'error': str(e)}), 500
    return jsonify({'url': image_url})

# ----------------------------
# 🟢 Static file serving
# ----------------------------
@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# ----------------------------
# 🚀 Run locally
# ----------------------------
if __name__ == '__main__':
    app.run(debug=True)
