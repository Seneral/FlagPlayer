#!/bin/sh

cd "$(dirname "$0")/"
export HOST=localhost
export PORT=8080
node yt-server.js
