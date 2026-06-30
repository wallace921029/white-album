#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
BACKEND_PORT="${BACKEND_PORT:-3000}"

require_lsof() {
  if ! command -v lsof >/dev/null 2>&1; then
    echo "lsof is required to manage dev server ports." >&2
    exit 1
  fi
}

listening_pids() {
  local port="$1"
  lsof -nP -iTCP:"${port}" -sTCP:LISTEN -t 2>/dev/null || true
}

assert_port_available() {
  local port="$1"
  local service_name="$2"

  local pids
  pids="$(listening_pids "${port}")"
  pids="$(printf '%s\n' "${pids}" | sort -u | tr '\n' ',' | sed 's/,$//; s/,/, /g')"

  if [[ -n "${pids}" ]]; then
    echo "${service_name} cannot start because port ${port} is already in use by PID(s): ${pids}" >&2
    exit 1
  fi
}

stop_listening_processes() {
  local port="$1"
  local service_name="$2"

  local pids
  pids="$(listening_pids "${port}" | sort -u)"

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
    if [[ -z "$(listening_pids "${port}")" ]]; then
      return
    fi

    sleep 0.2
  done
}

require_lsof

stop_listening_processes "${FRONTEND_PORT}" "Front-end dev server"
stop_listening_processes "${BACKEND_PORT}" "Back-end dev server"

assert_port_available "${FRONTEND_PORT}" "Front-end dev server"
assert_port_available "${BACKEND_PORT}" "Back-end dev server"

FRONTEND_PID=""
BACKEND_PID=""

cleanup() {
  trap - INT TERM EXIT

  if [[ -n "${BACKEND_PID}" ]] && kill -0 "${BACKEND_PID}" 2>/dev/null; then
    kill "${BACKEND_PID}" 2>/dev/null || true
  fi

  if [[ -n "${FRONTEND_PID}" ]] && kill -0 "${FRONTEND_PID}" 2>/dev/null; then
    kill "${FRONTEND_PID}" 2>/dev/null || true
  fi

  wait 2>/dev/null || true
}

trap cleanup INT TERM EXIT

echo "Starting front-end dev server on port ${FRONTEND_PORT}."
(
  cd "${ROOT_DIR}"
  exec npm run dev -- --port "${FRONTEND_PORT}" --strictPort
) &
FRONTEND_PID=$!

echo "Starting back-end dev server on port ${BACKEND_PORT}."
(
  cd "${ROOT_DIR}/backend"
  exec npm run dev
) &
BACKEND_PID=$!

echo "front-end PID: ${FRONTEND_PID}"
echo "backend PID: ${BACKEND_PID}"
echo "Press Ctrl+C to stop both services."

# Exit (and trigger cleanup via the EXIT trap) as soon as either dev server
# stops. Polled instead of `wait -n` so this works on macOS' default bash 3.2.
while kill -0 "${FRONTEND_PID}" 2>/dev/null && kill -0 "${BACKEND_PID}" 2>/dev/null; do
  sleep 1
done
