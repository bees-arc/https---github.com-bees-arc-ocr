import cv2
import numpy as np
import pytest
from pathlib import Path
from app.providers.quality_provider import assess_image_quality
from app.providers.compare_provider import compare_face_images
from app.core.config import resolve_storage_path

def test_assess_image_quality_sharp():
    # Create sharp synthetic gradient image
    img = np.zeros((200, 300, 3), dtype=np.uint8)
    for i in range(0, 300, 10):
        img[:, i:i+5] = 255
    _, enc = cv2.imencode(".jpg", img)
    result = assess_image_quality(enc.tobytes())
    assert result["status"] == "PASS"
    assert result["blurScore"] > 80.0

def test_assess_image_quality_blurry():
    # Create uniform blurry image
    img = np.full((200, 300, 3), 120, dtype=np.uint8)
    _, enc = cv2.imencode(".jpg", img)
    result = assess_image_quality(enc.tobytes())
    assert result["status"] == "FAIL"
    assert "IMAGE_BLURRY" in result["warnings"]

def test_path_traversal_prevention():
    with pytest.raises(ValueError):
        resolve_storage_path("../../etc/passwd")

    with pytest.raises(ValueError):
        resolve_storage_path("sub/dir/test.jpg")

def test_compare_face_images(tmp_path):
    img = np.zeros((150, 150, 3), dtype=np.uint8)
    img[30:120, 30:120] = 200
    p1 = tmp_path / "face1.jpg"
    p2 = tmp_path / "face2.jpg"
    cv2.imwrite(str(p1), img)
    cv2.imwrite(str(p2), img)

    result = compare_face_images(p1, p2, threshold=0.65)
    assert result["status"] == "PASS"
    assert result["score"] >= 0.99
    assert result["scoreType"] == "COSINE_SIMILARITY"
