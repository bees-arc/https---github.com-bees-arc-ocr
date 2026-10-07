import json
from pathlib import Path
from fastapi import APIRouter, Header, HTTPException, Depends
from app.core.config import settings, resolve_storage_path
from app.schemas.vision_dto import (
    NicExtractionRequest, NicExtractionResponse,
    BiometricAnalysisRequest, BiometricAnalysisResponse,
    FaceComparisonRequest, FaceComparisonResponse,
    DocumentDetail, QualityDetail, FieldValue, PortraitDetail, ProviderDetail
)
from app.providers.quality_provider import assess_image_quality
from app.providers.ocr_provider import extract_nic_text, is_tesseract_available
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
        "tesseractInstalled": is_tesseract_available()
    }

@router.get("/v1/capabilities")
def get_capabilities():
    manifest_file = Path(settings.model_manifest_path)
    if manifest_file.exists():
        with open(manifest_file, "r") as f:
            return json.load(f)
    return {
        "ocr": {"engine": "Tesseract", "status": "READY" if is_tesseract_available() else "UNAVAILABLE"},
        "liveness": {"movement": "OpenCV Temporal", "pad": "UNKNOWN"}
    }

@router.post("/v1/nic/extract", response_model=NicExtractionResponse, dependencies=[Depends(verify_internal_secret)])
def extract_nic(req: NicExtractionRequest):
    storage_root = Path(settings.evidence_storage_path)
    front_path = resolve_storage_path(req.frontStorageKey) if req.frontStorageKey else None

    if not front_path or not front_path.exists():
        raise HTTPException(status_code=404, detail="Front image evidence not found in storage")

    with open(front_path, "rb") as f:
        image_bytes = f.read()

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
        provider=ProviderDetail(name="tesseract-ocr", version="5.x")
    )

@router.post("/v1/biometrics/analyze", response_model=BiometricAnalysisResponse, dependencies=[Depends(verify_internal_secret)])
def analyze_biometrics(req: BiometricAnalysisRequest):
    storage_root = Path(settings.evidence_storage_path)
    video_path = resolve_storage_path(req.videoStorageKey)

    result = analyze_video_liveness(video_path, req.expectedChallengeSteps, storage_root)

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
    portrait_path = resolve_storage_path(req.portraitStorageKey)
    live_frame_path = resolve_storage_path(req.liveFrameStorageKey)

    result = compare_face_images(portrait_path, live_frame_path, req.calibratedThreshold)

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
