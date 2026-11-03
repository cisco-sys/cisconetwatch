#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"
echo "Reconstructing CiscoNetWatch full source..."
cat sc_*.b64 | base64 -d > /tmp/cnw-src.tar.gz
tar -xzf /tmp/cnw-src.tar.gz -C "$(dirname "$DIR")"
echo "Done. Source extracted next to source-archive/"
ls -la "$(dirname "$DIR")" | head
