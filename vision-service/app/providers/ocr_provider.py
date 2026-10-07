import re
import cv2
import numpy as np
import pytesseract
from typing import Dict, Any, Tuple

OLD_NIC_REGEX = re.compile(r'\b\d{9}[vVxX]\b')
NEW_NIC_REGEX = re.compile(r'\b\d{12}\b')

def is_tesseract_available() -> bool:
    try:
        pytesseract.get_tesseract_version()
        return True
    except Exception:
        return False

def extract_nic_text(image_bytes: bytes, scripts: list[str]) -> Tuple[Dict[str, Any], str, list[str]]:
    warnings = []
    layout = "UNKNOWN"
    fields = {}

    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        return {}, "UNKNOWN", ["IMAGE_DECODE_FAILED"]

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # Preprocessing: contrast adjustment & slight Otsu thresholding
    preprocessed = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 2)

    raw_text = ""
    if is_tesseract_available():
        lang_str = "+".join(scripts) if scripts else "eng"
        try:
            raw_text = pytesseract.image_to_string(preprocessed, lang=lang_str)
        except Exception as e:
            warnings.append(f"OCR_EXECUTION_WARNING: {str(e)}")
            raw_text = ""
    else:
        warnings.append("OCR_UNAVAILABLE")

    # Match NIC patterns
    old_match = OLD_NIC_REGEX.search(raw_text)
    new_match = NEW_NIC_REGEX.search(raw_text)

    if old_match:
        layout = "OLD_NIC"
        canonical = old_match.group(0).upper()
        fields["nicNumber"] = {
            "value": canonical,
            "confidence": 0.88,
            "source": "OCR",
            "script": "eng"
        }
    elif new_match:
        layout = "NEW_NIC"
        canonical = new_match.group(0)
        fields["nicNumber"] = {
            "value": canonical,
            "confidence": 0.92,
            "source": "OCR",
            "script": "eng"
        }
    else:
        fields["nicNumber"] = {
            "value": None,
            "confidence": None,
            "source": "OCR",
            "script": None
        }
        if "OCR_UNAVAILABLE" not in warnings:
            warnings.append("NIC_TEXT_UNREADABLE")

    # Name extraction heuristic from first non-empty lines
    lines = [line.strip() for line in raw_text.splitlines() if len(line.strip()) > 3]
    candidate_name = None
    for line in lines:
        if not re.search(r'\d', line) and len(line) > 5:
            candidate_name = line
            break

    fields["fullName"] = {
        "value": candidate_name,
        "confidence": 0.80 if candidate_name else None,
        "source": "OCR",
        "script": "eng"
    }

    return fields, layout, warnings
