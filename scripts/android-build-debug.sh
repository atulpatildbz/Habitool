#!/usr/bin/env bash
set -euo pipefail

if ! command -v /usr/libexec/java_home >/dev/null 2>&1; then
  echo "Could not find /usr/libexec/java_home (macOS tool)."
  echo "Set JAVA_HOME to a JDK 21 or 17 installation and retry."
  exit 1
fi

pick_java_home() {
  local version="$1"
  /usr/libexec/java_home -v "$version" 2>/dev/null || true
}

java_major_version() {
  local java_bin="$1"
  local raw
  raw="$("$java_bin" -version 2>&1 | head -n 1)"
  raw="${raw#*\"}"
  raw="${raw%%\"*}"
  echo "${raw%%.*}"
}

is_supported_major() {
  local major="$1"
  [[ "${major}" == "21" || "${major}" == "17" ]]
}

is_supported_java_home() {
  local home="$1"
  if [[ -z "${home}" || ! -x "${home}/bin/java" ]]; then
    return 1
  fi
  local major
  major="$(java_major_version "${home}/bin/java")"
  is_supported_major "${major}"
}

JAVA_HOME_CANDIDATE=""

if [[ -n "${JAVA_HOME:-}" && -x "${JAVA_HOME}/bin/java" ]]; then
  CURRENT_MAJOR="$(java_major_version "${JAVA_HOME}/bin/java")"
  if is_supported_major "${CURRENT_MAJOR}"; then
    JAVA_HOME_CANDIDATE="${JAVA_HOME}"
  fi
fi

if [[ -z "${JAVA_HOME_CANDIDATE}" ]]; then
  MAYBE_21="$(pick_java_home 21)"
  if is_supported_java_home "${MAYBE_21}"; then
    JAVA_HOME_CANDIDATE="${MAYBE_21}"
  fi
fi
if [[ -z "${JAVA_HOME_CANDIDATE}" ]]; then
  HOMEBREW_21="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"
  if is_supported_java_home "${HOMEBREW_21}"; then
    JAVA_HOME_CANDIDATE="${HOMEBREW_21}"
  fi
fi
if [[ -z "${JAVA_HOME_CANDIDATE}" ]]; then
  MAYBE_17="$(pick_java_home 17)"
  if is_supported_java_home "${MAYBE_17}"; then
    JAVA_HOME_CANDIDATE="${MAYBE_17}"
  fi
fi
if [[ -z "${JAVA_HOME_CANDIDATE}" ]]; then
  HOMEBREW_17="/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
  if is_supported_java_home "${HOMEBREW_17}"; then
    JAVA_HOME_CANDIDATE="${HOMEBREW_17}"
  fi
fi

if [[ -z "${JAVA_HOME_CANDIDATE}" ]]; then
  echo "No supported JDK found. Install JDK 21 (preferred) or JDK 17."
  echo "Example:"
  echo "  brew install --cask temurin@21"
  echo
  echo "Current java -version:"
  java -version || true
  exit 1
fi

export JAVA_HOME="${JAVA_HOME_CANDIDATE}"
export PATH="${JAVA_HOME}/bin:${PATH}"

echo "Using JAVA_HOME=${JAVA_HOME}"
java -version

cd android
./gradlew assembleDebug
