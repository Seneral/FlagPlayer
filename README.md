# FlagPlayer
A simple YouTube Web-App focussed on music playback
(aka small project that my subconcious thought up to prevent myself from learning for pesky exams)

- Free, easy to modify and all important stuff happens client-side
- No official YouTube API used
- No third party code used
- Standard player features (select streams freely, e.g. audio only)
- Prooven interface including dark and light theme
- Basic settings
- Save and cache playlists in local database 
- Watch page including:
	- Comments and Threads (only on custom local server)
	- Related videos (excluding mixes and livestreams for now)
	- Playlists large and small
- Search (videos only) with filtering by category
- Channel page including all tabs

## Missing standard features
- Subscriptions / Feeds
- Subtitles
- Download Button
- Proper synchronized DASH playback with MediaSourceExtension
- Playlist/Channel search
- Better mobile and touch support (not tested)

## Future aspirations
- Separate Database Management Site: 
	- Multi-dimensional graphs showing correlation between videos (based on metadata or even media analysis)
	- Advanced playback filtering based on tags and corresponding weights (e.g. favour a specific genre)
	- Set operations on playlists (e.g. all music minus my favourites and music older than 5 months)
- Playlists including local media (or replace streams with higher quality local media)
- Experiments to extract metadata (like lyrics) from description and/or comments or from wikis/databases
- Next-up queue overriding current playlist
- Related videos browser - dive into related videos of related videos (could work great with next-up queue) 

## Known Issues
- Video Playback, especially high resolutions, are super laggy and quickly go out of sync. Proper MSE implemenentation is needed
- Wrong aspect of thumbnails for videos with 1. only low resolution thumbnail AND 2. non 16-9 ratio - pretty rare
- Can't open internal links in new tabs (will have to revert back to more standard navigation)
- Current video title is original (not translated), while related videos, etc. are all translated
- Most video titles are translated... (there's hope though)

## How To Use
Hosts:  
- No hosts so far
Local Project:  
1. Download the project
2. Load up /page/index.html
3. Search for videos or enter a playlist id in the search bar
Advanced Server for comments:  
1. On Windows: Execute /server/CorsServer.bat
2. On Linux: Execute /server/CorsServer.sh
3. Note your local server adress as displayed in the console, usually http://localhost:8080
4. Open the settings in the webpage (gear open right)
5. Enter local server adress into the Cors Server field
6. Reload page and enjoy comments
Note: You need to start it every time OR set it up as a service  
You can also copy the .bat/.sh and put it on your desktop - just edit it to point to the yt-server.js file  

## Server Requirements
As any website scraping other website's content, a reverse-proxy needs to be set up so that the CORS policy doesn't block the request. There are a few freely available servers out there, but for actual usage you should NEVER rely on them:  
1. They're usually slow and not very reliable
2. They provide the service for testing purposes, NOT constant usage - you might get blocked
3. Custom local server allows you to see comments
So follow the Instructions above to set up a local server.  
This is a modified CORS Anywhere server that differs in that it passes certain cookies and modifies the header to look like genuine same-origin requests. DO NOT host this server publicly, there are no safeguards activated to prevent abuse of your network.

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