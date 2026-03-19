#!/bin/bash
# Install Playwright Chromium if not already present
if [ ! -d "/home/site/wwwroot/.playwright-browsers" ]; then
    echo "Installing Playwright Chromium..."
    cd /home/site/wwwroot
    npx playwright install chromium --with-deps 2>&1
    echo "Playwright Chromium installed"
else
    echo "Playwright Chromium already installed"
fi
