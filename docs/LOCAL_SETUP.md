# Identity Onboarding Lab — Local Setup Guide

This guide details running the Identity Onboarding Lab application locally, using either **Docker Compose** or **Native Local Development**.

---

## 1. Prerequisites

- **Java**: Java 21 LTS (`java -version` and `javac -version`)
- **Node.js**: Node 20.x or higher & npm (`node -v`, `npm -v`)
- **Python**: Python 3.11.x (`python --version`)
- **Docker Desktop** (Optional, for containerized local execution)

---

## 2. Option A: Docker Compose (Recommended for Full Stack)

### Step 1: Prepare Environment Configuration
```bash
# Copy template configuration
cp .env.example .env
```
Ensure required secrets are populated. Default development keys in `.env.example` are pre-configured for local testing.

### Step 2: Build and Start Containers
```bash
docker compose -f infra/compose.yaml up --build
```
This starts:
- **PostgreSQL 16**: Port `5432` (loopback only)
- **Vision Service (FastAPI)**: Internal port `8000`
- **Backend (Spring Boot 3.3.4, Java 21)**: Port `8080`
- **Frontend (Next.js 14)**: Port `3000`

### Step 3: Access Web Interfaces
- **Customer Onboarding Portal**: [http://localhost:3000](http://localhost:3000)
- **Staff Reviewer Queue**: [http://localhost:3000/staff/applications](http://localhost:3000/staff/applications)
- **Backend Actuator Health**: [http://localhost:8080/actuator/health](http://localhost:8080/actuator/health)
- **Capabilities Matrix**: [http://localhost:8080/api/v1/capabilities](http://localhost:8080/api/v1/capabilities)

### Non-Destructive Stop
```bash
docker compose -f infra/compose.yaml stop
```
*(Do NOT use `docker compose down -v` unless you intentionally wish to delete all stored database records and evidence files).*

---

## 3. Option B: Native Local Development (No Docker Required)

In native developer mode, Spring Boot utilizes an in-memory PostgreSQL-compatible H2 database with Flyway migrations, allowing complete execution without local Docker or PostgreSQL daemons.

### Step 1: Start Python Vision Service
```powershell
cd vision-service
# Install dependencies
pip install -r requirements.txt

# Start Uvicorn
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Step 2: Start Spring Boot Backend
In a separate terminal:
```powershell
cd backend
# Use the Maven wrapper
.\mvnw.cmd spring-boot:run
```
*(On Linux/macOS: `./mvnw spring-boot:run`)*

Backend will initialize Flyway schema migrations, bootstrap default staff credentials, and listen on port `8080`.

### Step 3: Start Next.js Frontend
In a separate terminal:
```powershell
cd frontend
npm run dev
```
Frontend will be available at [http://localhost:3000](http://localhost:3000).

---

## 4. Test Credentials & Demo Shortcuts

- **Applicant OTP**:
  - Enter mobile: `+94771234567`
  - When prompted for code, use local test OTP: `123456`
- **Staff Reviewer Account**:
  - Username: `staff.admin@identitylab.local`
  - Password: `AdminDemo123!`
- **Sample NIC Card Generator**:
  - On the NIC upload screen (`/onboarding/[id]/nic`), click the **"Sample Card"** button to automatically generate valid, synthetic Sri Lankan Old NIC front and back cards without needing a real physical card.
- **Simulate Camera Challenge**:
  - On the video challenge screen (`/onboarding/[id]/video`), click **"Simulate Video Capture (Test Demo Mode)"** to execute challenge movements without a webcam.

---

## 5. Verification & Smoke Testing

Run the included smoke test script to verify all services:

**Windows PowerShell:**
```powershell
.\scripts\smoke-test.ps1
```

**Linux/macOS Bash:**
```bash
./scripts/smoke-test.sh
```
