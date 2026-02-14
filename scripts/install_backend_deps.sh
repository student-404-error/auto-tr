#!/usr/bin/env bash
set -euo pipefail

# Install backend Python dependencies with fallbacks (default PyPI -> Kakao mirror).

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
VENV_DIR="$BACKEND_DIR/.venv"
REQ_FILE="$BACKEND_DIR/requirements.txt"

log() { printf '[%s] %s\n' "$(date +%T)" "$*"; }

ensure_venv() {
  if [[ ! -d "$VENV_DIR" ]]; then
    log "Creating venv at $VENV_DIR";
    python3 -m venv "$VENV_DIR";
  else
    log "Using existing venv at $VENV_DIR";
  fi
  # shellcheck disable=SC1091
  source "$VENV_DIR/bin/activate"
}

try_install() {
  local extra_opts="$1"
  log "pip install $extra_opts"
  if pip install --no-cache-dir -r "$REQ_FILE" --timeout 30 --retries 3 $extra_opts; then
    log "Dependencies installed successfully"
    return 0
  fi
  log "Install failed with opts: $extra_opts"
  return 1
}

main() {
  if [[ ! -f "$REQ_FILE" ]]; then
    log "requirements.txt not found at $REQ_FILE"; exit 1; fi

  ensure_venv
  pip install --no-cache-dir --upgrade pip setuptools wheel

  # 1) Default PyPI
  if try_install "--trusted-host pypi.org --trusted-host files.pythonhosted.org"; then exit 0; fi

  # 2) Kakao mirror fallback (KR-friendly)
  if try_install "-i https://mirror.kakao.com/pypi/simple --trusted-host mirror.kakao.com"; then exit 0; fi

  # 3) Report diagnostics
  log "All install attempts failed. Checking connectivity..."
  curl -I https://pypi.org/simple/fastapi || true
  log "You may need to set HTTP(S)_PROXY or fix DNS (e.g., 8.8.8.8)."
  exit 1
}

main "$@"
