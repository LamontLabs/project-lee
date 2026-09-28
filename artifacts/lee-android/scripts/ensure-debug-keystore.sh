#!/usr/bin/env bash
set -euo pipefail

keystore="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/android/app/debug.keystore"
if [[ -f "$keystore" ]]; then
  exit 0
fi

command -v keytool >/dev/null 2>&1 || {
  echo "keytool is required to create the ephemeral Android debug keystore." >&2
  exit 1
}

mkdir -p "$(dirname "$keystore")"
keytool -genkeypair \
  -keystore "$keystore" \
  -storepass android \
  -alias androiddebugkey \
  -keypass android \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -dname "CN=Android Debug,O=Android,C=US" \
  >/dev/null 2>&1
echo "Created an ephemeral debug keystore at android/app/debug.keystore."