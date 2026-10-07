from pathlib import Path
import cv2
import numpy as np

def compare_face_images(portrait_path: Path, live_frame_path: Path, threshold: float = 0.65) -> dict:
    if not portrait_path.exists() or not live_frame_path.exists():
        return {
            "status": "ERROR",
            "score": None,
            "scoreType": "COSINE_SIMILARITY",
            "threshold": threshold,
            "provider": {"name": "opencv-cosine", "version": "1.0"},
            "warnings": ["IMAGE_FILE_NOT_FOUND"]
        }

    img1 = cv2.imread(str(portrait_path))
    img2 = cv2.imread(str(live_frame_path))

    if img1 is None or img2 is None:
        return {
            "status": "ERROR",
            "score": None,
            "scoreType": "COSINE_SIMILARITY",
            "threshold": threshold,
            "provider": {"name": "opencv-cosine", "version": "1.0"},
            "warnings": ["IMAGE_DECODE_FAILED"]
        }

    # Normalize to 128x128 grayscale for feature correlation
    gray1 = cv2.resize(cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY), (128, 128))
    gray2 = cv2.resize(cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY), (128, 128))

    # Standardize vectors
    vec1 = gray1.flatten().astype(np.float32)
    vec2 = gray2.flatten().astype(np.float32)

    norm1 = np.linalg.norm(vec1)
    norm2 = np.linalg.norm(vec2)

    if norm1 == 0 or norm2 == 0:
        return {
            "status": "FAIL",
            "score": 0.0,
            "scoreType": "COSINE_SIMILARITY",
            "threshold": threshold,
            "provider": {"name": "opencv-cosine", "version": "1.0"},
            "warnings": ["ZERO_NORM_VECTOR"]
        }

    cosine_similarity = float(np.dot(vec1, vec2) / (norm1 * norm2))
    passed = cosine_similarity >= threshold

    return {
        "status": "PASS" if passed else "FAIL",
        "score": round(cosine_similarity, 3),
        "scoreType": "COSINE_SIMILARITY",
        "threshold": threshold,
        "provider": {"name": "opencv-cosine", "version": "1.0"},
        "warnings": [] if passed else ["FACE_MISMATCH"]
    }
