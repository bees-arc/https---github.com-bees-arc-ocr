#!/usr/bin/env bash
set -euo pipefail

BASE_URL="http://localhost:8080/api/v1"

echo "=== 1. Checking Actuator Health ==="
curl -sf "http://localhost:8080/actuator/health"
echo -e "\nHealth check OK."

echo "=== 2. Checking Capabilities ==="
curl -sf "$BASE_URL/capabilities"
echo -e "\nCapabilities check OK."

echo "=== 3. Requesting OTP ==="
OTP_RESP=$(curl -sf -X POST "$BASE_URL/auth/otp/request" \
  -H "Content-Type: application/json" \
  -d '{"contactLookup":"+94771234567"}')
echo "$OTP_RESP"

CHALLENGE_ID=$(echo "$OTP_RESP" | grep -o '"challengeId":"[^"]*' | cut -d'"' -f4)

echo "=== 4. Verifying OTP ==="
AUTH_RESP=$(curl -sf -X POST "$BASE_URL/auth/otp/verify" \
  -H "Content-Type: application/json" \
  -d "{\"challengeId\":\"$CHALLENGE_ID\",\"otpCode\":\"123456\"}")
echo "$AUTH_RESP"

TOKEN=$(echo "$AUTH_RESP" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

echo "=== 5. Creating Application Draft ==="
APP_RESP=$(curl -sf -X POST "$BASE_URL/applications" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}')
echo "$APP_RESP"

echo "=== 6. Staff Login ==="
STAFF_RESP=$(curl -sf -X POST "$BASE_URL/auth/staff/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"staff.admin@identitylab.local","password":"AdminDemo123!"}')
echo "$STAFF_RESP"

STAFF_TOKEN=$(echo "$STAFF_RESP" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

echo "=== 7. Fetching Staff Queue ==="
curl -sf -X GET "$BASE_URL/staff/applications" \
  -H "Authorization: Bearer $STAFF_TOKEN"
echo -e "\n\n=== ALL SMOKE CHECKS PASSED ==="
