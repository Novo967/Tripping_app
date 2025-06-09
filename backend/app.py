from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
from sqlalchemy import create_engine, Column, Integer, String, Text, ARRAY
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import time
from sqlalchemy import ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy import Column, String, ForeignKey, DateTime
from datetime import datetime
import uuid
from sqlalchemy import Float 
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

    id = Column(String, primary_key=True)
    uid = Column(String(128), unique=True, nullable=False)
    profile_image = Column(String)
    latitude = Column(Float)  # ✅ נכון!
    longitude = Column(Float)  # אותו דבר
    gallery_images = relationship(
        'GalleryImage',
        back_populates='user',
        foreign_keys='GalleryImage.uid',
        primaryjoin='User.uid==GalleryImage.uid'
    )

class GalleryImage(Base):
    __tablename__ = 'gallery_images'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    uid = Column(String(128), ForeignKey('users.uid'), nullable=False)
    image_url = Column(String, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="gallery_images")

Base.metadata.create_all(engine)

# ----------------------------
# 🔵 GET USER PROFILE
# ----------------------------
@app.route('/get-user-profile', methods=['POST'])
def get_user_profile():
    data = request.get_json()
    print("Received data:", data)
    uid = data.get('uid') if data else None
    session = Session()
    user = session.query(User).filter_by(uid=uid).first()
    if user:
        response = {
            'profile_image': user.profile_image or '',
        }
    else:
        response = {'profile_image': ''}
    print("Response JSON:", response)
    return jsonify(response)


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
@app.route('/upload-image', methods=['POST'])
def upload_image():
    file = request.files.get('image')
    uid = request.form.get('uid')
    image_type = request.form.get('type')  # 'profile' or 'gallery'

    if not file or not uid:
        return jsonify({'error': 'Missing data'}), 400

    # שמירת הקובץ בשם קבוע לפי המשתמש והסוג
    import time
    filename = secure_filename(f"{uid}_{image_type}_{int(time.time())}_{file.filename}")
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)

    # הוספת timestamp ל-URL למניעת caching
    timestamp = int(time.time())
    image_url = f"https://tripping-app.onrender.com/uploads/{filename}?v={timestamp}"

    # עדכון במסד הנתונים
    session = Session()
    user = session.query(User).filter_by(uid=uid).first()
    if not user:
        user = User(id=uid, uid=uid, profile_image="")
        session.add(user)
        session.commit()
    if image_type =='profile':
        user.profile_image = image_url
        session.add(user)
    else:
        gallery_image = GalleryImage(uid=uid, image_url=image_url, uploaded_at=datetime.utcnow())
        session.add(gallery_image)
    

    
    try:
        session.commit()
    except Exception as e:
        session.rollback()
        print(f"Commit failed: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

    return jsonify({'url': image_url})
# ----------------------------
# 🟢 Static file serving
# ----------------------------
@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/upload-gallery-image', methods=['POST'])
def upload_gallery_image():
    data = request.json
    uid = data.get('uid')
    image_url = data.get('image_url')

    if not uid or not image_url:
        return jsonify({'error': 'Missing uid or image_url'}), 400

    session = Session()
    try:
        # ודא שהמשתמש קיים, ואם לא – צור אותו
        user = session.query(User).filter_by(id=uid).first()
        if not user:
            user = User(id=uid, uid=uid, profile_image="")
            session.add(user)
            session.commit()

        # הוסף את התמונה לגלריה
        new_image = GalleryImage(uid=uid, image_url=image_url, uploaded_at=datetime.utcnow())
        session.add(new_image)
        session.commit()

        return jsonify({'message': 'Image uploaded successfully'}), 200

    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500

    finally:
        session.close()
@app.route('/get-gallery', methods=['POST'])
def get_gallery():
    uid = request.json.get('uid')
    if not uid:
        return jsonify({'error': 'Missing uid'}), 400

    session = Session()
    try:
        images = session.query(GalleryImage).filter_by(uid=uid).all()
        urls = [img.image_url for img in images]   # [] אם אין תמונות
        return jsonify({'gallery': urls})
    except Exception as e:
        session.rollback()
        import traceback; print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@app.route('/get-all-users', methods=['GET'])
def get_all_users():
    session = Session()
    users = session.query(User).all()
    response = {
        'users': [
            {
                'uid': user.uid,
                'latitude': user.latitude,
                'longitude': user.longitude,
                'profile_image': user.profile_image or ''
            }
            for user in users if user.latitude and user.longitude
        ]
    }
    return jsonify(response)
@app.route('/update-user-location', methods=['POST'])
def update_user_location():
    data = request.get_json()
    uid = data.get('uid')
    lat = data.get('latitude')
    lng = data.get('longitude')

    session = Session()
    try:
        user = session.query(User).filter_by(uid=uid).first()
        if user:
            user.latitude = lat
            user.longitude = lng
            session.commit()
            return jsonify({'status': 'ok'})
        else:
            return jsonify({'error': 'User not found'}), 404
    except Exception as e:
        session.rollback()
        print('🔥 Error updating location:', e)
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()
@app.route('/get-other-user-profile', methods=['GET'])
def get_other_user_profile():
    uid = request.args.get('uid')
    if not uid:
        return jsonify({'error': 'uid is required'}), 400
    session = Session()
    user = session.query(User).filter_by(uid=uid).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    gallery_urls = [image.url for image in user.gallery]

    return jsonify({
        'username': user.username,
        'profile_image': user.profile_image,
        'gallery': gallery_urls
    })

# ----------------------------
# 🚀 Run locally
# ----------------------------
if __name__ == '__main__':
    app.run(debug=True)
