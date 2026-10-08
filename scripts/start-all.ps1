# Automated Sri Lankan Investment Onboarding - Start All Services Locally
$Root = Split-Path -Parent $PSScriptRoot
Write-Host "Starting Sri Lankan Investment Onboarding Platform from: $Root" -ForegroundColor Cyan

# 1. Setup JAVA_HOME
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"

# 2. Start Vision Service (Port 8000)
Write-Host "1/3 Starting Vision & Biometrics Service on http://localhost:8000..." -ForegroundColor Green
$VisionProcess = Start-Process -FilePath "$Root\tools\python-embed\python.exe" `
    -ArgumentList "-m uvicorn app.main:app --app-dir `"$Root\vision-service`" --host 0.0.0.0 --port 8000" `
    -WorkingDirectory "$Root\vision-service" `
    -PassThru

# 3. Start Spring Boot Backend (Port 8080)
Write-Host "2/3 Starting Spring Boot Backend on http://localhost:8080..." -ForegroundColor Green
$BackendProcess = Start-Process -FilePath "$Root\backend\mvnw.cmd" `
    -ArgumentList "spring-boot:run" `
    -WorkingDirectory "$Root\backend" `
    -PassThru

# 4. Start Next.js Frontend (Port 3000)
Write-Host "3/3 Starting Next.js Frontend on http://localhost:3000..." -ForegroundColor Green
$FrontendProcess = Start-Process -FilePath "npm.cmd" `
    -ArgumentList "run dev" `
    -WorkingDirectory "$Root\frontend" `
    -PassThru

Write-Host "`nAll 3 services have been launched!" -ForegroundColor Yellow
Write-Host "  - Customer Onboarding: http://localhost:3000/onboarding/start" -ForegroundColor Cyan
Write-Host "  - Staff Review Portal:  http://localhost:3000/staff/login (staff.admin@identitylab.local / AdminDemo123!)" -ForegroundColor Cyan
Write-Host "  - Spring Boot Backend:  http://localhost:8080/api/v1/system/capabilities" -ForegroundColor Cyan
Write-Host "  - Vision Service:       http://localhost:8000/health" -ForegroundColor Cyan
Write-Host "`nPress Ctrl+C or close the spawned windows to stop services."
