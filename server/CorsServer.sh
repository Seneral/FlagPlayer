#!/bin/sh

cd "$(dirname "$0")/"
export HOST=localhost
export PORT=8080
node --max-http-header-size=65536 yt-server.js
