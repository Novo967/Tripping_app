import os
import time
from datetime import datetime
import uuid
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from sqlalchemy import create_engine, Column, Integer, String, Text, Float, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.dialects.postgresql import ARRAY as PG_ARRAY # ✅ ייבוא ARRAY עבור PostgreSQL

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
DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://trippingappdbnew_user:ks2QQdvcWfXPyr8yJ8r8gU1Ux2fLIuUi@dpg-d1ieg9jipnbc73bk80m0-a.oregon-postgres.render.com/trippingappdbnew')
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
    latitude = Column(Float)
    longitude = Column(Float)
    # ✅ הוספנו שדה ביו למודל המשתמש
    bio = Column(Text, nullable=True, default="")
    gallery_images = relationship(
        'GalleryImage',
        back_populates='user',
        foreign_keys='GalleryImage.uid',
        primaryjoin='User.uid==GalleryImage.uid'
    )
    # יחס חדש לבקשות נכנסות
    received_requests = relationship(
        'EventRequest',
        back_populates='receiver',
        foreign_keys='EventRequest.receiver_uid',
        primaryjoin='User.uid==EventRequest.receiver_uid'
    )
    # יחס חדש לבקשות יוצאות
    sent_requests = relationship(
        'EventRequest',
        back_populates='sender',
        foreign_keys='EventRequest.sender_uid',
        primaryjoin='User.uid==EventRequest.sender_uid'
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
    owner_uid = Column(String(128), ForeignKey('users.uid'), nullable=False)
    # ✅ שדה חדש: רשימת UID של משתמשים שאושרו לאירוע
    approved_users = Column(PG_ARRAY(String), default=[])

    def to_dict(self):
        return {
            "id": self.id,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "event_date": self.event_date.isoformat(),
            "username": self.username,
            "event_title": self.event_title,
            "event_type": self.event_type,
            "description": self.description,
            "location": self.location,
            "owner_uid": self.owner_uid,
            "approved_users": self.approved_users, # ✅ הוספנו את השדה ל-dict
        }

# מודל לבקשות הצטרפות לאירועים
class EventRequest(Base):
    __tablename__ = 'event_requests'
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    sender_uid = Column(String(128), ForeignKey('users.uid'), nullable=False)
    sender_username = Column(String, nullable=False)
    receiver_uid = Column(String(128), ForeignKey('users.uid'), nullable=False)
    event_id = Column(Integer, nullable=False) # מזהה הסיכה/אירוע
    event_title = Column(String, nullable=False)
    status = Column(String, default='pending') # 'pending', 'accepted', 'declined'
    timestamp = Column(DateTime, default=datetime.utcnow)

    sender = relationship("User", back_populates="sent_requests", foreign_keys=[sender_uid])
    receiver = relationship("User", back_populates="received_requests", foreign_keys=[receiver_uid])

    def to_dict(self):
        return {
            "id": self.id,
            "sender_uid": self.sender_uid,
            "sender_username": self.sender_username,
            "receiver_uid": self.receiver_uid,
            "event_id": self.event_id,
            "event_title": self.event_title,
            "status": self.status,
            "timestamp": self.timestamp.isoformat()
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
            'username': user.username or '',
            'bio': user.bio or '', # ✅ החזרת שדה ביו
        }
    else:
        response = {'profile_image': '', 'username': '', 'bio': ''}
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
            id=str(uuid.uuid4()),
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
    bio = data.get('bio')
    uid = data.get('uid')
    session = Session()
    try:
        user = session.query(User).filter_by(uid=uid).first()
        if not user:
            user = User(id=uid, uid=uid, username=f"User_{uid[:8]}")
            session.add(user)

        if profile_image is not None:
            user.profile_image = profile_image
        if bio is not None:
            user.bio = bio
        session.commit()
        return jsonify({'status': 'success'})
    except Exception as e:
        session.rollback()
        print(f"🔥 Error updating user profile: {e}")
        return jsonify({'error': str(e)}), 500
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

    base_filename = os.path.splitext(secure_filename(file.filename))[0]
    output_filename = f"{uid}_{image_type}_{int(time.time())}_{base_filename}.jpg"
    output_filepath = os.path.join(app.config['UPLOAD_FOLDER'], output_filename)

    try:
        img = Image.open(file.stream)
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')
        img.save(output_filepath, "jpeg", optimize=True, quality=85)

        timestamp = int(time.time())
        image_url = f"https://tripping-app.onrender.com/uploads/{output_filename}?v={timestamp}"

        session = Session()
        user = session.query(User).filter_by(uid=uid).first()
        if not user:
            user = User(id=uid, uid=uid, username=f"User_{uid[:8]}", profile_image="")
            session.add(user)
            session.commit()

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
        user = session.query(User).filter_by(id=uid).first()
        if not user:
            user = User(id=uid, uid=uid, profile_image="")
            session.add(user)
            session.commit()

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
        urls = [img.image_url for img in images]
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
    owner_uid = data.get('owner_uid')
    if not owner_uid:
        return jsonify({"success": False, "error": "Missing owner_uid"}), 400

    session = Session()
    try:
        new_pin = Pin(
            latitude=data['latitude'],
            longitude=data['longitude'],
            event_date=datetime.fromisoformat(data['event_date']),
            username=data['username'],
            event_title=data.get('event_title', ''),
            event_type=data.get('event_type', ''),
            description=data.get('description', ''),
            location=data.get('location', ''),
            owner_uid=owner_uid,
            approved_users=[] # ✅ אתחול רשימת המאושרים כריקה
        )
        session.add(new_pin)
        session.commit()

        return jsonify({"success": True, "pin": new_pin.to_dict()}), 201
    except Exception as e:
        session.rollback()
        print(f"🔥 Error adding pin: {e}")
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
            'description': pin.description,
            'location': pin.location,
            'owner_uid': pin.owner_uid,
            'approved_users': pin.approved_users, # ✅ החזרת approved_users
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
                'owner_uid': pin.owner_uid,
                'approved_users': pin.approved_users, # ✅ החזרת approved_users
            }
        })
    else:
        return jsonify({'error': 'Pin not found'}), 404

@app.route('/delete-pin', methods=['DELETE'])
def delete_pin():
    data = request.get_json()
    pin_id = data.get('id')

    if not pin_id:
        return jsonify({'error': 'Missing pin ID'}), 400

    session = Session()
    try:
        pin = session.query(Pin).filter_by(id=pin_id).first()
        if pin:
            session.delete(pin)
            session.commit()
            return jsonify({'message': f'Pin {pin_id} deleted successfully'}), 200
        else:
            return jsonify({'error': 'Pin not found'}), 404
    except Exception as e:
        session.rollback()
        print(f"🔥 Error deleting pin: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@app.route('/delete-image', methods=['POST'])
def delete_image():
    data = request.get_json()
    uid = data.get('uid')
    image_url = data.get('image_url')

    if not uid or not image_url:
        return jsonify({'error': 'Missing uid or image_url'}), 400

    session = Session()

    try:
        image = session.query(GalleryImage).filter_by(uid=uid, image_url=image_url).first()
        if image:
            session.delete(image)
            session.commit()
        else:
            return jsonify({'error': 'Image not found in database'}), 404

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
# רוטים לבקשות אירועים
# ----------------------------

@app.route('/send-event-request', methods=['POST'])
def send_event_request():
    data = request.get_json()
    sender_uid = data.get('sender_uid')
    sender_username = data.get('sender_username')
    receiver_uid = data.get('receiver_uid')
    event_id = data.get('event_id')
    event_title = data.get('event_title')

    if not all([sender_uid, sender_username, receiver_uid, event_id, event_title]):
        return jsonify({'error': 'Missing data for event request'}), 400

    session = Session()
    try:
        existing_request = session.query(EventRequest).filter_by(
            sender_uid=sender_uid,
            receiver_uid=receiver_uid,
            event_id=event_id,
            status='pending'
        ).first()

        if existing_request:
            return jsonify({'error': 'Request already sent and pending'}), 409 # Conflict

        new_request = EventRequest(
            sender_uid=sender_uid,
            sender_username=sender_username,
            receiver_uid=receiver_uid,
            event_id=event_id,
            event_title=event_title,
            status='pending'
        )
        session.add(new_request)
        session.commit()
        return jsonify({'message': 'Event request sent successfully', 'request': new_request.to_dict()}), 200
    except Exception as e:
        session.rollback()
        print(f"🔥 Error sending event request: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@app.route('/get-pending-event-requests', methods=['GET'])
def get_pending_event_requests():
    receiver_uid = request.args.get('receiver_uid')
    if not receiver_uid:
        return jsonify({'error': 'Missing receiver_uid'}), 400

    session = Session()
    try:
        requests = session.query(EventRequest).filter_by(
            receiver_uid=receiver_uid,
            status='pending'
        ).order_by(EventRequest.timestamp.desc()).all()
        
        return jsonify({'requests': [req.to_dict() for req in requests]}), 200
    except Exception as e:
        print(f"🔥 Error fetching pending event requests: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@app.route('/update-event-request-status', methods=['POST'])
def update_event_request_status():
    data = request.get_json()
    request_id = data.get('requestId')
    status = data.get('status') # 'accepted' or 'declined'

    if not all([request_id, status]) or status not in ['accepted', 'declined']:
        return jsonify({'error': 'Missing request ID or invalid status'}), 400

    session = Session()
    try:
        event_request = session.query(EventRequest).filter_by(id=request_id).first()
        if not event_request:
            return jsonify({'error': 'Event request not found'}), 404
        
        event_request.status = status
        
        # ✅ אם הבקשה אושרה, עדכן את רשימת המשתמשים המאושרים בפין
        if status == 'accepted':
            pin = session.query(Pin).filter_by(id=event_request.event_id).first()
            if pin:
                if event_request.sender_uid not in pin.approved_users:
                    pin.approved_users = pin.approved_users + [event_request.sender_uid] # הוספה לרשימה
                    # SQLAlchemy עם PG_ARRAY דורש הקצאה מחדש של הרשימה כדי לזהות שינוי
                else:
                    print(f"User {event_request.sender_uid} already approved for pin {pin.id}")
            else:
                print(f"Warning: Pin with ID {event_request.event_id} not found for request {request_id}")

        session.commit()
        return jsonify({'message': f'Request {request_id} status updated to {status}'}), 200
    except Exception as e:
        session.rollback()
        print(f"🔥 Error updating event request status: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

# ----------------------------
# 🚀 Run locally
# ----------------------------
if __name__ == '__main__':
    app.run(debug=True)
