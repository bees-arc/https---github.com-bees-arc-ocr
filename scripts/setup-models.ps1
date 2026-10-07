# scripts/setup-models.ps1: Download official Tesseract traineddata models for Sinhala and Tamil

$ErrorActionPreference = "Stop"

$modelsDir = Join-Path $PSScriptRoot "..\vision-service\models\tessdata"
if (-not (Test-Path $modelsDir)) {
    New-Item -ItemType Directory -Path $modelsDir -Force | Out-Null
}

$sinUrl = "https://github.com/tesseract-ocr/tessdata/raw/main/sin.traineddata"
$tamUrl = "https://github.com/tesseract-ocr/tessdata/raw/main/tam.traineddata"

$sinPath = Join-Path $modelsDir "sin.traineddata"
$tamPath = Join-Path $modelsDir "tam.traineddata"

Write-Host "Downloading Sinhala (sin) traineddata..." -ForegroundColor Cyan
if (-not (Test-Path $sinPath)) {
    Invoke-WebRequest -Uri $sinUrl -OutFile $sinPath -UseBasicParsing
    Write-Host "Sinhala model downloaded: $sinPath" -ForegroundColor Green
} else {
    Write-Host "Sinhala model already present." -ForegroundColor Yellow
}

Write-Host "Downloading Tamil (tam) traineddata..." -ForegroundColor Cyan
if (-not (Test-Path $tamPath)) {
    Invoke-WebRequest -Uri $tamUrl -OutFile $tamPath -UseBasicParsing
    Write-Host "Tamil model downloaded: $tamPath" -ForegroundColor Green
} else {
    Write-Host "Tamil model already present." -ForegroundColor Yellow
}

Write-Host "Model setup complete." -ForegroundColor Green
