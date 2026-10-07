import os
from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    evidence_storage_path: str = os.getenv("EVIDENCE_STORAGE_PATH", "./data/evidence")
    vision_internal_secret: str = os.getenv("VISION_INTERNAL_SECRET", "dev-internal-secret-at-least-32-chars-long")
    model_manifest_path: str = os.getenv("MODEL_MANIFEST_PATH", "models/manifest.json")

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

def resolve_storage_path(storage_key: str) -> Path:
    if not storage_key or ".." in storage_key or "/" in storage_key or "\\" in storage_key:
        raise ValueError(f"Security error: Invalid storage key {storage_key}")
    root = Path(settings.evidence_storage_path).resolve()
    resolved = (root / storage_key).resolve()
    if not str(resolved).startswith(str(root)):
        raise ValueError(f"Security error: Path traversal detected for key {storage_key}")
    return resolved
