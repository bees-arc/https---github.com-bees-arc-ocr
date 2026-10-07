# scripts/smoke-test.ps1: End-to-end API smoke test for Identity Onboarding Lab

$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:8080/api/v1"

Write-Host "=== 1. Checking Actuator Health ===" -ForegroundColor Cyan
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8080/actuator/health" -Method Get
    Write-Host "Backend Status: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "Backend not running or unreachable at port 8080: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== 2. Checking Capabilities ===" -ForegroundColor Cyan
$caps = Invoke-RestMethod -Uri "$baseUrl/capabilities" -Method Get
Write-Host "Operating Mode: $($caps.operatingMode)" -ForegroundColor Green
Write-Host "Branding: $($caps.branding)" -ForegroundColor Green
Write-Host "OCR Engine: $($caps.ocrEngine.name)" -ForegroundColor Green
Write-Host "PAD Status: $($caps.padProviderStatus.status)" -ForegroundColor Yellow

Write-Host "`n=== 3. Applicant OTP Flow ===" -ForegroundColor Cyan
$otpReq = Invoke-RestMethod -Uri "$baseUrl/auth/otp/request" -Method Post -ContentType "application/json" -Body '{"contactLookup":"+94771234567"}'
Write-Host "Challenge ID: $($otpReq.challengeId)" -ForegroundColor Green
$code = if ($otpReq.demoCodeHint) { $otpReq.demoCodeHint } else { "123456" }

$verifyBody = @{ challengeId = $otpReq.challengeId; otpCode = $code } | ConvertTo-Json
$auth = Invoke-RestMethod -Uri "$baseUrl/auth/otp/verify" -Method Post -ContentType "application/json" -Body $verifyBody
Write-Host "Applicant Authenticated! User ID: $($auth.userId)" -ForegroundColor Green
$appToken = $auth.token

Write-Host "`n=== 4. Creating Application Draft ===" -ForegroundColor Cyan
$headers = @{ "Authorization" = "Bearer $appToken" }
$app = Invoke-RestMethod -Uri "$baseUrl/applications" -Method Post -Headers $headers -ContentType "application/json" -Body "{}"
Write-Host "Application Draft ID: $($app.id)" -ForegroundColor Green
Write-Host "Current Lifecycle: $($app.lifecycle)" -ForegroundColor Green
Write-Host "Current Decision: $($app.decision)" -ForegroundColor Green

Write-Host "`n=== 5. Staff Reviewer Authentication ===" -ForegroundColor Cyan
$staffLoginBody = @{ username = "staff.admin@identitylab.local"; password = "AdminDemo123!" } | ConvertTo-Json
$staffAuth = Invoke-RestMethod -Uri "$baseUrl/auth/staff/login" -Method Post -ContentType "application/json" -Body $staffLoginBody
Write-Host "Staff Authenticated! Role: $($staffAuth.role)" -ForegroundColor Green
$staffToken = $staffAuth.token

Write-Host "`n=== 6. Review Queue Access ===" -ForegroundColor Cyan
$staffHeaders = @{ "Authorization" = "Bearer $staffToken" }
$queue = Invoke-RestMethod -Uri "$baseUrl/staff/applications" -Method Get -Headers $staffHeaders
Write-Host "Queue Items Found: $($queue.totalElements)" -ForegroundColor Green

Write-Host "`n=== ALL SMOKE CHECKS PASSED ===" -ForegroundColor Green
