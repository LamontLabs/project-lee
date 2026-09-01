#!/usr/bin/env bash
set -euo pipefail

# Post-merge runs with stdin closed. Keep dependency resolution non-interactive
# and prefer the already-populated pnpm store on the Replit runner.
export CI=true
pnpm install --frozen-lockfile --prefer-offline
pnpm --filter @workspace/db run push
