# FlagPlayer
A simple YouTube Web-App focussed on music playback
(aka small project that my subconcious thought up to prevent myself from learning for pesky exams)

- Free, easy to modify and all important stuff happens client-side
- No official YouTube API used
- No third party code used
- Only 110kb - much smaller than YouTube and even Invidious. With care and compression, only 30kb download
- Standard player features (select streams freely, e.g. audio only)
- No arbitrary restrictions (e.g. background playback on mobile)
- Prooven interface including dark and light theme
- Basic settings
- Save and cache playlists in local database 
- Watch page including:
	- Comments and Threads
	- Related videos (excluding mixes and livestreams for now)
	- Playlists large and small
- Search (videos only) with filtering by category
- Channel page including all tabs

## Missing standard features
- Home Page
- Subscriptions / Feeds
- Subtitles
- Download Button
- Proper synchronized DASH playback with MediaSourceExtension
- Playlist/Channel search

## Future aspirations
- Separate Database Management Site: 
	- Multi-dimensional graphs showing correlation between videos (based on metadata or even media analysis)
	- Advanced playback filtering based on tags and corresponding weights (e.g. favour a specific genre)
	- Set operations on playlists (e.g. all music minus my favourites and music older than 5 months)
- Playlists including local media (or replace youtube streams with higher quality local media)
- Experiments to extract metadata (like lyrics) from description and/or comments or from wikis/databases
- Next-up queue overriding current playlist
- Related videos browser - dive into related videos of related videos (could work great with next-up queue) 

## Known Issues
- Video Playback, especially high resolutions, are super laggy and quickly go out of sync. Proper MSE implemenentation is needed AND local CORS server, since MSE would force all streams to be routed through a CORS server
- Wrong aspect of thumbnails for videos with 1. only low resolution thumbnail AND 2. non 16-9 ratio - pretty rare
- Current video title is original (not translated), while related videos, etc. are all translated
- Most video titles are translated... (there's hope though)

## How To Use

#### Hosts:  
- Official Host: https://flagplayer.seneral.dev  

#### Local Project:  

1. Download the project
2. Select a public CORS host (see /page/page.js, l.205 below HOST_CORS) or set up your own (see below)   
3. Load up /page/index.html  
4. Open the settings in FlagPlayer (gear top right)  
5. Set the CORS host field to your selected CORS host (default is restricted to official website)   
6. Search for videos or enter a playlist id in the search bar  

#### Local CORS Server:  

1. On Windows: Execute /server/CorsServer.bat
2. On Linux: Execute /server/CorsServer.sh
3. Note your local server adress as displayed in the console, usually http://localhost:8080
4. Open the settings in FlagPlayer (gear top right)
5. Enter local server adress into the Cors Server field
6. Reload page and enjoy comments  

Note: You need to start it every time OR set it up as a service  
You can also copy the .bat/.sh and put it on your desktop - just edit it to point to the yt-server.js file  

##### Why a CORS server?	
As any website scraping other website's content, a reverse-proxy needs to be set up so that the CORS policy doesn't block the request.

## Motivation
- YouTube is terribly bloated and loads embarassingly slow
- YouTube has several bugs hindering effective playback
- YouTube forces streaming of video - even if you only use audio
- YouTube doesn't allow background music playback on mobile
- Music Playback pf mixed content (local + YouTube) is difficult
- I wanted a cross-platform music player to do experiments on
- I wanted to do a more complex webpage
- YouTube is terribly bloa- ah.

## License
The project is licensed under the AGPLv3 license - see the license file for details.
I'd appreciate a sensible usage.
