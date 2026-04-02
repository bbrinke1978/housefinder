#!/bin/bash
# Permanent startup script for Azure Linux App Service.
# Chromium binary is deployed inside node_modules (PLAYWRIGHT_BROWSERS_PATH=0 in CI).
# This script installs the SYSTEM LIBRARIES that Chromium needs to run.
#
# Set as Azure startup command:
#   az webapp config set -g housefinder-rg -n housefinder-scraper --startup-file /home/site/wwwroot/startup.sh

MARKER="/tmp/.chromium-deps-installed"

if [ ! -f "$MARKER" ]; then
    echo "[startup.sh] Installing Chromium system dependencies..."
    apt-get update -qq 2>/dev/null
    apt-get install -y --no-install-recommends \
        libnss3 \
        libnspr4 \
        libatk1.0-0 \
        libatk-bridge2.0-0 \
        libcups2 \
        libdrm2 \
        libxkbcommon0 \
        libxcomposite1 \
        libxdamage1 \
        libxrandr2 \
        libgbm1 \
        libpango-1.0-0 \
        libcairo2 \
        libasound2 \
        libatspi2.0-0 \
        libxshmfence1 \
        fonts-liberation \
        2>/dev/null
    touch "$MARKER"
    echo "[startup.sh] Chromium dependencies installed successfully."
else
    echo "[startup.sh] Chromium dependencies already installed (marker exists)."
fi
