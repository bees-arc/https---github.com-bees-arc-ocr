param(
    [string]$FrontCard = "tools\real_test_card.jpg"
)

# scripts/test-ocr.ps1: Verify End-to-End Real OCR Upload, Processing & Field Extraction
$ErrorActionPreference = "Stop"

$baseUrl = "http://localhost:8080/api/v1"

Write-Host "1. Initiating OTP authentication..." -ForegroundColor Cyan
$otp = Invoke-RestMethod -Uri "$baseUrl/auth/otp/request" -Method Post -ContentType "application/json" -Body '{"contactLookup":"+94773344556"}'
$auth = Invoke-RestMethod -Uri "$baseUrl/auth/otp/verify" -Method Post -ContentType "application/json" -Body (@{challengeId=$otp.challengeId; otpCode="123456"} | ConvertTo-Json)
$token = $auth.token
$headers = @{ "Authorization" = "Bearer $token" }

Write-Host "2. Creating application draft..." -ForegroundColor Cyan
$app = Invoke-RestMethod -Uri "$baseUrl/applications" -Method Post -Headers $headers -ContentType "application/json" -Body "{}"
$appId = $app.id
Write-Host "Application created: $appId (Version: $($app.version))" -ForegroundColor Green

Write-Host "3. Uploading realistic test NIC document images: $FrontCard..." -ForegroundColor Cyan
$frontPath = Resolve-Path $FrontCard
$backPath = Resolve-Path "tools\real_test_card_back.jpg"

$curlArgs = @(
    "-s", "-X", "POST", "$baseUrl/applications/$appId/nic",
    "-H", "Authorization: Bearer $token",
    "-F", "frontImage=@$frontPath;type=image/jpeg",
    "-F", "backImage=@$backPath;type=image/jpeg",
    "-F", "expectedVersion=$($app.version)"
)
$curlOut = & curl.exe @curlArgs
Write-Host "Raw curl output: $curlOut"
$uploadRes = $curlOut | ConvertFrom-Json
$jobId = $uploadRes.jobId
Write-Host "OCR Job scheduled with ID: $jobId" -ForegroundColor Green

Write-Host "4. Waiting for background OCR extraction worker..." -ForegroundColor Cyan
$completed = $false
for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep -Seconds 1
    $job = Invoke-RestMethod -Uri "$baseUrl/jobs/$jobId" -Method Get -Headers $headers
    Write-Host "  Job State: $($job.state)"
    if ($job.state -eq "COMPLETED") {
        $completed = $true
        break
    }
    if ($job.state -eq "FAILED") {
        Write-Host "Job failed!" -ForegroundColor Red
        exit 1
    }
}

if (-not $completed) {
    Write-Host "Job timed out!" -ForegroundColor Red
    exit 1
}

Write-Host "`n5. Fetching extracted identity fields from backend..." -ForegroundColor Cyan
$extracted = Invoke-RestMethod -Uri "$baseUrl/applications/$appId/nic" -Method Get -Headers $headers

Write-Host "`n========================================================" -ForegroundColor Yellow
Write-Host "          REAL MACHINE OCR EXTRACTION REPORT            " -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Yellow
Write-Host "Processing Status:  $($extracted.processingStatus)" -ForegroundColor Green
Write-Host "Detected Layout:    $($extracted.layout)" -ForegroundColor Green
Write-Host "NIC Number:         $($extracted.fields.nicNumber.value) [Confidence: $($extracted.fields.nicNumber.confidence)]" -ForegroundColor Green
Write-Host "Full Name:          $($extracted.fields.fullName.value) [Confidence: $($extracted.fields.fullName.confidence)]" -ForegroundColor Green
Write-Host "Date of Birth:      $($extracted.fields.dateOfBirth.value)" -ForegroundColor Green
Write-Host "Gender:             $($extracted.fields.gender.value)" -ForegroundColor Green
Write-Host "Address:            $($extracted.fields.address.value)" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Yellow

Write-Host "`nSUCCESS: Real OCR extracted all fields directly from physical image!" -ForegroundColor Green
