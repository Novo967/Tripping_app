import os
import time
from datetime import datetime
import uuid
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from sqlalchemy import create_engine, Column, Integer, String, Text, ARRAY, Float, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

# Import Pillow and pillow_heif for image processing
from PIL import Image
import pillow_heif

# Register HEIF opener with Pillow
pillow_heif.register_heif_opener()
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
    username = Column(String)
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
class Pin(Base):
    __tablename__ = 'pins'

    id = Column(Integer, primary_key=True, autoincrement=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    event_date = Column(DateTime, nullable=False)
    username = Column(String, nullable=False)
    event_title = Column(String, nullable=False)
    event_type = Column(String, nullable=False)
    description = Column(String, nullable=True)
    location = Column(String, nullable=True)
    def to_dict(self):
        return {
            "id": self.id,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "event_date": self.event_date.isoformat(), # חשוב להמיר לתאריך בפורמט ISO
            "username": self.username,
            # וודא שכל השדות החדשים כלולים כאן:
            "event_title": self.event_title,
            "event_type": self.event_type,
            "description": self.description,
            "location": self.location,
        }
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

@app.route('/register-user', methods=['POST'])
def register_user():
    data = request.get_json()
    uid = data.get('uid')
    email = data.get('email')
    username = data.get('username')

    if not uid or not email or not username:
        return jsonify({'error': 'Missing data'}), 400

    session = Session()
    try:
        existing_user = session.query(User).filter_by(uid=uid).first()
        if existing_user:
            return jsonify({'message': 'User already exists'}), 200

        new_user = User(
            id=str(uuid.uuid4()),  # או id=uid אם זה מספיק לך
            uid=uid,
            username=username
        )
        session.add(new_user)
        session.commit()
        return jsonify({'message': 'User registered successfully'}), 200
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

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
    try:
        user = session.query(User).filter_by(uid=uid).first()
        if not user:
            user = User(uid=uid)
        if profile_image is not None:
            user.profile_image = profile_image
        session.add(user)

        session.commit()
        return jsonify({'status': 'success'})
    finally:
      session.close()
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

    # Create a unique filename for the processed image (always .jpg)
    base_filename = os.path.splitext(secure_filename(file.filename))[0]
    output_filename = f"{uid}_{image_type}_{int(time.time())}_{base_filename}.jpg"
    output_filepath = os.path.join(app.config['UPLOAD_FOLDER'], output_filename)

    try:
        # Load the image using Pillow. Pillow can handle various formats including HEIC if pillow_heif is registered.
        # file.stream is a file-like object
        img = Image.open(file.stream)

        # Convert to RGB if needed (some images might be in RGBA, P, etc. which JPG doesn't handle well)
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')

        # Save the image as JPEG
        # Use 'quality' for compression (85 is a good balance)
        # Use 'optimize=True' for better file size
        img.save(output_filepath, "jpeg", optimize=True, quality=85)

        # Construct the URL for the saved image
        timestamp = int(time.time()) # Re-use timestamp for cache-busting
        image_url = f"https://tripping-app.onrender.com/uploads/{output_filename}?v={timestamp}"

        # Update database
        session = Session()
        user = session.query(User).filter_by(uid=uid).first()
        if not user:
            # If user doesn't exist, create it (assuming id and uid are the same here)
            user = User(id=uid, uid=uid, username=f"User_{uid[:8]}", profile_image="")
            session.add(user)
            session.commit() # Commit new user first if it's new

        if image_type == 'profile':
            user.profile_image = image_url
        else: # gallery image
            gallery_image = GalleryImage(uid=uid, image_url=image_url, uploaded_at=datetime.utcnow())
            session.add(gallery_image)

        session.commit()
        return jsonify({'url': image_url})

    except Exception as e:
        session.rollback()
        print(f"🔥 Error processing or saving image: {e}")
        import traceback
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

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
    try:
        users = session.query(User).all()
        response = {
            'users': [
                {
                    'uid': user.uid,
                    'latitude': user.latitude,
                    'longitude': user.longitude,
                    'profile_image': user.profile_image or '',
                    'username': user.username or ''
                }
                for user in users if user.latitude and user.longitude
            ]
        }
        return jsonify(response)
    finally:
        session.close()
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
    try:
        user = session.query(User).filter_by(uid=uid).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        gallery_urls = [image.image_url for image in user.gallery_images]

        return jsonify({
            'username': user.username,
            'profile_image': user.profile_image,
            'gallery_images': gallery_urls
        })
    finally:
        session.close()
@app.route('/add-pin', methods=['POST'])
def add_pin():
    data = request.get_json()

    try:
        new_pin = Pin(
            latitude=data['latitude'],
            longitude=data['longitude'],
            event_date=datetime.fromisoformat(data['event_date']),
            username=data['username'],
            event_title=data.get('event_title', ''),  # ✅ נוספו השדות
            event_type=data.get('event_type', ''),
            description=data.get('description', ''),
            location=data.get('location', '')
        )
        session=Session()
        session.add(new_pin)
        session.commit()

        return jsonify({"success": True, "pin": new_pin.to_dict()}), 201
    except Exception as e:
        session.rollback()
        return jsonify({"success": False, "error": str(e)}), 400
    finally:
        session.close()
@app.route('/get-pins', methods=['GET'])
def get_pins():
    session = Session()
    try:
        pins = session.query(Pin).all()
        result = [{
            'id': pin.id,
            'latitude': pin.latitude,
            'longitude': pin.longitude,
            'event_date': pin.event_date.isoformat(),
            'username': pin.username,
            'event_title': pin.event_title,
            'event_type': pin.event_type,
        } for pin in pins]
        return jsonify({'pins': result})
    finally:
        session.close()
@app.route('/get-pin', methods=['GET'])
def get_pin():
    pin_id = request.args.get('id')
    if not pin_id:
        return jsonify({'error': 'Missing pin ID'}), 400

    session = Session()
    pin = session.query(Pin).filter_by(id=pin_id).first()
    session.close()

    if pin:
        return jsonify({
            'pin': {
                'id': pin.id,
                'latitude': pin.latitude,
                'longitude': pin.longitude,
                'event_date': pin.event_date.isoformat(),
                'username': pin.username,
                'event_title': pin.event_title,
                'event_type': pin.event_type,
                'description': pin.description,
                'location': pin.location,
            }
        })
    else:
        return jsonify({'error': 'Pin not found'}), 404

@app.route('/delete-image', methods=['POST'])
def delete_image():
    data = request.get_json()
    uid = data.get('uid')
    image_url = data.get('image_url')

    if not uid or not image_url:
        return jsonify({'error': 'Missing uid or image_url'}), 400

    session = Session()

    try:
        # מחיקת רשומת התמונה מה־DB
        image = session.query(GalleryImage).filter_by(uid=uid, image_url=image_url).first()
        if image:
            session.delete(image)
            session.commit()
        else:
            return jsonify({'error': 'Image not found in database'}), 404

        # מחיקת הקובץ מהתיקייה הפיזית (אם קיים)
        filename = image_url.split('/')[-1]
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)

        if os.path.exists(filepath):
            os.remove(filepath)

        return jsonify({'success': True})
    except Exception as e:
        session.rollback()
        print(e)
        return jsonify({'error': 'Server error'}), 500
    finally:
        session.close()

# ----------------------------
# 🚀 Run locally
# ----------------------------
if __name__ == '__main__':
    app.run(debug=True)
