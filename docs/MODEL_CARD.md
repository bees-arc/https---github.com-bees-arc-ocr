# Identity Onboarding Lab — Model Cards & License Audit

Version: 1.0  
Date: 7 October 2026

## 1. Vision & Optical Character Recognition (OCR)

### Primary Engine: Tesseract OCR (v5.x)
- **Upstream Project**: [Tesseract OCR](https://github.com/tesseract-ocr/tesseract)
- **License**: Apache License 2.0 (Code and official traineddata)
- **Languages**: 
  - English (`eng.traineddata`): Apache 2.0
  - Sinhala (`sin.traineddata`): Apache 2.0 ([sin.traineddata reference](https://github.com/tesseract-ocr/tessdata/blob/main/sin.traineddata))
  - Tamil (`tam.traineddata`): Apache 2.0 ([tam.traineddata reference](https://github.com/tesseract-ocr/tessdata/blob/main/tam.traineddata))
- **Execution Target**: CPU-first execution in containerized vision-service or host-installed Tesseract.
- **Limitations**:
  - Sri Lankan Old NIC cards have variable printing quality and embossed characters that may yield lower confidence.
  - Handwritten notes on back or signatures require ICR, which is marked `UNSUPPORTED`.
  - Missing binary triggers explicit `OCR_UNAVAILABLE` error status without inventing output.

### Secondary Evaluated Engine: PaddleOCR (PP-OCRv4 / PP-OCRv5)
- **License**: Apache License 2.0
- **Supported Scripts**: Multilingual Latin/CJK. Sinhala script is NOT natively included in default lightweight mobile weights; therefore, Sinhala recognition relies on Tesseract `sin.traineddata` or custom fine-tuned weights.
- **Classification**: Experimental / Optional.

---

## 2. Facial Detection & Document Portrait Extraction

### Primary Detector: OpenCV Haar / DNN Face Detector
- **Upstream Project**: OpenCV (Open Source Computer Vision Library)
- **License**: Apache License 2.0
- **Architecture**:
  - Pre-trained frontal face cascade / ResNet-10 SSD Caffe model.
  - Constrained to card bounding box coordinates to reject background faces.
- **Inference Requirements**: CPU execution (~15–30 ms per image).
- **Classification**: `REAL_EXPERIMENTAL`.

---

## 3. Liveness Analysis & Movement Challenge

### Movement & Temporal Sequence Analyzer
- **Algorithm**: Optical flow / landmark displacement / eye aspect ratio (EAR) analysis on sampled temporal frame window (10–15 fps).
- **Evaluation Criteria**:
  - Detects continuous single face across challenge duration.
  - Verifies head rotation angles (yaw deflection > 15 degrees for left/right) and eye aspect dip for blink.
  - Duration enforced: 8 to 15 seconds. Decoded duration validated server-side.
- **Presentation Attack Defense (PAD) Classification**:
  - Movement compliance alone does NOT constitute certified physical presentation attack defense (PAD).
  - High-resolution replay attacks or 3D masks cannot be reliably defeated by simple head turns.
  - Status reported: `CHALLENGE_COMPLETED` for movement challenge, while PAD remains `UNKNOWN` / `UNAVAILABLE` unless ISO 30107-3 compliant PAD weights are loaded.

---

## 4. Facial Comparison (1:1 Verification)

### Model: ResNet-based Deep Metric Embedding (FaceNet / InsightFace ArcFace)
- **Code License**: MIT / Apache 2.0
- **Weights License**: Non-commercial research vs permissive commercial check:
  - Default local baseline uses cosine similarity over standardized OpenCV dlib/ResNet face embeddings.
  - Scores are normalized cosine similarities in range `[-1.0, 1.0]`.
  - Calibrated Local Demo threshold: `0.65` cosine similarity.
  - Results flagged as `REAL_EXPERIMENTAL` and clearly distinguish score type from probability percentage.
