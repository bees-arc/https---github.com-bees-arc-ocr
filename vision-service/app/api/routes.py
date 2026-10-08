import json
from pathlib import Path
from fastapi import APIRouter, Header, HTTPException, Depends
from app.core.config import settings, resolve_storage_path, read_storage_bytes, write_storage_bytes
from app.schemas.vision_dto import (
    NicExtractionRequest, NicExtractionResponse,
    BiometricAnalysisRequest, BiometricAnalysisResponse,
    FaceComparisonRequest, FaceComparisonResponse,
    DocumentDetail, QualityDetail, FieldValue, PortraitDetail, ProviderDetail
)
from app.providers.quality_provider import assess_image_quality
from app.providers.ocr_provider import extract_nic_text, is_tesseract_available, is_ocr_available, rapid_engine
from app.providers.face_provider import extract_document_portrait
from app.providers.liveness_provider import analyze_video_liveness
from app.providers.compare_provider import compare_face_images

router = APIRouter()

def verify_internal_secret(x_internal_vision_secret: str = Header(None)):
    if not x_internal_vision_secret or x_internal_vision_secret != settings.vision_internal_secret:
        raise HTTPException(status_code=403, detail="Forbidden: Invalid vision internal secret")

@router.get("/health/live")
def health_live():
    return {"status": "alive"}

@router.get("/health/ready")
def health_ready():
    storage_root = Path(settings.evidence_storage_path)
    if not storage_root.exists():
        storage_root.mkdir(parents=True, exist_ok=True)
    return {
        "status": "ready",
        "ocrAvailable": is_ocr_available(),
        "rapidOcrActive": rapid_engine is not None,
        "tesseractInstalled": is_tesseract_available()
    }

@router.get("/v1/capabilities")
def get_capabilities():
    manifest_file = Path(settings.model_manifest_path)
    if manifest_file.exists():
        with open(manifest_file, "r") as f:
            data = json.load(f)
            if "models" in data and "ocr" in data["models"]:
                data["models"]["ocr"]["status"] = "READY" if is_ocr_available() else "UNAVAILABLE"
                data["models"]["ocr"]["engine"] = "RapidOCR (ONNX) + Tesseract" if rapid_engine is not None else "Tesseract OCR"
            return data
    return {
        "ocr": {"engine": "RapidOCR (ONNX)", "status": "READY" if is_ocr_available() else "UNAVAILABLE"},
        "liveness": {"movement": "OpenCV Temporal", "pad": "UNKNOWN"}
    }

@router.post("/v1/nic/extract", response_model=NicExtractionResponse, dependencies=[Depends(verify_internal_secret)])
def extract_nic(req: NicExtractionRequest):
    storage_root = Path(settings.evidence_storage_path)
    if not req.frontStorageKey:
        raise HTTPException(status_code=400, detail="frontStorageKey is required")

    try:
        image_bytes = read_storage_bytes(req.frontStorageKey)
    except Exception:
        raise HTTPException(status_code=404, detail="Front image evidence not found in storage")

    # Image quality check
    quality_res = assess_image_quality(image_bytes)
    quality_detail = QualityDetail(
        status=quality_res["status"],
        blurScore=quality_res.get("blurScore"),
        glareDetected=quality_res.get("glareDetected", False)
    )

    # Text extraction
    fields_dict, layout, ocr_warnings = extract_nic_text(image_bytes, req.requestedScripts)
    formatted_fields = {k: FieldValue(**v) for k, v in fields_dict.items()}

    # Portrait crop
    portrait_res = extract_document_portrait(image_bytes, storage_root)
    portrait_detail = PortraitDetail(
        status=portrait_res["status"],
        portraitStorageKey=portrait_res.get("portraitStorageKey")
    )

    all_warnings = quality_res.get("warnings", []) + ocr_warnings

    overall_status = "PASS"
    if quality_detail.status == "FAIL":
        overall_status = "FAIL"
    elif "OCR_UNAVAILABLE" in all_warnings:
        overall_status = "INCONCLUSIVE"

    return NicExtractionResponse(
        requestId=req.requestId,
        generation=req.generation,
        executionMode="REAL",
        status=overall_status,
        document=DocumentDetail(layout=layout, quality=quality_detail),
        fields=formatted_fields,
        portrait=portrait_detail,
        warnings=all_warnings,
        provider=ProviderDetail(name="rapidocr-onnx" if rapid_engine else "tesseract-ocr", version="1.4.4" if rapid_engine else "5.x")
    )

@router.post("/v1/biometrics/analyze", response_model=BiometricAnalysisResponse, dependencies=[Depends(verify_internal_secret)])
def analyze_biometrics(req: BiometricAnalysisRequest):
    storage_root = Path(settings.evidence_storage_path)
    try:
        video_bytes = read_storage_bytes(req.videoStorageKey)
    except Exception:
        raise HTTPException(status_code=404, detail="Video evidence not found in storage")

    temp_video = storage_root / f".dec_{req.videoStorageKey}"
    try:
        with open(temp_video, "wb") as f:
            f.write(video_bytes)
        result = analyze_video_liveness(temp_video, req.expectedChallengeSteps, storage_root)
    finally:
        if temp_video.exists():
            try:
                temp_video.unlink()
            except Exception:
                pass

    return BiometricAnalysisResponse(
        attemptId=req.attemptId,
        executionMode="REAL_EXPERIMENTAL",
        status=result["status"],
        durationSeconds=result["durationSeconds"],
        challengeOutcome=result["challengeOutcome"],
        padOutcome=result["padOutcome"],
        bestFrameStorageKey=result["bestFrameStorageKey"],
        warnings=result.get("warnings", [])
    )

@router.post("/v1/faces/compare", response_model=FaceComparisonResponse, dependencies=[Depends(verify_internal_secret)])
def compare_faces(req: FaceComparisonRequest):
    storage_root = Path(settings.evidence_storage_path)
    try:
        p1_bytes = read_storage_bytes(req.portraitStorageKey)
        p2_bytes = read_storage_bytes(req.liveFrameStorageKey)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Face evidence not found in storage: {str(e)}")

    temp_p1 = storage_root / f".dec_{req.portraitStorageKey}"
    temp_p2 = storage_root / f".dec_{req.liveFrameStorageKey}"
    try:
        with open(temp_p1, "wb") as f:
            f.write(p1_bytes)
        with open(temp_p2, "wb") as f:
            f.write(p2_bytes)
        result = compare_face_images(temp_p1, temp_p2, req.calibratedThreshold)
    finally:
        for t in [temp_p1, temp_p2]:
            if t.exists():
                try:
                    t.unlink()
                except Exception:
                    pass

    return FaceComparisonResponse(
        requestId=req.requestId,
        executionMode="REAL_EXPERIMENTAL",
        status=result["status"],
        score=result["score"],
        scoreType=result["scoreType"],
        threshold=result["threshold"],
        provider=ProviderDetail(**result["provider"]),
        warnings=result.get("warnings", [])
    )
