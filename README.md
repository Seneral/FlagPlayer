# FlagPlayer
A simple YouTube Web-App focussed on music playback

- Standard player features (e.g. audio only, background playback on mobile)
- Save playlists and cache audio for offline playback on the go
- Free, easy to modify and all important stuff happens client-side
- No official YouTube API used (so legally safe), no third party code used
- Only 30kb (download) / 110kb (memory) - much smaller than YouTube and even Invidious
- Standard Watch, Search and channel pages with a few restrictions
- Convenient settings, dark and light mode, etc.

## Missing standard features
- Subscriptions / Feeds
- Subtitles
- Proper synchronized DASH playback with MSE
- Playlist/Channel search
- View custom playlists of a channel 

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
- Video Playback, especially high resolutions, are pretty laggy and can go out of sync. Proper MSE implemenentation is needed AND local CORS server, since MSE would force all streams to be routed through a CORS server
- Wrong aspect of thumbnails for videos with 1. only low resolution thumbnail AND 2. non 16-9 ratio - pretty rare
- Current video title is original (not translated), while related videos, etc. are all translated
- Most video titles are translated... (there's hope though)

## How To Use

#### Hosts:  
- Official Host: https://flagplayer.seneral.dev  
- Development Host: https://www.seneral.dev/FlagPlayerDev  

#### Local Project:  

Useful for development, but all ServiceWorker features (audio caching, etc) are disabled
1. Download the project (master)
2. Set up your own local CORS server (see below)   
3. Load up /page/index.html  
4. Open the settings in FlagPlayer (gear top right)  
5. Set the CORS host field to your local CORS host (default is restricted to official website)   

#### Local CORS Server:  

1. Download the project (master)
2. Install [node.js](https://nodejs.org)
3. On Windows: Execute /server/CorsServer.bat
4. On Linux: Execute /server/CorsServer.sh
5. Note your local server adress as displayed in the console, usually http://localhost:8080
6. Open the settings in FlagPlayer (gear top right)
7. Enter local server adress into the Cors Server field

Note: You need to start the local CORS server every time OR set it up as a service  
You can also copy the .bat/.sh and put it on your desktop - just edit it to point to the yt-server.js file  

## Implementation

#### Why a separate CORS server?	
Direct request from one website to another website are usually blocked by the browser itself according to the Cross-Origin Resource Sharing (CORS) policy to prevent Cross-Site Request Forgery (XSRF). For any website scraping other website's content that means a reverse-proxy needs to be set up so that the CORS policy doesn't block the request. Simply rerouting the request to a local server which does not oblique by the same rules as the browser circumvents this.

#### How does media playback work?
YouTube uses something calles Media Source Extension (MSE) to exactly control the behaviour of buffering (loading) - since that means all request are script-controlled, all media fetch requests would now fall under the CORS policy and would have to be proxied. Since that would add immense load on public servers, I've chosen to make a hacky replacement to support DASH streams (where audio and video is separated), which works for most videos up to 2k. Additionally, the legacy streams (audio and video combined, only up to 720p) are supported as well. <br>
This does however mean that buffering, etc. is still handled by the browser, and it subject to it's whims and bugs.   Sometimes, a promise to start a stream will never resolve (Chrome), and the stream has to be restarted, resulting in audio glitches. Sometimes, the browser might arbitrarily decide to lower the buffering size, effectively preventing preload of anything more than 2s of video - especially a problem on low-bandwidth networks.

## Motivation
- YouTube is terribly bloated and loads embarassingly slow
- YouTube has several bugs hindering effective playback
- YouTube forces streaming of video - even if you only use audio
- YouTube doesn't allow background music playback on mobile
- Music Playback of mixed content (local + YouTube) is difficult
- I wanted a cross-platform music player to do experiments on
- I wanted to do a more complex webpage
- YouTube is terribly bloa- ah.

## License
The project is licensed under the AGPLv3 license - see the license file for details.
This is mainly to prevent copys of the website replacing the CORS server with a custom host that might or might not do dubious things to your data. I'd appreciate a sensible usage.
