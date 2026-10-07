from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class QualityDetail(BaseModel):
    status: str = "PASS" # PASS, FAIL, WARNING
    blurScore: Optional[float] = None
    glareDetected: bool = False

class DocumentDetail(BaseModel):
    layout: str = "UNKNOWN" # OLD_NIC, NEW_NIC, UNKNOWN
    quality: QualityDetail = Field(default_factory=QualityDetail)

class FieldValue(BaseModel):
    value: Optional[str] = None
    confidence: Optional[float] = None
    source: str = "OCR"
    script: Optional[str] = "eng"

class PortraitDetail(BaseModel):
    status: str = "NOT_FOUND" # FOUND, NOT_FOUND, MULTIPLE_FACES, LOW_QUALITY
    portraitStorageKey: Optional[str] = None

class ProviderDetail(BaseModel):
    name: str = "tesseract"
    version: str = "5.x"

class NicExtractionRequest(BaseModel):
    requestId: str
    jobId: str
    applicationId: str
    generation: int
    frontStorageKey: Optional[str] = None
    backStorageKey: Optional[str] = None
    requestedScripts: List[str] = ["eng", "sin", "tam"]

class NicExtractionResponse(BaseModel):
    requestId: str
    generation: int
    executionMode: str = "REAL"
    status: str = "PASS" # PASS, FAIL, INCONCLUSIVE, ERROR
    document: DocumentDetail = Field(default_factory=DocumentDetail)
    fields: Dict[str, FieldValue] = Field(default_factory=dict)
    portrait: PortraitDetail = Field(default_factory=PortraitDetail)
    warnings: List[str] = Field(default_factory=list)
    provider: ProviderDetail = Field(default_factory=ProviderDetail)

class BiometricAnalysisRequest(BaseModel):
    attemptId: str
    applicationId: str
    generation: int
    videoStorageKey: str
    expectedChallengeSteps: List[str]
    nonce: str

class ChallengeOutcome(BaseModel):
    status: str = "PASS" # PASS, FAIL, INCONCLUSIVE
    stepsCompleted: List[str] = Field(default_factory=list)

class PadOutcome(BaseModel):
    status: str = "UNKNOWN" # PASS, FAIL, UNKNOWN, UNAVAILABLE
    score: Optional[float] = None
    scoreType: Optional[str] = "PAD_SCORE"
    provider: str = "none"

class BiometricAnalysisResponse(BaseModel):
    attemptId: str
    executionMode: str = "REAL_EXPERIMENTAL"
    status: str = "PASS"
    durationSeconds: float = 0.0
    challengeOutcome: ChallengeOutcome = Field(default_factory=ChallengeOutcome)
    padOutcome: PadOutcome = Field(default_factory=PadOutcome)
    bestFrameStorageKey: Optional[str] = None
    warnings: List[str] = Field(default_factory=list)

class FaceComparisonRequest(BaseModel):
    requestId: str
    portraitStorageKey: str
    liveFrameStorageKey: str
    calibratedThreshold: float = 0.65

class FaceComparisonResponse(BaseModel):
    requestId: str
    executionMode: str = "REAL_EXPERIMENTAL"
    status: str = "PASS" # PASS, FAIL, INCONCLUSIVE, ERROR
    score: Optional[float] = None
    scoreType: str = "COSINE_SIMILARITY"
    threshold: float = 0.65
    provider: ProviderDetail = Field(default_factory=lambda: ProviderDetail(name="opencv-cosine", version="1.0"))
    warnings: List[str] = Field(default_factory=list)
