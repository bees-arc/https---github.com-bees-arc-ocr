#!/usr/bin/env bash
set -euo pipefail

MODELS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../vision-service/models/tessdata" && pwd)"
mkdir -p "$MODELS_DIR"

SIN_URL="https://github.com/tesseract-ocr/tessdata/raw/main/sin.traineddata"
TAM_URL="https://github.com/tesseract-ocr/tessdata/raw/main/tam.traineddata"

SIN_PATH="$MODELS_DIR/sin.traineddata"
TAM_PATH="$MODELS_DIR/tam.traineddata"

echo "Checking Sinhala (sin) model..."
if [ ! -f "$SIN_PATH" ]; then
    curl -L -o "$SIN_PATH" "$SIN_URL"
    echo "Downloaded: $SIN_PATH"
else
    echo "Sinhala model exists."
fi

echo "Checking Tamil (tam) model..."
if [ ! -f "$TAM_PATH" ]; then
    curl -L -o "$TAM_PATH" "$TAM_URL"
    echo "Downloaded: $TAM_PATH"
else
    echo "Tamil model exists."
fi

echo "Models setup complete."
