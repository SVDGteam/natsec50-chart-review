#!/bin/zsh
set -e
cd -- "$(dirname -- "$0")"
if [[ ! -f dist/index.html ]]; then
  npm install --no-audit --no-fund
  npm run build
fi
exec python3 server.py --port 8765
