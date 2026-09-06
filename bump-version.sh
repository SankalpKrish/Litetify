#!/usr/bin/env bash
set -euo pipefail
OLD=$1  # e.g. 0.4.0
NEW=$2  # e.g. 1.0.0
# Cargo.toml
sed -i "s/^version = \"$OLD\"/version = \"$NEW\"/" src-tauri/Cargo.toml
# package.json
sed -i "s/\"version\": \"$OLD\"/\"version\": \"$NEW\"/" package.json
# tauri.conf.json
sed -i "s/\"version\": \"$OLD\"/\"version\": \"$NEW\"/" src-tauri/tauri.conf.json

echo "Bumped $OLD -> $NEW in Cargo.toml, package.json, tauri.conf.json"
