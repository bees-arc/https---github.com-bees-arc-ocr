import cv2
import numpy as np

def assess_image_quality(image_bytes: bytes) -> dict:
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        return {"status": "FAIL", "blurScore": 0.0, "glareDetected": False, "warnings": ["IMAGE_DECODE_FAILED"]}

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Blur detection via Laplacian variance
    laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    is_blurry = laplacian_var < 80.0

    # Glare detection via high luminance pixels (> 250)
    high_pixels = np.sum(gray >= 250)
    total_pixels = gray.size
    glare_ratio = float(high_pixels / total_pixels) if total_pixels > 0 else 0.0
    glare_detected = glare_ratio > 0.06

    status = "PASS"
    warnings = []
    if is_blurry:
        status = "FAIL"
        warnings.append("IMAGE_BLURRY")
    if glare_detected:
        if status != "FAIL":
            status = "WARNING"
        warnings.append("GLARE_DETECTED")

    return {
        "status": status,
        "blurScore": round(laplacian_var, 2),
        "glareDetected": glare_detected,
        "warnings": warnings
    }
