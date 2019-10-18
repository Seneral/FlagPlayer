ECHO OFF
SET HOST=localhost
SET PORT=8080
node --max-http-header-size=65536 yt-server.js
cmd /k