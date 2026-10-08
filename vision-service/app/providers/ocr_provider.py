import re
import cv2
import numpy as np
import pytesseract
from typing import Dict, Any, Tuple, Optional

# Initialize RapidOCR engine
try:
    from rapidocr_onnxruntime import RapidOCR
    rapid_engine = RapidOCR()
except Exception as e:
    rapid_engine = None

OLD_NIC_REGEX = re.compile(r'\b([0-9]{2})([0-35-8][0-9]{2})([0-9]{3}[0-9])([vVxX])\b')
NEW_NIC_REGEX = re.compile(r'\b((?:19|20)[0-9]{2})([0-35-8][0-9]{2})([0-9]{5})\b')
LENIENT_OLD_NIC = re.compile(r'([0-9]{9})\s*([vVxX])')
LENIENT_NEW_NIC = re.compile(r'((?:19|20)[0-9]{10})')

HEADER_EXCLUSIONS = [
    "SRI LANKA", "SRILANKA", "DEMOCRATIC", "SOCIALIST", "REPUBLIC",
    "NATIONAL", "IDENTITY", "CARD", "DEPARTMENT", "REGISTRATION",
    "PERSONS", "IDENTITY CARD", "REGISTRAR", "GENERAL", "SIGNATURE"
]

MONTH_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

def is_tesseract_available() -> bool:
    try:
        pytesseract.get_tesseract_version()
        return True
    except Exception:
        return False

def is_ocr_available() -> bool:
    return rapid_engine is not None or is_tesseract_available()

def parse_nic_metadata(nic_str: str) -> Optional[Dict[str, Any]]:
    clean = re.sub(r'[\s\-_]', '', nic_str).upper()
    old_m = re.match(r'^([0-9]{2})([0-9]{3})([0-9]{4})([VX])$', clean)
    new_m = re.match(r'^((?:19|20)[0-9]{2})([0-9]{3})([0-9]{5})$', clean)

    if old_m:
        year = 1900 + int(old_m.group(1))
        days = int(old_m.group(2))
        layout = "OLD_NIC"
    elif new_m:
        year = int(new_m.group(1))
        days = int(new_m.group(2))
        layout = "NEW_NIC"
    else:
        return None

    if days > 500:
        gender = "FEMALE"
        days -= 500
    else:
        gender = "MALE"

    if days < 1 or days > 366:
        return None

    rem = days
    month = 1
    for m, d in enumerate(MONTH_DAYS, 1):
        if rem <= d:
            month = m
            break
        rem -= d
    day = rem
    dob = f"{year:04d}-{month:02d}-{day:02d}"

    return {
        "canonical": clean,
        "layout": layout,
        "gender": gender,
        "dateOfBirth": dob,
        "year": year
    }

def extract_nic_text(image_bytes: bytes, scripts: list[str]) -> Tuple[Dict[str, Any], str, list[str]]:
    warnings = []
    layout = "UNKNOWN"
    fields = {}

    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        return {}, "UNKNOWN", ["IMAGE_DECODE_FAILED"]

    ocr_lines = [] # list of (text, confidence, box)

    # 1. Primary Engine: RapidOCR ONNX
    if rapid_engine is not None:
        try:
            result, elapse = rapid_engine(img)
            if result:
                for item in result:
                    # item: [box, text, score]
                    box, text, score = item[0], item[1].strip(), float(item[2])
                    if text:
                        ocr_lines.append((text, score, box))
        except Exception as e:
            warnings.append(f"RAPID_OCR_ERROR: {str(e)}")

    # 2. Secondary Engine: Tesseract (if rapidocr found nothing or unavailable)
    if not ocr_lines and is_tesseract_available():
        try:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            preprocessed = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 2)
            lang_str = "+".join(scripts) if scripts else "eng"
            raw_text = pytesseract.image_to_string(preprocessed, lang=lang_str)
            for line in raw_text.splitlines():
                line_str = line.strip()
                if line_str:
                    ocr_lines.append((line_str, 0.85, None))
        except Exception as e:
            warnings.append(f"TESSERACT_OCR_ERROR: {str(e)}")

    if not ocr_lines and not is_ocr_available():
        warnings.append("OCR_UNAVAILABLE")
        return {}, "UNKNOWN", warnings

    all_texts = [l[0] for l in ocr_lines]
    combined_raw = " ".join(all_texts)

    # Search for NIC
    found_nic = None
    nic_score = 0.85
    nic_meta = None

    # Check individual lines first
    for text, score, box in ocr_lines:
        # Standard Old NIC
        m_old = OLD_NIC_REGEX.search(text)
        if m_old:
            candidate = m_old.group(0).upper()
            meta = parse_nic_metadata(candidate)
            if meta:
                found_nic = meta["canonical"]
                nic_score = score
                nic_meta = meta
                break

        # Standard New NIC
        m_new = NEW_NIC_REGEX.search(text)
        if m_new:
            candidate = m_new.group(0)
            meta = parse_nic_metadata(candidate)
            if meta:
                found_nic = meta["canonical"]
                nic_score = score
                nic_meta = meta
                break

        # Lenient whitespace Old NIC
        m_l_old = LENIENT_OLD_NIC.search(text)
        if m_l_old:
            candidate = (m_l_old.group(1) + m_l_old.group(2)).upper()
            meta = parse_nic_metadata(candidate)
            if meta:
                found_nic = meta["canonical"]
                nic_score = score * 0.95
                nic_meta = meta
                break

        # Lenient New NIC
        m_l_new = LENIENT_NEW_NIC.search(text)
        if m_l_new:
            candidate = m_l_new.group(1)
            meta = parse_nic_metadata(candidate)
            if meta:
                found_nic = meta["canonical"]
                nic_score = score * 0.95
                nic_meta = meta
                break

    # If not found in individual lines, check combined string
    if not found_nic:
        comb_clean = re.sub(r'[^A-Za-z0-9]', '', combined_raw).upper()
        # Look for 9 digits + V/X
        m_comb_old = re.search(r'([0-9]{9}[VX])', comb_clean)
        if m_comb_old:
            meta = parse_nic_metadata(m_comb_old.group(1))
            if meta:
                found_nic = meta["canonical"]
                nic_score = 0.88
                nic_meta = meta

        if not found_nic:
            m_comb_new = re.search(r'((?:19|20)[0-9]{10})', comb_clean)
            if m_comb_new:
                meta = parse_nic_metadata(m_comb_new.group(1))
                if meta:
                    found_nic = meta["canonical"]
                    nic_score = 0.88
                    nic_meta = meta

    if nic_meta:
        layout = nic_meta["layout"]
        fields["nicNumber"] = {
            "value": nic_meta["canonical"],
            "confidence": round(float(nic_score), 2),
            "source": "RAPID_OCR_ONNX" if rapid_engine else "TESSERACT",
            "script": "eng"
        }
        fields["dateOfBirth"] = {
            "value": nic_meta["dateOfBirth"],
            "confidence": round(float(nic_score), 2),
            "source": "DERIVED_FROM_NIC",
            "script": "eng"
        }
        fields["gender"] = {
            "value": nic_meta["gender"],
            "confidence": round(float(nic_score), 2),
            "source": "DERIVED_FROM_NIC",
            "script": "eng"
        }
    else:
        fields["nicNumber"] = {
            "value": None,
            "confidence": None,
            "source": "OCR",
            "script": None
        }
        warnings.append("NIC_TEXT_UNREADABLE")

    # Name extraction heuristic
    candidate_name = None
    name_score = None

    for text, score, box in ocr_lines:
        upper = text.upper()
        # Skip headers
        if any(h in upper for h in HEADER_EXCLUSIONS):
            continue
        # Skip if contains NIC number or mostly digits
        if found_nic and found_nic in upper:
            continue
        if re.search(r'\d{3,}', text):
            continue

        # Look for explicit label: Name: / Name in full:
        name_label_match = re.search(r'(?:NAME|FULL\s*NAME|නම|பெயர்)\s*[:.\-]?\s*(.+)', text, re.IGNORECASE)
        if name_label_match:
            val = name_label_match.group(1).strip()
            if len(val) > 3 and not any(h in val.upper() for h in HEADER_EXCLUSIONS):
                candidate_name = val.upper()
                name_score = score
                break

        # Fallback: line with all English alphabetic words (length > 4)
        if not candidate_name and re.match(r'^[A-Za-z\s\.\,\']{5,}$', text.strip()):
            words = text.strip().split()
            if len(words) >= 1 and not any(h in upper for h in HEADER_EXCLUSIONS):
                candidate_name = text.strip().upper()
                name_score = score

    if candidate_name:
        fields["fullName"] = {
            "value": candidate_name,
            "confidence": round(float(name_score), 2) if name_score else 0.85,
            "source": "RAPID_OCR_ONNX" if rapid_engine else "TESSERACT",
            "script": "eng"
        }
    else:
        fields["fullName"] = {
            "value": None,
            "confidence": None,
            "source": "OCR",
            "script": None
        }

    # Address extraction heuristic (e.g. if back image or contains road/street/colombo)
    candidate_address = None
    for text, score, box in ocr_lines:
        upper = text.upper()
        if any(kw in upper for kw in ["ROAD", "STREET", "MAWATHA", "LANE", "COLOMBO", "KANDY", "GALLE", "NO.", "NO:"]):
            candidate_address = text.strip()
            break

    if candidate_address:
        fields["address"] = {
            "value": candidate_address,
            "confidence": 0.85,
            "source": "RAPID_OCR_ONNX" if rapid_engine else "TESSERACT",
            "script": "eng"
        }

    return fields, layout, warnings
