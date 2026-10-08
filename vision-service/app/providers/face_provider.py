import uuid
from pathlib import Path
import cv2
import numpy as np

# Use OpenCV built-in Haar Cascade for frontal face detection
CASCADE_PATH = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
face_cascade = cv2.CascadeClassifier(CASCADE_PATH)

def extract_document_portrait(image_bytes: bytes, storage_dir: Path) -> dict:
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        return {"status": "NOT_FOUND", "portraitStorageKey": None}

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(60, 60))

    if len(faces) == 0:
        return {"status": "NOT_FOUND", "portraitStorageKey": None}
    elif len(faces) > 2:
        return {"status": "MULTIPLE_FACES", "portraitStorageKey": None}

    # Select the largest face bounding box
    best_face = max(faces, key=lambda rect: rect[2] * rect[3])
    x, y, w, h = best_face

    # Add margin around face
    h_pad = int(h * 0.15)
    w_pad = int(w * 0.15)
    y1 = max(0, y - h_pad)
    y2 = min(img.shape[0], y + h + h_pad)
    x1 = max(0, x - w_pad)
    x2 = min(img.shape[1], x + w + w_pad)

    cropped = img[y1:y2, x1:x2]

    storage_key = f"portrait-{uuid.uuid4().hex}.jpg"
    success, enc = cv2.imencode(".jpg", cropped)
    if success:
        from app.core.config import write_storage_bytes
        write_storage_bytes(storage_key, enc.tobytes())
    else:
        target_path = storage_dir / storage_key
        target_path.parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(target_path), cropped)

    return {"status": "FOUND", "portraitStorageKey": storage_key}
