import os
from pathlib import Path
from pydantic_settings import BaseSettings

def get_default_evidence_path() -> str:
    env_val = os.getenv("EVIDENCE_STORAGE_PATH")
    if env_val:
        return env_val
    backend_evidence = Path(__file__).resolve().parent.parent.parent.parent / "backend" / "data" / "evidence"
    if backend_evidence.exists():
        return str(backend_evidence)
    return "./data/evidence"

class Settings(BaseSettings):
    evidence_storage_path: str = get_default_evidence_path()
    evidence_encryption_key_hex: str = os.getenv("EVIDENCE_ENCRYPTION_KEY_HEX", "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef")
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

def read_storage_bytes(storage_key: str) -> bytes:
    p = resolve_storage_path(storage_key)
    if not p.exists():
        raise FileNotFoundError(f"Evidence file not found: {storage_key}")
    with open(p, "rb") as f:
        data = f.read()

    # If it is raw unencrypted image/video (e.g. JPEG FF D8, PNG 89 50 4E 47, WEBM/MKV 1A 45 DF A3)
    if data.startswith(b"\xff\xd8\xff") or data.startswith(b"\x89PNG") or data.startswith(b"\x1a\x45\xdf\xa3"):
        return data

    # Attempt AES-256-GCM decryption
    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        if len(data) >= 28:
            key = bytes.fromhex(settings.evidence_encryption_key_hex)
            iv = data[:12]
            ciphertext = data[12:]
            return AESGCM(key).decrypt(iv, ciphertext, None)
    except Exception:
        pass

    return data

def write_storage_bytes(storage_key: str, raw_bytes: bytes) -> Path:
    p = resolve_storage_path(storage_key)
    p.parent.mkdir(parents=True, exist_ok=True)
    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        key = bytes.fromhex(settings.evidence_encryption_key_hex)
        iv = os.urandom(12)
        aesgcm = AESGCM(key)
        encrypted = aesgcm.encrypt(iv, raw_bytes, None)
        with open(p, "wb") as f:
            f.write(iv + encrypted)
    except Exception:
        with open(p, "wb") as f:
            f.write(raw_bytes)
    return p

