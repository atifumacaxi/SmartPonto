#!/bin/bash

# Force clear cache and rebuild
echo "🧹 Clearing cache and forcing clean build..."

# Remove any existing cache directories
rm -rf /tmp/pip-cache
rm -rf ~/.cache/pip
rm -rf /root/.cache/pip

# Clear apt cache
apt-get clean
rm -rf /var/lib/apt/lists/*

# Force reinstall dependencies
pip install --no-cache-dir --upgrade pip
pip install --no-cache-dir -r requirements.txt

echo "✅ Cache cleared and dependencies reinstalled"
