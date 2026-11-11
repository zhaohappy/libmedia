#!/bin/bash
set -euo pipefail

FFMPEG_SOURCE=${1:?Usage: apply-ffmpeg-patches.sh /path/to/FFmpeg}
PATCH_DIR=$(cd "$(dirname "$0")/patches" && pwd)
PATCH_FILE="$PATCH_DIR/ffmpeg-h264-idct8-simd.patch"

if git -C "$FFMPEG_SOURCE" apply --reverse --check "$PATCH_FILE" 2>/dev/null; then
  echo "FFmpeg H.264 SIMD IDCT8 fix already applied"
elif git -C "$FFMPEG_SOURCE" apply --check "$PATCH_FILE"; then
  git -C "$FFMPEG_SOURCE" apply "$PATCH_FILE"
  echo "Applied FFmpeg H.264 SIMD IDCT8 fix"
else
  echo "Cannot apply the H.264 SIMD IDCT8 fix; check the FFmpeg source version." >&2
  exit 1
fi
