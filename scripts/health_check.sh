#!/usr/bin/env bash
set -u

BASE_URL="${BASE_URL:-http://127.0.0.1:8000}"
ADMIN_KEY="${ADMIN_API_KEY:-}"
API_SERVICE="${API_SERVICE:-auto-tr-api}"
PIPELINE_SERVICE="${PIPELINE_SERVICE:-auto-tr-pipeline}"
CHECK_SYSTEMD=1

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

usage() {
  cat <<'EOF'
Usage: scripts/health_check.sh [options]

Options:
  -b, --base-url URL         API base URL (default: http://127.0.0.1:8000)
  -k, --admin-key KEY        ADMIN API key (optional, can use ADMIN_API_KEY env)
      --api-service NAME     systemd API service name (default: auto-tr-api)
      --pipeline-service NAME systemd pipeline service name (default: auto-tr-pipeline)
      --skip-systemd         Skip systemd status checks
  -h, --help                 Show this help

Examples:
  scripts/health_check.sh -b http://127.0.0.1:8000 -k 'your_admin_key'
  BASE_URL=https://api.dataquantlab.com ADMIN_API_KEY=xxx scripts/health_check.sh
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -b|--base-url)
      BASE_URL="$2"
      shift 2
      ;;
    -k|--admin-key)
      ADMIN_KEY="$2"
      shift 2
      ;;
    --api-service)
      API_SERVICE="$2"
      shift 2
      ;;
    --pipeline-service)
      PIPELINE_SERVICE="$2"
      shift 2
      ;;
    --skip-systemd)
      CHECK_SYSTEMD=0
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

if ! command -v curl >/dev/null 2>&1; then
  echo "[FATAL] curl is required."
  exit 1
fi

BASE_URL="${BASE_URL%/}"
echo "== Auto-Tr Health Check =="
echo "BASE_URL: ${BASE_URL}"
echo

run_request() {
  local method="$1"
  local path="$2"
  local expected="$3"
  local headers=()

  if [[ $# -ge 4 && -n "$4" ]]; then
    headers+=(-H "$4")
  fi

  local tmp_body
  tmp_body="$(mktemp)"
  local status
  status="$(curl -sS -m 20 -o "${tmp_body}" -w "%{http_code}" -X "${method}" "${headers[@]}" "${BASE_URL}${path}")"

  if [[ ",${expected}," == *",${status},"* ]]; then
    echo "[PASS] ${method} ${path} -> ${status}"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "[FAIL] ${method} ${path} -> ${status} (expected: ${expected})"
    echo "       body: $(head -c 180 "${tmp_body}" | tr '\n' ' ')"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi

  rm -f "${tmp_body}"
}

warn() {
  echo "[WARN] $1"
  WARN_COUNT=$((WARN_COUNT + 1))
}

echo "## Public endpoint checks"
run_request GET "/" "200"
run_request GET "/api/status" "200"
run_request GET "/api/portfolio" "200"
run_request GET "/api/trades" "200"
run_request GET "/api/trading/status" "200"
run_request GET "/api/portfolio/multi-asset" "200"
run_request GET "/api/portfolio/allocation" "200"
run_request GET "/api/pnl/BTCUSDT" "200"

echo
echo "## Auth protection checks (without API key)"
run_request POST "/api/trading/start" "401,500"
run_request POST "/api/trading/stop" "401,500"
run_request POST "/api/positions/open" "401,500"
run_request POST "/api/positions/close" "401,500"
run_request POST "/api/positions/update-prices" "401,500"
run_request POST "/api/positions/auto-close" "401,500"

if [[ -z "${ADMIN_KEY}" ]]; then
  warn "ADMIN_API_KEY not provided. Skipping authenticated start/stop checks."
else
  echo
  echo "## Authenticated control checks"
  run_request POST "/api/trading/start" "200" "X-API-KEY: ${ADMIN_KEY}"
  run_request GET "/api/trading/status" "200"
  run_request POST "/api/trading/stop" "200" "X-API-KEY: ${ADMIN_KEY}"
fi

if [[ "${CHECK_SYSTEMD}" -eq 1 ]]; then
  echo
  echo "## systemd checks"
  if command -v systemctl >/dev/null 2>&1; then
    if systemctl is-active --quiet "${API_SERVICE}"; then
      echo "[PASS] systemd ${API_SERVICE} is active"
      PASS_COUNT=$((PASS_COUNT + 1))
    else
      echo "[FAIL] systemd ${API_SERVICE} is NOT active"
      FAIL_COUNT=$((FAIL_COUNT + 1))
    fi

    if systemctl is-active --quiet "${PIPELINE_SERVICE}"; then
      echo "[PASS] systemd ${PIPELINE_SERVICE} is active"
      PASS_COUNT=$((PASS_COUNT + 1))
    else
      echo "[FAIL] systemd ${PIPELINE_SERVICE} is NOT active"
      FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
  else
    warn "systemctl not found. Skipping service checks."
  fi
fi

echo
echo "== Result =="
echo "PASS: ${PASS_COUNT}"
echo "FAIL: ${FAIL_COUNT}"
echo "WARN: ${WARN_COUNT}"

if [[ "${FAIL_COUNT}" -gt 0 ]]; then
  exit 1
fi

exit 0
