# FlagPlayer
A simple YouTube Web-App focused on music playback

- Free, easy to modify and client-side
- No official YouTube API used
- No third party code used
- Save and cache playlists in local database
  - Free without looping bugs!
- Mobile support (install as web app!) - with audio only and background playback
- Cache individual videos (audio only) for offline playback
- Watch page including:
	- Comments and Threads (only on custom local server)
	- Related videos (excluding mixes and livestreams for now)
- Search + Channel page

## Missing standard features
- Subscriptions / Feeds
- Subtitles
- Proper synchronized DASH playback with MediaSourceExtension
- Search limited to Playlists/Channels

## Known Issues
- Video Playback, especially high resolutions, is super laggy and quickly goes out of sync. Proper MSE implemenentation is needed, which requires routing all video data over the backend server
- Wrong aspect of thumbnails for videos with 1. only low resolution thumbnail AND 2. non 16-9 ratio - pretty rare
- Current video title is original (not translated), while related videos, etc. are all translated
- Most video titles are translated... (there's hope though)

## Future aspirations
- Separate Database Management Site: 
	- Multi-dimensional graphs showing correlation between videos (based on metadata or even media analysis)
	- Advanced playback filtering based on tags and corresponding weights (e.g. favour a specific genre)
	- Set operations on playlists (e.g. all music minus my favourites and music older than 5 months)
- Playlists including local media (or replace streams with higher quality local media)
- Experiments to extract metadata (like lyrics) from description and/or comments or from wikis/databases
- Next-up queue overriding current playlist
- Related videos browser - dive into related videos of related videos (could work great with next-up queue) 

## How To Use

### Public Hosts:  
- [Official WebApp](https://flagplayer.seneral.dev)
- [Official Backend](https://flagplayer-cors.seneral.dev/)

### Local WebApp:  
Warning: Since browsers don't treat local files as proper web apps, certain features will not work. Your priority should be on using a local backend.
1. Download the project on the master branch
3. Load up /page/index.html

### Local Backend:
1. Download the project on the master branch
1. On Windows: Execute /server/Setup.bat and /server/CorsServer.bat
2. On Linux: Execute /server/Setup.sh and /server/CorsServer.sh
3. Note your local server adress as displayed in the console, usually http://localhost:8080
4. Open the settings in the WebApp (gear top right)
5. Enter local server adress into the Cors Server field

### Recommended for Local Desktop Use:
Create a script that a) launches & kills your local backend and b) launches the installed FlagPlayer WebApp.
It will use the official host of the WebApp, so the browser will do automatic requests to "sw.js" to check for updates, but NO traffic will go through public servers. Set-and-forget solution.
This will create an experience very close to a native desktop app when added to your application launcher.
Example for linux and chromium (it runs better on Chromium than on Firefox):
``` Bash
#!/bin/sh

export HOST=localhost
export PORT=26060
node --max-http-header-size=65536 yt-server.js &
export SERVER_PID=$!

#/usr/bin/chromium --profile-directory=Default --app-id=bfnegiddnbgkelpklhkmpgihhpfgobjm
flatpak 'run' '--command=/app/bin/chromium' 'com.github.Eloston.UngoogledChromium' '--profile-directory=Default' '--app-id=bfnegiddnbgkelpklhkmpgihhpfgobjm'

kill $SERVER_PID
```

## About the Backend Server
As any website scraping other website's content, a reverse-proxy needs to be set up so that the CORS policy doesn't block the request.
There are a few freely available servers out there, but for actual usage you should NEVER rely on them:  
1. They're usually slow and not very reliable
2. They provide the service for testing purposes, NOT constant usage - you might get blocked
3. Custom local server allows you to see comments (since these requests need another flag that a website cannot set itself)
So follow the Instructions above to set up a local server.  
This is a modified CORS Anywhere server that differs in that it passes certain cookies and modifies the header to look like genuine same-origin requests.

## Motivation
- YouTube is terribly bloated and loads embarassingly slow
- YouTube has several bugs hindering effective playback
- YouTube forces streaming of video - even if you only use audio
- I wanted a cross-platform music player to do experiments on
- I wanted to do a more complex webpage
- YouTube is terribly bloa- ah.

## License
The project is licensed under the AGPLv3 license - see the license file for details.
I'd appreciate a sensible usage.
