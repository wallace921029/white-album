#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

assert_port_available() {
  local port="$1"
  local service_name="$2"

  if ! command -v lsof >/dev/null 2>&1; then
    echo "lsof is required to check whether port ${port} is available." >&2
    exit 1
  fi

  local pids
  pids="$(lsof -nP -iTCP:"${port}" -sTCP:LISTEN -t 2>/dev/null || true)"
  pids="$(printf '%s\n' "${pids}" | sort -u | tr '\n' ',' | sed 's/,$//; s/,/, /g')"

  if [[ -n "${pids}" ]]; then
    echo "${service_name} cannot start because port ${port} is already in use by PID(s): ${pids}" >&2
    exit 1
  fi
}

stop_listening_processes() {
  local port="$1"
  local service_name="$2"

  if ! command -v lsof >/dev/null 2>&1; then
    echo "lsof is required to check whether port ${port} is available." >&2
    exit 1
  fi

  local pids
  pids="$(lsof -nP -iTCP:"${port}" -sTCP:LISTEN -t 2>/dev/null || true)"
  pids="$(printf '%s\n' "${pids}" | sort -u)"

  if [[ -z "${pids}" ]]; then
    return
  fi

  local display_pids
  display_pids="$(printf '%s\n' "${pids}" | tr '\n' ',' | sed 's/,$//; s/,/, /g')"

  echo "${service_name} is already running on port ${port}. Stopping PID(s): ${display_pids}."
  kill ${pids}

  local deadline
  deadline=$((SECONDS + 5))

  while [[ ${SECONDS} -lt ${deadline} ]]; do
    if [[ -z "$(lsof -nP -iTCP:"${port}" -sTCP:LISTEN -t 2>/dev/null || true)" ]]; then
      return
    fi

    sleep 0.2
  done
}

stop_listening_processes "${FRONTEND_PORT}" "Front-end dev server"
assert_port_available "${FRONTEND_PORT}" "Front-end dev server"

cd "${ROOT_DIR}"

echo "Starting front-end dev server on port ${FRONTEND_PORT}."
echo "Press Ctrl+C to stop the service."

exec npm run dev -- --port "${FRONTEND_PORT}" --strictPort
