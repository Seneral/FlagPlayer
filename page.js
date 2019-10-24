/* ------------------------------------ */
/* ---- TABLE OF CONTENTS -------------	*/
/* 

-- HTML
-- Variables

Control Functions
-- Init
-- Preferences
-- Page Content
-- Paged Content
-- Home
-- Playlist
-- Search
-- Channel
- Media
-- Media State
-- Media Playback

Database

YouTube
- Page Navigation
- YouTube Extraction
-- Playlist
-- Search
-- Channel
-- Watch
-- Related Videos
-- Comments
- Stream Decoding

UI Content
-- UI Layout
-- UI State
-- Formatting
-- UI Settings
-- UI Home
-- UI Player
-- UI Video
-- UI Related
-- UI Comments
-- UI Search
-- UI Channel
-- UI Playlist

UI Interactivity
-- UI Helpers
-- UI Controls
-- UI Generic
-- UI Timeline
-- UI Control Bar
-- UI Handlers

UI Callbacks
-- DOM Handlers
-- Button Handlers
-- Mouse Handlers
-- Keyboard Handlers
-- Media Handlers

Media Functions
-- Streams
-- State
-- Playback

Utility Functions
-- Requests
-- Experimental
-- HTML Bin

Data

*/
/* ------------------------------------ */


function I (i) { return document.getElementById(i); }
function S (i,v) { localStorage.setItem(i,v); }
function G (i) { return localStorage.getItem(i); }
function setDisplay (i,v) { I(i).style.display = v; }
Element.prototype.toggleAttr = function toggleAttr(name) {
    if (this.hasAttribute(name)) {
    	this.removeAttribute(name);
    	return false;
    }
	this.setAttribute(name, "");
	return true;
};


/* -------------------- */
/* ---- HTML ----------	*/
/* -------------------- */

// Container
var ht_container = I("container");
var ht_content = I("content");
var ht_mobile = I("mobile");
var ht_main = I("main");
var ht_side = I("side");
// Sections
var sec_player = I("player");
var sec_playlist = I("playlist");
var sec_video = I("video");
var sec_related = I("related");
var sec_comments = I("comments");
var sec_search = I("search");
var sec_banner = I("banner");
var sec_channel = I("channel");
var sec_home = I("home");
// Main media elements
var videoMedia = I("videoMedia");
var audioMedia = I("audioMedia");
var controlBar = I("controlBar");
// Frequently accessed control bar elements
var timeLabel = I("timeLabel");
var timelineControl = I("tlControl");
var timelinePosition = I("tlPosition");
var timelineProgress = I("tlProgress");
var timelinePeeking = I("tlPeeking");
var timelineBuffered = I("tlBuffered");


/* -------------------- */
/* ---- VARIABLES -----	*/
/* -------------------- */

/* SERVICE WORKER */
var sw_current;
var sw_updated;
var sw_refreshing;

/* DATABASE */
var db_database;
var db_loading = false;
var db_accessCallbacks = [];
var db_indexLoading = false;
var db_indexCallbacks = [];
var db_playlists; // [ { listID, title, description, author, count, thumbID, videos [ videoID ] } ]

/* PAGE STATE */
var Page = { None: 0, Home: 1, Media: 2, Search: 3, Channel: 4, Playlist: 5 }
var ct_page = Page.Home;
var ct_pagePlaylist;
var ct_temp = { fullscreen: false, options: false, settings: false, loop: false, } // options: player; settings: page 
var ct_pagedContent = []; // id, container, autoTrigger, triggerDistance, aborted, loading, loadFunc, page, data
var ct_isDesktop;

/* MEDIA STATE */
var State = { None: 0, Loading: 1, PreStart: 2, Started: 3, Ended: 4, Error: 5 }
var ct_state = State.None; // Lifetime: loading - prestart (if autoplay denied) - started - ended
var ct_sources = undefined; // { video: url, audio: url }
var ct_paused = true; // Current state or intent
var ct_flags = { buffering: false, seeking: false } // Only valid during State.Started
var ct_isPlaying = function () { return ct_sources && ct_state == State.Started && !ct_paused && !ct_flags.buffering && !ct_flags.seeking; };
var ct_curTime = 0, ct_totalTime = 0;
var ct_pref = {}; // volume, muted, playlistRandom, autoplay, dash, dashVideo, dashContainer, legacyVideo

/* YOUTUBE CONTENT */
var yt_url; // URL of respective youtube content
var yt_page; // cookies {}, secrets {}, initialData {}, playerConfig {}, videoDetail {}, html "", object {}
	// secrets: csn, xsrfToken, idToken, innertubeAPIKey, clientName, clientVersion, pageCL, pageLabel, variantsChecksum, visitorData, ...
// Playlist
var yt_playlistID;
var yt_playlist; // listID, title, author, views, description, videos [ video {} ]
	// video: title, videoID, length, thumbnailURL, addedDate, uploadedDate, uploader {}, views, likes, dislikes, comments, tags []
	// uploader: name, channelID, url
// Video
var yt_videoID;
var yt_video; // ageRestricted, blocked, useCipher, meta {}, streams [ stream {} ], related {}, commentData {}
	// meta: title, description, uploader {}, uploadedDate, thumbnailURL, length, views, likes, dislikes, metadatata[{ name, data }], category
		// uploader: name, url, channelID, userID, profileImg, badge, subscribers
	// stream: url, itag, hasVideo, hasAudio, isDash, mimeType, container, isLive, isStereo, 
		// vCodec, vBR (Bitrate), vResX, vResY, vFPS,
		// aCodec, aBR (Bitrate), aSR (Sample Rate), aChannels
// Search
var yt_searchTerms;
var yt_searchResults; // hits, videos [video {}]
	// video: title, videoID, length, thumbnailURL, addedDate, uploadedDate, uploader {}, views, likes, dislikes, comments, tags []
	// uploader: name, channelID, url
// Channel
var yt_channelID; // channel, user
var yt_channel; // meta {}, upload {}
	// meta: title, channelID, profileImg, bannerImg, url, subscribers, description, links { title icon link }
	// upload: videos [video {}], conToken
	// video: title, videoID, views, length, thumbnailURL uploadedTimeAgoText

/* TEMPORARY STATE */
var yt_playlistLoaded; // Event triggered when playlist is fully loaded
var ct_isAdvancedCorsHost; // Boolean: Supports cookie-passing for (with others) comments
var ct_traversedHistory; // Prevent messing with history when traversing
var ct_timerAutoplay; // Timer ID for video end autoplay timer
var ui_cntControlBar; // For control bar retraction when mouse is unmoving
var ui_timerIndicator; // Timer ID for the current temporary indicator (pause/plax) on the video screen
var ui_dragSlider; // Currently dragging a slider?
var ui_dragSliderElement; // Currently dragged slider element 
var md_timerSyncMedia; // Timer ID for next media sync attempt (dash only)
var md_timerCheckBuffering; // Timer ID for next media buffering check (and start video when ready)
var md_cntBufferPause; // Count of intervals (50ms) in which buffered amount did not change
var md_lastBuffer; // Last known buffered amount, used because buffered events don't always fire
var md_attemptPlayStarted; // Flag to prevent multiple simultaneous start play attempts
var md_attemptPause; // Flag to indicate play start attempt is to be aborted

/* CONSTANTS */
const LANG_INTERFACE = "en;q=0.9";
const LANG_CONTENT = "en;q=0.9"; // content language (auto-translate) - * should remove translation
const HOST_YT = "https://www.youtube.com";
const HOST_YT_MOBILE = "https://m.youtube.com";
const HOST_YT_IMG = "https://i.ytimg.com/vi/"; // https://i.ytimg.com/vi/ or https://img.youtube.com/vi/
const HOST_CORS = "https://flagplayer-cors.herokuapp.com/"; // Default value only
//"http://localhost:8080/";
//"https://cors-anywhere.herokuapp.com/"; 
//"http://allow-any-origin.appspot.com/";
//"https://secret-ocean-49799.herokuapp.com/";
//"https://test.cors.workers.dev/";
//"https://crossorigin.me/"

//endregion

/* -------------------------------------------------------------------------------------------------------------- */
/* ----------------- SERVICE WORKER ----------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------------------------------------------- */

function sw_install () { 
	// Setup service worker for caching control
	if ("serviceWorker" in navigator) {

		navigator.serviceWorker.oncontrollerchange = function () {
			if (sw_refreshing) return;
			window.location.reload();
			sw_refreshing = true;
		};

		navigator.serviceWorker.register("./sw.js").then(function(registration) {
			// Get current service worker
			sw_current = navigator.serviceWorker.controller;
			if (sw_current) console.log("Successfully installed service worker: Caching and Offline Mode are available!");
			else console.log("Successfully installed service worker: Caching and Offline Mode are available after reload!");
			// Check for updates
			registration.onupdatefound = function () {
				if (!navigator.serviceWorker.controller) 
					return; // not an update, but initial installation
				console.log("Found new service worker version!");
				var update = function () {
					sw_updated = registration.waiting || registration.active;
					setDisplay("newVersionPanel", "");
					console.log("New service worker version ready for activation!");
				};
				var installing = registration.installing;
				if (installing) {
					installing.onstatechange = function () {
						if (installing.state == "installed" || installing.state == "active") 
							update();
					};
				}
				else update();
			};
		}, function(e) {
			console.warn("Failed to install service worker: Caching and Offline Mode will be unavailable!");
		});
	}
}
function sw_update () { 
	sw_updated.postMessage({ action: "skipWaiting" });
	setDisplay("newVersionPanel", "none");
}


/* -------------------------------------------------------------------------------------------------------------- */
/* ----------------- CONTROL FUNCTIONS -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------------------------------------------- */
//region


/* -------------------- */
/* ---- INIT ----------	*/
/* -------------------- */

function ct_init () {
	ct_loadPreferences();
	ui_updatePageLayout();
	ui_initStates();
	ct_newPageState();
	ui_setupEventHandlers();
	ct_readParameters();
	ct_loadContent();
	sw_install();
}


/* -------------------- */
/* ---- PREFERENCES ---	*/
/* -------------------- */

function ct_loadPreferences () {
	ct_pref = {};
	// Playback options
	ct_pref.dash = G("prefDash") == "false"? false : true;
	ct_pref.legacyVideo = G("prefLegacyVideo") || "BEST"; // NONE - BEST - WORST - <Resolution>
	ct_pref.dashVideo = G("prefDashVideo") || "72030"; // NONE - BEST - WORST - <Resolution*100+FPS>
	ct_pref.dashAudio = G("prefDashAudio") || "160"; // NONE - BEST - WORST - <Bitrate>
	ct_pref.dashContainer = G("prefDashContainer") || "mp4"; // webm - mp4
	ct_pref.muted = G("prefMuted") == "true"? true : false;
	ct_pref.volume = G("prefVolume") != undefined? parseFloat(G("prefVolume")) : 1;
	// Page Settings
	ct_pref.playlistRandom = G("prefPlaylistRandom") == "false"? false : true;
	ct_pref.autoplay = G("prefAutoplay") == "false"? false : true;
	ct_pref.theme = G("prefTheme") || "DARK";
	ct_pref.corsAPIHost = G("prefCorsAPIHost") || HOST_CORS;
	ct_pref.relatedVideos = G("prefRelated") || "ALL";
	ct_pref.filterCategories = (G("prefFilterCategories") || "").split(",").map(c => parseInt(c));
	ct_pref.filterHideCompletely = G("prefFilterHideCompletely") == "false"? false : true;
	ct_pref.loadComments = G("prefLoadComments") == "false"? false : true;
}
function ct_savePreferences () {
	// Playback Options
	S("prefDash", ct_pref.dash);
	if (ct_sources) {
		S("prefLegacyVideo", ct_pref.legacyVideo);
		S("prefDashVideo", ct_pref.dashVideo);
		S("prefDashAudio", ct_pref.dashAudio);
		S("prefDashContainer", ct_pref.dashContainer);
	}
	S("prefMuted", ct_pref.muted);
	S("prefVolume", ct_pref.volume);
	// Page Settings
	S("prefAutoplay", ct_pref.autoplay);
	S("prefPlaylistRandom", ct_pref.playlistRandom);
	S("prefTheme", ct_pref.theme);
	S("prefRelated", ct_pref.relatedVideos);
	S("prefFilterCategories", ct_pref.filterCategories.join(","));
	S("prefFilterHideCompletely", ct_pref.filterHideCompletely);
	S("prefLoadComments", ct_pref.loadComments);
	S("prefCorsAPIHost", ct_pref.corsAPIHost);
}


/* -------------------- */
/* ---- PAGE CONTENT --	*/
/* -------------------- */

function ct_readParameters () {
	var params = new URLSearchParams(window.location.search);
	// Read parameters from URL
	yt_playlistID = params.get("list");
	yt_videoID = params.get("v");
	yt_channelID = { channel: params.get("c"), user: params.get("u") };
	yt_searchTerms = params.get("q");
	// Validate parameters
	if (yt_videoID && yt_videoID.length != 11) yt_videoID = undefined;
	if (!yt_channelID.user && (!yt_channelID.channel || yt_channelID.channel.length != 24 || !yt_channelID.channel.startsWith("UC"))) yt_channelID = undefined;
	if (yt_playlistID && yt_playlistID.length != 34) yt_playlistID = undefined;
	yt_searchTerms = yt_searchTerms? decodeURIComponent(yt_searchTerms) : undefined;
}
function ct_resetContent () {
	ct_page = Page.None;
	// Discard main content (not including playlist)
	ct_resetSearch();
	ct_resetChannel();
	ct_mediaUnload();
	ui_resetHome();
}
function ct_loadContent () {
	// Primary Content
	if (yt_videoID) {
		ct_page = Page.Media;
		ct_mediaLoad ();
	} else if (yt_channelID) {
		ct_page = Page.Channel;
		ct_loadChannel();
	} else if (yt_searchTerms) {
		ct_page = Page.Search;
		ct_loadSearch();
	//} else if (yt_playlistID) {
	//	ct_page = Page.Playlist;
	} else {
		ct_page = Page.Home;
		ct_loadHome();
	}
	// Secondary Content (can be primary)
	if (yt_playlistID) {
		ct_pagePlaylist = true;
		ct_loadPlaylist();
	} else {
		ct_pagePlaylist = false;
	}
	ct_updatePageState();
}
function ct_newPageState () { // Register new page
	history.pushState({}, "FlagPlayer");
}
function ct_updatePageState () { // Update page with new information
	var url = new URL(window.location.href);
	var state = history && history.state? history.state : {};
	yt_url = HOST_YT;
	
	if (ct_page == Page.Home)
		state.title = "Home | FlagPlayer";

	if (ct_page == Page.Media)  {
		if (yt_video) state.title = yt_video.meta.title + " | FlagPlayer";
		else if (!state.title) state.title = "Loading | FlagPlayer";
		url.searchParams.set("v", yt_videoID);
		yt_url += "/watch?v=" + yt_videoID;
	} else url.searchParams.delete("v");
	
	if (ct_page == Page.Channel) {
		if (yt_channel) state.title = yt_channel.meta.name + " | FlagPlayer";
		else if (!state.title) state.title = "Channel | FlagPlayer";
		if (yt_channelID.user) {
			url.searchParams.set("u", yt_channelID.user);
			url.searchParams.delete("c");
			yt_url += "/user/" + yt_channelID.user;
		} else {
			url.searchParams.set("c", yt_channelID.channel);
			url.searchParams.delete("u");
			yt_url += "/channel/" + yt_channelID.channel;
		}
	} else { 
		url.searchParams.delete("c");
		url.searchParams.delete("u");
	}
	
	if (ct_page == Page.Search) {
		state.title = "'" + yt_searchTerms + "' - Search | FlagPlayer";
		url.searchParams.set("q", encodeURIComponent(yt_searchTerms));
		yt_url += "/results?search_query=" + encodeURIComponent(yt_searchTerms);
	} else url.searchParams.delete("q");
	
	if (ct_pagePlaylist) {
		url.searchParams.set("list", yt_playlistID);
		if (ct_page == Page.Playlist) yt_url += "/playlist?list=" + yt_playlistID;
		if (ct_page == Page.Media) yt_url += "&list=" + yt_playlistID;
		(I("youtubePLLink") || {}).href = HOST_YT + "/playlist?list=" + yt_playlistID;
	} else url.searchParams.delete("list");
	
	// TODO: only delete if not for current video
	url.searchParams.delete("t");
	
	// Update state
	state.title = state.title || "FlagPlayer";
	document.title = state.title;
	if (history && history.replaceState) history.replaceState(state, state.title, url.href);
	else window.location = url; // Triggers reload, not perfect but better than no link update
	[].forEach.call(document.getElementsByClassName("youtubeLink"), function (l) { l.href = yt_url });
}
function ct_getNavLink(navID) {
	var url = new URL(window.location);
	url.search = "";
	if (yt_playlistID) url.searchParams.set("list", yt_playlistID);
	var match = navID.match(/^(.*?)=(.*)$/);
	if (match) url.searchParams.set(match[1], match[2]);
	return url.href;
}
function ct_beforeNav () {
	ct_resetContent();
}
function ct_performNav () {
	//window.scrollTo(0, 0);
	document.body.scrollTop = 0;
	//container.scrollTop = 0;
	//content.scrollTop = 0;
	ct_newPageState();
	ct_loadContent();
}


/* -------------------- */
/* ---- PAGED CONTENT -	*/
/* -------------------- */

function ct_registerPagedContent(id, container, loadFunc, trigger, data) {
	ct_removePagedContent(id);
	var pagedContent = {
		id: id,
		container: container,
		autoTrigger: Number.isInteger (trigger)? true : trigger,
		triggerDistance: Number.isInteger (trigger)? trigger : undefined,
		loadFunc: loadFunc,
		loading: false,
		index: 0,
		data: data,
	};
	ct_pagedContent.push (pagedContent);
	return pagedContent;
}
function ct_removePagedContent(id) {
	var i;
	while ((i = ct_pagedContent.findIndex(p => p.id == id)) >= 0) {
		if (ct_pagedContent[i].loading) ct_pagedContent[i].aborted = true;
		ct_pagedContent.splice(i, 1);
	}
}
function ct_getPagedContent(id) {
	return ct_pagedContent.find(p => p.id == id);
}
function ct_triggerPagedContent(id) {
	var pagedContent = ct_getPagedContent(id);
	if (pagedContent) pagedContent.loadFunc(pagedContent);
}
function ct_checkPagedContent() {
	for (var i = 0; i < ct_pagedContent.length; i++) {
		var pagedContent = ct_pagedContent[i];
		if (pagedContent.loading || !pagedContent.autoTrigger) continue;
		var rect = pagedContent.container.getBoundingClientRect();
		var viewportHeight = window.innerHeight || document.documentElement.clientHeight;
		if (!pagedContent.triggerDistance || rect.bottom - viewportHeight <= pagedContent.triggerDistance)
			pagedContent.loadFunc(pagedContent);
	}
}


/* -------------------- */
/* ---- HOME ----------	*/
/* -------------------- */

function ct_loadHome () {
	ui_setupHome();
}


/* -------------------- */
/* ---- PLAYLIST ------	*/
/* -------------------- */

function ct_loadPlaylist (plID) {
	if (yt_playlist && (!plID || plID == yt_playlistID)) return;
	if (plID) yt_playlistID = plID;
	yt_playlist = undefined;
	if (plID) ui_resetPlaylist(); // usually replacing existing playlist
	ct_pagePlaylist = true;
	ui_setupPlaylist();
	db_loadPlaylistIndex(function () {
		if (!db_hasPlaylistSaved(yt_playlistID)) {
			yt_loadPlaylistData();
		} else {
			db_loadPlaylist(function () {
				ui_addToPlaylist(0);
				ui_setPlaylistFinished();
			});
		}
	});
	ct_updatePageState();
}
function ct_updatePlaylist () {
	if (yt_playlistID) {
		yt_playlist = undefined;
		ui_resetPlaylist();
		ui_setupPlaylist();
		yt_loadPlaylistData();
		yt_playlistLoaded = function () {
			db_updatePlaylist();
		};
	}
}
function ct_resetPlaylist () {
	ct_newPageState();
	ct_pagePlaylist = false;
	yt_playlistID = undefined;
	yt_playlist = undefined;
	ui_resetPlaylist()
	ct_updatePageState();
}
function ct_getVideoPlIndex () { // Return -1 on fail so that pos+1 will be 0
	return !yt_playlist? -1 : yt_playlist.videos.findIndex(v => v.videoID == yt_videoID);
}


/* -------------------- */
/* ---- SEARCH --------	*/
/* -------------------- */

function ct_navSearch(searchTerms) {
	var plMatch = searchTerms.match(/(PL[a-zA-Z0-9_-]{32})/);
	var vdMatch = searchTerms.match(/v=([a-zA-Z0-9_-]{11})/);
	if (plMatch) ct_loadPlaylist(plMatch[1]);
	if (!plMatch || vdMatch) {
		ct_beforeNav();
		if (vdMatch) yt_videoID = vdMatch[1];
		else yt_searchTerms = searchTerms;
		ct_performNav();
	}
}
function ct_loadSearch() {
	ct_registerPagedContent("SC", I("searchContainer"), yt_loadSearchResultsAJAX, 1000, undefined);
	ct_checkPagedContent();
	ui_setupSearch();
}
function ct_resetSearch () {
	ct_removePagedContent("SC");
	ui_resetSearch();

	yt_searchTerms = undefined;
	yt_searchResults = undefined;
}


/* -------------------- */
/* ---- CHANNEL -------	*/
/* -------------------- */

function ct_navChannel(channel) {
	ct_beforeNav();
	yt_channelID = channel;
	ct_performNav();
}
function ct_loadChannel() {
	yt_loadChannelData();
}
function ct_resetChannel () {
	ct_removePagedContent("CH");
	ui_resetChannelMetadata();
	ui_resetChannelUploads();

	yt_channelID = undefined;
	yt_channel = undefined;
}


/* ------------------------------------------------- */
/* ----- MEDIA ------------------------------------- */
/* ------------------------------------------------- */

function ct_nextVideo() {
	var newVideo;
	if (yt_playlist) {
		var index;
		if (ct_pref.playlistRandom) index = Math.floor (Math.random() * yt_playlist.videos.length);
		else index = ct_getVideoPlIndex() + 1;
		newVideo = yt_playlist.videos[index];
	} else if (yt_video && yt_video.related) {
		newVideo = yt_video.related.videos[0];
	}
	if (newVideo) ct_navVideo(newVideo.videoID);
}
function ct_navVideo(videoID) {
	ct_beforeNav();
	yt_videoID = videoID;
	ct_performNav();
}
function ct_canPlay () {
	return !ct_temp.settings;// && document.visibilityState == "visible";
}


/* -------------------- */
/* ---- MEDIA STATE ---	*/
/* -------------------- */

function ct_mediaLoad () {
	ct_state = State.Loading;
	ct_paused = !ct_pref.autoplay;
	ct_flags.buffering = false;
	ct_flags.seeking = false;
	ui_setPoster();
	ui_updatePlayerState();
	ui_setPlaylistPosition();
	yt_loadVideoData();
}
function ct_mediaLoaded () {
	if (ct_state != State.Error) {
		ui_setStreams();
		if (ct_paused) ct_state = State.PreStart;
		else ct_state = State.Loading; // Stay in Loading until video actually starts
		ct_totalTime = yt_video.meta.length;
		ct_curTime = yt_parseNum(new URL(window.location.href).searchParams.get("t"));
		ui_updateTimelineProgress();
		md_updateStreams(); // Fires ct_mediaReady or ct_mediaError eventually
	}
	ui_updatePlayerState();
}
function ct_mediaReady () {
	ct_flags.buffering = false;
	if (ct_paused && ct_state == State.Loading) // Means media is ready, but playback was denied
		ct_state = State.PreStart;
	else // Playback start was successful
		ct_state = State.Started;
	ui_updatePlayerState();
}
function ct_mediaError (error) {
	var mediaError = error.target? error.target.error : undefined;
	if (mediaError && mediaError.code == 4) {
		if (yt_video.useCipher) {
			console.error("Can't play ciphered dash streams above 360p!");
			yt_video.streams.filter(s => s.isDash && s.vResY > 360).forEach(s => s.unavailable = true );
		} else { // Mark conly urrent stream as unavailable
			console.error("Can't play selected stream!");
			yt_video.streams.find(s => s.url == error.target.src).unavailable = true;
		}
		md_updateStreams();
		ui_updateStreamState();
		return;
	}
	md_resetStreams();
	ct_state = State.Error;
	ct_paused = true;
	ct_flags.buffering = false;
	ct_flags.seeking = false;
	ui_updatePlayerState();
	if (mediaError) console.error(error.target.tagName + " encountered an error: " + mediaError.message + " - code " + mediaError.code);
	else console.error(error.message + " (" + error.code + ")");
}
function ct_mediaEnded () {
	md_pause ();
	if (ct_temp.loop) {
		md_updateTime(0);
		md_checkStartMedia();
		return;
	}
	ct_state = State.Ended;
	ct_flags.buffering = false;
	ct_curTime = ct_totalTime;
	ui_updateTimelineProgress();
	ui_updatePlayerState();
	ct_startAutoplay();
}
function ct_mediaUnload () {
	ct_stopAutoplay();
	ct_removePagedContent("RV");
	ct_removePagedContent("CM");
	
	yt_videoID = undefined;
	yt_video = undefined;
	
	ct_sources = undefined;
	ct_state = State.None;
	ct_paused = true;
	ct_flags.buffering = false;
	ct_flags.seeking = false;
	ct_curTime = 0;
	ct_totalTime = 0;

	md_resetStreams();
	ui_updateTimelineProgress();
	ui_updateTimelineBuffered();
	ui_resetStreams();
	ui_resetVideoMetadata();
	ui_resetRelatedVideos();
	ui_resetComments();
	ui_updatePlayerState();

	ct_temp.loop = false;
}


/* -------------------- */
/* --- MEDIA PLAYBACK -	*/
/* -------------------- */

function ct_mediaPlayPause (value, indirect) {
	ct_stopAutoplay();
	if (ct_state != State.None && (ct_state != State.Error || ct_sources))	{
		if (ct_state == State.Ended || ct_state == State.Error) ct_paused = false;
		else ct_paused = value;
		if (!ct_sources) {
			ct_state = State.Loading;
		} else if (ct_paused) {
			md_pause(true);
			if (indirect) ui_indicatePause();
		} else {
			if (ct_state == State.Ended) ct_curTime = 0;
			if (ct_state == State.Error) md_updateStreams();
			else md_checkStartMedia();
			ct_state = State.Started;
			if (indirect) ui_indicatePlay();
		}
	}
	ct_flags.seeking = false;
	ui_updatePlayerState();
}
function ct_beginSeeking () {
	if (!ct_sources || ct_state == State.None || ct_state == State.Loading) return; // Note: Loading implies no time information#
	if (ct_state == State.Error) md_updateStreams();
	ct_state = State.Started;
	ct_flags.seeking = true;
	md_pause();
	ui_updatePlayerState();
}
function ct_endSeeking () {
	ct_flags.seeking = false;
	md_checkBuffering ();
}
function ct_startAutoplay () {
	if (yt_playlist) { // Silent 1s, can still be interruped by seeking
		clearTimeout(ct_timerAutoplay);
		ct_timerAutoplay = setTimeout (ct_nextVideo, 1000);
	} else if (ct_pref.autoplay) {
		clearTimeout(ct_timerAutoplay);
		ct_timerAutoplay = setTimeout (ct_nextVideo, 8000);
		setDisplay("nextLoadIndicator", "block"); // Hardcoded to 8s
	}
}
function ct_stopAutoplay () {
	clearTimeout(ct_timerAutoplay);
}

//endregion


/* -------------------------------------------------------------------------------------------------------------- */
/* ----------------- DATABASE ----------------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------------------------------------------- */
//region

function db_access (callback) {
	if (!window.indexedDB) {
		console.error("Database not supported!");
		return;
	}
	if (db_database != undefined) {
		if (callback) callback();
		return;
	}
	// Only start one request at a time
	if (callback) db_accessCallbacks.push(callback);
	if (db_loading) return;
	db_loading = true;
	// Start request
	var request = indexedDB.open("ContentDatabase", 1);
	request.onerror = function (e) { // Denied
		console.error("Failed to open Database!", e);
	};
	request.onupgradeneeded = function (e) { // Create database
		console.log("Initializing Content Database!", e);
		db_database = e.target.result;
		db_database.onerror = function (e) { // Setup database-wide error handling
			console.error("Database Error:", e);
		};
		if (!db_database.objectStoreNames.contains("playlists"))
			db_database.createObjectStore("playlists", { keyPath: "listID" });
		if (!db_database.objectStoreNames.contains("videos"))
			db_database.createObjectStore("videos", { keyPath: "videoID" });
	};
	request.onsuccess = function (e) { // Ready
		db_database = e.target.result;
		db_database.onerror = function (e) { // Setup database-wide error handling
			console.error("Database Error:", e);
		};
		db_database.onclose = function (e) { // Setup database-wide error handling
			console.error("Database Closed Unexpectedly!", e);
			db_database = undefined;
		};
		db_loading = false;
		db_accessCallbacks.forEach(function (c) { c(); });
		db_accessCallbacks = [];
	};
}
function db_loadPlaylistIndex (callback) {
	if (db_playlists != undefined) { 
		if (callback) callback();
		return;
	}
	// Only on index load request at a time
	if (callback) db_indexCallbacks.push (callback);
	if (db_indexLoading) return;
	db_indexLoading = true;
	// Start request
	db_access (function () {
		var playlistStore = db_database.transaction("playlists", "readwrite").objectStore("playlists");
		var playlists = [];
		playlistStore.openCursor().onsuccess = function (e) {
			if (e.target.result) {
				var playlist = e.target.result.value;
				playlist.videos = undefined; // Don't store all ids in index
				playlists.push (playlist);
				e.target.result.continue();
			} else {
				db_playlists = playlists;
				db_indexLoading = false;
				db_indexCallbacks.forEach(function (c) { c(); });
				db_indexCallbacks = [];
			}
		};
	});
}
function db_hasPlaylistSaved (plID) {
	if (!db_playlists) console.error ("Playlist Index not loaded!");
	return db_playlists.findIndex(p => p.listID == plID) != -1;
}
function db_getSavedPlaylist (plID) {
	if (!db_playlists) console.error ("Playlist Index not loaded!");
	return db_playlists.find(p => p.listID == plID);
}
function db_savePlaylist () {
	if (yt_playlist) {
		db_updatePlaylist();
		ui_setPlaylistSaved (true);
	}
}
function db_removePlaylist () {
	if (!yt_playlist) return;
	db_loadPlaylistIndex(function () {
		db_access (function () {
			db_database.transaction("playlists", "readwrite").objectStore("playlists").delete(yt_playlist.listID).onsuccess = function () {
				var index = db_playlists.findIndex(p => p.listID == yt_playlist.listID);
				if (index != -1) db_playlists.splice(index, 1);
				ui_setPlaylistSaved (false);
				ui_setupHome();
			};
		});
	});
}
function db_updatePlaylist () {
	if (!yt_playlist) return;
	db_loadPlaylistIndex(function () {
		db_access (function () {
			// Request to update playlist
			var playlistTransaction = db_database.transaction("playlists", "readwrite");
			var playlistStore = playlistTransaction.objectStore("playlists");
			var playlist = { // Discard full video information, only reference to video store
				listID: yt_playlist.listID, 
				title: yt_playlist.title, 
				author: yt_playlist.author, 
				views: yt_playlist.views, 
				description: yt_playlist.description,
				thumbID: yt_playlist.thumbID,  
				count: yt_playlist.count, 
				videos: yt_playlist.videos.map(function (v) { return v.videoID; }),
			};
			playlistStore.put(playlist);
			// Request to add all videos (will overwrite existing ones with updated data)
			var videoTransaction = db_database.transaction("videos", "readwrite");
			var videoStore = videoTransaction.objectStore("videos");
			yt_playlist.videos.forEach (function (video) {
				videoStore.put(video);
			});
			// Transactions close automatically
			var plSuccess, vdSuccess;
			var success = function () { 
				var index = db_playlists.findIndex(p => p.listID == playlist.listID);
				if (index == -1) db_playlists.push(playlist);
				else db_playlists[index] = playlist;
				ui_setupHome();
			};
			playlistTransaction.oncomplete = function () {
				plSuccess = true;
				if (plSuccess && vdSuccess) success();
			};
			videoTransaction.oncomplete = function () {
				vdSuccess = true;
				if (plSuccess && vdSuccess) success();
			};
		});
	});
}
function db_loadPlaylist (callback) {
	var plID = yt_playlistID;
	db_access (function () {
		var playlistStore = db_database.transaction("playlists", "readonly").objectStore("playlists");
		playlistStore.get(plID).onsuccess = function (pe) {
			var playlist = pe.target.result;
			var videoIDs = playlist.videos.map(function (id, i) { return { i: i, id: id } });
			
			var videoTransaction = db_database.transaction("videos", "readonly");
			var videoStore = videoTransaction.objectStore("videos");
			
			playlist.videos = [];
			videoIDs.forEach (function (v) {
				videoStore.get(v.id).onsuccess = function (e) {
					playlist.videos[v.i] = e.target.result;
				};
			});
			videoTransaction.oncomplete = function () {
				if (yt_playlistID == plID) {
					yt_playlist = playlist;
					if (callback) callback();
				}
				else console.error("Switched playlist while loading from database!");
			};	
		};
	});	
}

//endregion

/* -------------------------------------------------------------------------------------------------------------- */
/* ----------------- YOUTUBE ------------------------------------------------------------------------------------ */
/* -------------------------------------------------------------------------------------------------------------- */
//region
 
/* ------------------------------------------------- */
/* ------ Page Navigation -------------------------- */
/* ------------------------------------------------- */

/* Loads URL using browser mechanics - response is full HTML including secrets. First load needs to be a browse */
function yt_browse (subPath, callback, peek) {
	var page;
	if (peek) page = {};
	else page = yt_page = {};
		
	WGET_CORS(HOST_YT + subPath, function(response, xhttp) {
		page.html = response;

		try { 
			var match = page.html.match (/window\["ytInitialData"\]\s*=\s*({.*?});/);
			if (!match) match = page.html.match (/<div\s+id="initial-data">\s*<!--\s*({.*?})\s*-->\s*<\/div>/);
			page.initialData = JSON.parse(match[1]); 
		} catch (e) { console.error("Failed to get initial data!", e); }

		try { page.configParams = JSON.parse(page.html.match (/ytcfg\.set\s*\(({.*?})\);/)[1]); 
		} catch (e) { console.error("Failed to get config params!", e); }

		// Whether YouTube thinks this is mobile - independant from ct_isDesktop, which is this apps opinion
		page.isDesktop = !page.initialData || Object.keys(page.initialData.contents).some(function (s) { return s.startsWith("twoColumn"); });

		// Extract youtube secrets
		page.secrets = {};
		
		// Always changing, required for ID and XSRF
		page.secrets.csn = page.initialData.responseContext.webResponseContextExtensionData.ytConfigData.csn;
		// Randomly generated
		page.secrets.cpn = yt_generateCPN();

		page.secrets.xsrfToken = page.configParams.XSRF_TOKEN;
		// Just some data that is used in requests (but actually works without)
		page.secrets.idToken = page.configParams.ID_TOKEN;
		page.secrets.innertubeAPIKey = page.configParams.INNERTUBE_API_KEY;
		page.secrets.visitorData = page.configParams.VISITOR_DATA;
		page.secrets.clientName = page.configParams.INNERTUBE_CONTEXT_CLIENT_NAME;
		page.secrets.clientVersion = page.configParams.INNERTUBE_CONTEXT_CLIENT_VERSION;
		page.secrets.pageCL = page.configParams.PAGE_CL;
		page.secrets.pageLabel = page.configParams.PAGE_BUILD_LABEL;
		page.secrets.variantsChecksum = page.configParams.VARIANTS_CHECKSUM;
		
		page.cookies = {};
		if (ct_isAdvancedCorsHost)
			yt_extractCookies(xhttp.getResponseHeader("x-set-cookies"));
		
		console.log("YT Page: ", page);
		callback(page);
	}, yt_getRequestHeadersBrowser(false));
}
/* Loads the URL with Youtube Mechanics - response is only a data object without secrets. Browse needs to be called first on any YT page */
/* Currently does not work */
function yt_navigate (subPath, callback, itctToken) {
	if (!yt_page) {
		yt_browse (subPath, callback);
		return;
	}

	// TODO: Session Data can vary between page types - don't assume itct&csn
	yt_setNavCookie(subPath, "itct=" + itctToken + "&csn=" + yt_page.secrets.csn);

	WGET_CORS(HOST_YT + subPath, function(response, xhttp) {
		// Parse response object
		try { yt_page.object = JSON.parse(response); 
		} catch (e) { console.error("Failed to get parse page response!", e, { text: response }); }

		try { yt_page.initialData = yt_page.object[1]; 
		} catch (e) { console.error("Failed to get initial data!", e, { text: response }); }

		yt_updateNavigation (yt_page.initialData);
		if (ct_isAdvancedCorsHost)
			yt_extractCookies(xhttp.getResponseHeader("x-set-cookies"));
		
		console.log("YT Page: ", yt_page);
		callback();
	},
	yt_getRequestHeadersYoutube("application/x-www-form-urlencoded"),
	"session_token=" + encodeURIComponent(yt_page.secrets.xsrfToken)
	);
}
function yt_setNavCookie (subPath, sessionData) {
	for (var hash = 0, c = 0; c < subPath.length; ++c)
		hash = 31 * hash + subPath.charCodeAt(c) >>> 0;
	yt_page.cookies["ST-" + hash] = sessionData;
}
function yt_extractCookies (setCookies) {
	if (setCookies) { // Extract and store cookies manually
		setCookies = JSON.parse(setCookies);
		setCookies.forEach(function(cookie) {
			var match = cookie.match(/^([^;, =]+)=([^;, ]*)\s*;\s+/);
			if (!match) console.warn("Couldn't extract cookie from " + cookie);
			else yt_page.cookies[match[1]] = match[2];
		});
	}
}
function yt_updateNavigation(data) {
	if (data.xsrf_token) yt_page.secrets.xsrfToken = data.xsrf_token;
	if (data.csn) yt_page.secrets.csn = data.csn;
}
function yt_getCookieString () {
	if (!yt_page || !yt_page.cookies) return "";
	return Object.keys(yt_page.cookies).reduce(function(s, c) { 
		return s + (yt_page.cookies[c]? ((s == ""? "" : "; ") + c + "=" + yt_page.cookies[c]) : "") 
	}, "");
}
function yt_getRequestHeadersBrowser (cookies) {
	return [
		{ header: "accept", value: "*/*" },
		{ header: "accept-language", value: LANG_INTERFACE || "*" },
		{ header: "upgrade-insecure-requests", value: "1" },
		{ header: "x-cookies", value: cookies? yt_getCookieString() : "" },
		{ header: "x-mode", value: "navigate" },
	];
	// In addition, the server should set the following unsafe headers for us:
	// sec-fetch-mode: navigate [x-mode navigate]
	// sec-fetch-site: none [x-mode navigate]
	// sec-fetch-user: ?1 [x-mode navigate]
	// origin: [delete / x-mode navigate]
	// cookie: [read from custom x-cookies]
}
function yt_getRequestHeadersYoutube (content) {
	if (!yt_page || !yt_page.secrets) return [];
	return [
		{ header: "accept", value: "*/*" },
		{ header: "accept-language", value: LANG_INTERFACE || "*" },
		{ header: "cache-control", value: "no-cache" },
		{ header: "pragma", value: "no-cache" },
		{ header: "content-type", value: content },
		{ header: "x-youtube-client-name", value: yt_page.secrets.clientName },
		{ header: "x-youtube-client-version", value: yt_page.secrets.clientVersion },
		{ header: "x-youtube-page-cl", value: yt_page.secrets.pageCL },
		{ header: "x-youtube-page-label", value: yt_page.secrets.pageLabel },
		{ header: "x-youtube-variants-checksum", value: yt_page.secrets.variantsChecksum },
		{ header: "x-youtube-utc-offset", value: "0" },
		{ header: "x-cookies", value: yt_getCookieString() },
		{ header: "x-mode", value: "fetch" },
	];
	// In addition, the server should set the following unsafe headers for us:
	// sec-fetch-mode: cors [x-mode fetch]
	// sec-fetch-site: same-origin [x-mode fetch]
	// origin: https://www.youtube.com [copy from url / x-mode fetch]
	// cookie: [read from custom x-cookies]
}
function yt_generateCPN () {
	if (window.crypto && window.crypto.getRandomValues) {
		var rnd = new Uint8Array(16);
		window.crypto.getRandomValues(rnd);
		var cpn = "";
		for (var c = 0; c < 16; c++)
			cpn += "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_".charAt(rnd[c] & 63);
		return cpn;
	}
	return "";
}

/* ------------------------------------------------- */
/* ---- YouTube Extraction ------------------------- */
/* ------------------------------------------------- */

function yt_parseTime (timeText) {
	var split = timeText.split (':');
	var time = 0;
	for (var i = 0; i < split.length; i++)
		time += parseInt(split[i]) * Math.pow(60, split.length-i-1);
	return time;
}
function yt_parseNum (numText) {
	if (numText == undefined) return 0;
	if (Number.isInteger (numText)) return numText;
	numMatch = numText.match(/[^0-9]*([0-9,.]+)\s?([KMB]?).*/); // (5.2)(K), (5263)(), (5,263)() etc.
	if (!numMatch) return 0;
	var num = parseInt(numMatch[1].replace(/[.,]/g,''));
	if (isNaN(num)) return 0;
	if (numMatch[2]) {
		var split = numMatch[1].match(/([0-9]+)(?:[.,]([0-9]+))?/);
		if (split[2])
			num = parseInt(split[1].replace(/[.,]/g,'')) + parseFloat("0." + split[2]);
		if (numMatch[2] == "K") return num * 1000;
		if (numMatch[2] == "M") return num * 1000000;
		if (numMatch[2] == "B") return num * 1000000000;
	}
	return num;
}
function yt_selectThumbnail (thumbnails) {
	var url = thumbnails.sort(function(t1, t2) { return t1.height > t2.height? -1 : 1 })[0].url;
	if (url.startsWith("//"))
		return "https:" + url;
	return url;
}
function yt_parseDateText (dateText) {
	var usMatch = dateText.match(/([a-zA-Z]+\s*[0-9]+\s*,\s*[0-9]{4})/);
	if (usMatch) return new Date(usMatch[1]);
	var euMatch = dateText.match(/([0-9]{2})\.([0-9]{2})\.([0-9]{4})/);
	if (euMatch) return new Date(parseInt(euMatch[3]), parseInt(euMatch[2])-1, parseInt(euMatch[1]));
}
function yt_parseLabel (label) {
	return label.runs? label.runs[0].text : label.simpleText;
}
function yt_parseFormattedRuns(runs) {
	//return runs.map(r => r.bold? ("**" + r.text + "**") : (r.italic? ("*" + r.text + "*") : r.text)).join("");
	var text = "";
	for (var i = 0; i < runs.length; i++) {
		var r = runs[i];
		var t = r.text.replace(/</g,'&lt;').replace(/>/g,'&gt;');
		if (t.charAt(0) == '@') t = "<a>" + t.split(/\s(.*)/)[0] + "</a> " + t.split(/\s(.*)/)[1];
		if (r.bold) t = "<b>" + t + "</b>";
		if (r.italic) t = "<i>" + t + "</i>";
		text += t;
	}
	return text;
}
function yt_parseAJAXVideo (vdData) {
	return {
		title: vdData.title, 
		videoID: vdData.encrypted_id, 
		length: vdData.length_seconds, 
		thumbnailURL: vdData.thumbnail, 
		addedDate: new Date(vdData.time_created*1000), 
		uploadedDate: new Date(vdData.added), 
		uploader: {
			name: vdData.author,
			channelID: "UC" + vdData.user_id,
			url: "/channel/UC" + vdData.user_id,
		}, 
		views: yt_parseNum(vdData.views), 
		likes: vdData.likes, 
		dislikes: vdData.dislikes, 
		comments: yt_parseNum(vdData.comments), 
		tags: vdData.keywords,
		categoryID: vdData.category_id,
	};
}
function yt_loadListData(addElements, initialLoad, supressLoader) {
	return function (pagedContent) { 
		var requestURL = HOST_YT + "/list_ajax?action_get_list=1&style=json&list=" + pagedContent.data.listID + "&index=" + pagedContent.index;
		PAGED_REQUEST(pagedContent, "GET", requestURL, false, function(uploadsData) {
			// Parsing
			try { pagedContent.data.lastPage = JSON.parse(uploadsData);
			} catch (e) { console.error("Failed to get channel uploads data!", e, { uploadsData: uploadsData }); return; }

			// Extract video uploads
			var lastVideoCount = pagedContent.data.videos.length;
			for (var i = 0; i < pagedContent.data.lastPage.video.length; i++) {
				var vdData = pagedContent.data.lastPage.video[i];
				if (!pagedContent.data.videos.some(p => p.videoID == vdData.encrypted_id)) {
					pagedContent.data.videos.push(yt_parseAJAXVideo(vdData));
				}
			}
			// Initial load
			if (initialLoad && lastVideoCount == 0)
				initialLoad();
			// Add elements
			addElements(pagedContent.container, pagedContent.data.videos, lastVideoCount);

			// Finish
			pagedContent.index = pagedContent.index + 100;
			return pagedContent.data.videos.length > lastVideoCount;
		}, supressLoader);
	};
}


/* -------------------- */
/* ---- Playlist ------ */
/* -------------------- */

function yt_loadPlaylistData() {
	// Validate Playlist ID
	if (yt_playlistID && yt_playlistID.length != 34) yt_playlistID = undefined;
	if (yt_playlist && yt_playlist.listID && yt_playlist.listID == yt_playlistID) return;
	yt_playlist = undefined;
	if (!yt_playlistID) return;
	yt_playlist = { listID: yt_playlistID, videos: [] };
	// Load playlist data
	var initialLoad = function () {
		yt_playlist.title = yt_playlist.lastPage.title; 
		yt_playlist.author = yt_playlist.lastPage.author; 
		yt_playlist.views = yt_playlist.lastPage.views; 
		yt_playlist.description = yt_playlist.lastPage.description;
		yt_playlist.thumbID = yt_playlist.videos[0].videoID;
	};
	var addElements = function (container, videos, prevVidCount) {
		ui_addToPlaylist(prevVidCount);
		if (yt_playlist.videos.length == prevVidCount) {
			console.log("YT Playlist:", yt_playlist);
			ui_setPlaylistFinished ();
			yt_playlist.count = yt_playlist.videos.length;
			if (yt_playlistLoaded) yt_playlistLoaded();
		}
	};
	ct_registerPagedContent("PL", I("plVideos"), yt_loadListData(addElements, initialLoad, true), true, yt_playlist).index = 100;
	ct_checkPagedContent();
}

/* -------------------- */
/* ----- Search ------- */
/* -------------------- */

/* Page continuation version */
function yt_loadSearchPage () {
	// Validate Playlist ID
	if (!yt_searchTerms) return;
	// Load Search Page
	yt_searchResults = undefined;
	var requestURL = HOST_YT + "/results?pbj=1&search_query=" + encodeURIComponent(yt_searchTerms);
	yt_browse("/results?pbj=1&search_query=" + encodeURIComponent(yt_searchTerms), function() {
		if (ct_page != Page.Search) return;
		yt_searchResults = {};
		console.log("YT Search:", yt_searchTerms);
	});
}
function yt_loadSearchPageResults(pagedContent) {
	
}
/* AJAX Version - lighter, but only video results */
function yt_loadSearchResultsAJAX(pagedContent) {
	var requestURL = HOST_YT + "/search_ajax?style=json&search_query=" + encodeURIComponent(yt_searchTerms) + "&page=" + (pagedContent.index+1);	
	PAGED_REQUEST(pagedContent, "POST", requestURL, false, function(searchResultData) {
		// Parsing
		if (!yt_searchResults) yt_searchResults = { hits: 0, videos: [] };
		try { yt_searchResults.lastPage = JSON.parse(searchResultData); } 
		catch (e) { console.error("Failed to get search result data!", e.name, e.message, e.code); return; }
		if (yt_searchResults.lastPage.hits) 
			yt_searchResults.hits = yt_searchResults.lastPage.hits;
		
		// Load and add videos
		var prevResultCount = yt_searchResults.videos.length;
		try {
			for (var i = 0; i < yt_searchResults.lastPage.video.length; i++)
				yt_searchResults.videos.push(yt_parseAJAXVideo(yt_searchResults.lastPage.video[i]));
		} catch (e) { console.error("Failed to extract search results from data!", e, yt_searchResults.lastPage); return; }
		ui_addSearchResults(pagedContent.container, prevResultCount);
		
		// Finish
		console.log("YT Search:", yt_searchResults);
		pagedContent.index = pagedContent.index+1;
		return prevResultCount != yt_searchResults.videos.length;
	});
}

/* -------------------- */
/* ----- Channel ------ */
/* -------------------- */

function yt_loadChannelData() {
	yt_channel = undefined;
	if (!yt_channelID) return;
	var channelURL = (yt_channelID.user? "/user/" + yt_channelID.user : "/channel/" + yt_channelID.channel) + "/videos";
	yt_browse (channelURL, function () {
		if (ct_page != Page.Channel) return;
		yt_channel = { url: channelURL };
		yt_extractChannelMetadata();
		yt_extractChannelUploads();
		ct_updatePageState();
		console.log("YT Channel:", yt_channel);
	});
}
function yt_extractChannelMetadata() {
	yt_channel.meta = {};

	try { // Extract main metadata
		var header = yt_page.initialData.header.c4TabbedHeaderRenderer;
		yt_channel.meta.name = header.title;
		yt_channel.meta.channelID = header.channelId;
		yt_channel.meta.profileImg = yt_selectThumbnail(header.avatar.thumbnails);
		yt_channel.meta.bannerImg = header.banner? yt_selectThumbnail(header.banner.thumbnails) : undefined;
		yt_channel.meta.url = header.navigationEndpoint.browseEndpoint.canonicalBaseUrl;
		yt_channel.meta.subscribers = yt_parseNum(yt_parseLabel(header.subscriberCountText));
		var chLinks = header.headerLinks? (header.headerLinks.channelHeaderLinksRenderer.primaryLinks || []).concat(header.headerLinks.channelHeaderLinksRenderer.secondaryLinks || []) : [];
		yt_channel.meta.links = chLinks.map(l => { return { title: l.title.simpleText, icon: l.icon? yt_selectThumbnail(l.icon.thumbnails) : undefined, link: l.navigationEndpoint.urlEndpoint.url }; });
		yt_channel.meta.description = yt_page.initialData.metadata.channelMetadataRenderer.description;
	} catch (e) { console.error("Failed to extract channel metadata!", e, yt_page.initialData); }

	try { // Extract secondary metadata
		var metadata = yt_page.initialData.metadata.channelMetadataRenderer;
		yt_channel.meta.description = metadata.description;
		yt_channel.meta.isFamilySafe = metadata.isFamilySafe;	
		yt_channel.meta.isPaid = metadata.isPaidChannel;	
		yt_channel.meta.tags = metadata.keywords;
	} catch (e) { console.error("Failed to extract channel metadata!", e, yt_page.initialData); }

	ui_setChannelMetadata();
}
function yt_extractChannelUploads() {
	yt_channel.uploads = {};
	yt_channel.uploads.tabs = [];

	try { // Extract upload tabs (sections of video content, usually only one upload section)
		yt_channel.uploads.tabs = yt_extractChannelPageTabs(yt_page.initialData);
	} catch (e) { console.error("Failed to extract channel upload tabs!", e, yt_page.initialData); return; }

	ui_setupChannelTabs ();

	var finalizeTab = function (tab) {
		if (tab.smallContainer) ui_addChannelUploads(tab.smallContainer, tab.videos, 0, 3);
		ui_addChannelUploads(tab.container, tab.videos, 0);
	}

	yt_channel.uploads.tabs.forEach (function (tab) {
		if (tab.continuationContents) { // Setup continuation loader
			tab.conToken = tab.continuationContents.conToken;
			tab.itctToken = tab.continuationContents.itctToken;
			if (tab.conToken) tab.pagedContent = ct_registerPagedContent("CH" + tab.id, tab.container, yt_loadChannelPageUploads, 100, tab);
			finalizeTab(tab);
		}
		else if (tab.browseContent) { // Setup browse loader
			if (tab.smallContainer) ui_addChannelUploads(tab.smallContainer, tab.videos, 0, 3);
			yt_browse (tab.browseContent.startURL, function (browsePage) {
				var tabContinuation = yt_extractChannelPageTabs(browsePage.initialData)[0];
				if (tabContinuation.continuationContents) {
					tab.conToken = tabContinuation.continuationContents.conToken;
					tab.itctToken = tabContinuation.continuationContents.itctToken;
				}
				// Replace previous videos (should be the same either way)
				if (tab.smallContainer) tab.smallContainer.innerHTML = "";
				tab.videos = tabContinuation.videos;
				if (tab.conToken) tab.pagedContent = ct_registerPagedContent("CH" + tab.id, tab.container, yt_loadChannelPageUploads, 100, tab);
				finalizeTab(tab);
			}, true); // Peek only, don't replace current page
		}
		else if (tab.listContent) { // Setup list loader
			tab.listID = tab.listContent.listID;
			tab.pagedContent = ct_registerPagedContent("CH" + tab.id, tab.container, yt_loadListData(ui_addChannelUploads), 100, tab);
			finalizeTab(tab);
		}
		else { // Add videos
			finalizeTab(tab);
		}	
	});
}
function yt_extractChannelPageTabs (initialData) {

	var tabs = initialData.contents.twoColumnBrowseResultsRenderer? 
		initialData.contents.twoColumnBrowseResultsRenderer.tabs : 
		initialData.contents.singleColumnBrowseResultsRenderer.tabs;
	var videoTab = tabs.find(t => t.tabRenderer.selected == true).tabRenderer; // Language-indifferent - relies on /videos/ URL - could use title=="Videos"
	
	var tabs = [];
	var handleContainer = function (c) {
		var tab = {};
		if (c.sectionListRenderer) { // Usually base container with multiple itemSectionRenderers
			c.sectionListRenderer.contents.forEach(handleContainer);
			return;
		}
		else if (c.itemSectionRenderer) { // Usually container with one ShelfRenderer
			var s = c.itemSectionRenderer.contents[0];
			if (!c.itemSectionRenderer.continuations && (s.shelfRenderer || s.verticalListRenderer || s.horizontalListRenderer || s.gridRenderer)) {
				c.itemSectionRenderer.contents.forEach(handleContainer);
				return;
			}
			// It directly contains videos
			tab.title = "Uploads";
			if (c.itemSectionRenderer.continuations) {
				tab.continuationContents = {
					conToken: c.itemSectionRenderer.continuations[0].nextContinuationData.continuation,
					itctToken: c.itemSectionRenderer.continuations[0].nextContinuationData.clickTrackingParams,
				};
			}
			tab.videos = yt_parseChannelPageVideos(c.itemSectionRenderer.contents);
		}
		else if (c.shelfRenderer) { // Nasty shelf setup - handle multiple tabs
			var s = c.shelfRenderer;
			tab.title = yt_parseLabel (s.title);
			var play = s.playAllButton? s.playAllButton.buttonRenderer.navigationEndpoint : s.playEndpoint;
			tab.listContent = { // Associated list (may not contain all videos)
				listID: play.watchEndpoint.playlistId,
				itctToken: play.clickTrackingParams,
			};
			if (s.endpoint.commandMetadata.webCommandMetadata.url.includes("shelf_id")) { // Usually when content is gridRenderer
				tab.browseContent = { // May imply that associated list does not contain all videos - only separate shelf browse page does
					startURL: s.endpoint.commandMetadata.webCommandMetadata.url,
					itctToken: s.endpoint.clickTrackingParams,
				};
			}
			// Extract visible items
			var container = (s.content.verticalListRenderer || s.content.horizontalListRenderer || s.content.gridRenderer);
			if (!container) console.error("Unhandled shelfRenderer container: ", c.shelfRenderer.content);
			else tab.videos = yt_parseChannelPageVideos(container.items);

		} 
		else if (c.gridRenderer) { // Simple uploads all together
			tab.title = "Uploads";
			if (c.gridRenderer.continuations) {
				tab.continuationContents = {
					conToken: c.gridRenderer.continuations[0].nextContinuationData.continuation,
					itctToken: c.gridRenderer.continuations[0].nextContinuationData.clickTrackingParams,
				};
			}
			tab.videos = yt_parseChannelPageVideos(c.gridRenderer.items);
		}
		if (tab.title.toLowerCase().includes("more")) tab.title = "More"; // More from this artist
		if (tab.title.toLowerCase().includes("streams")) tab.title = "Streams"; // Past live streams
		tab.id = tab.title.toLowerCase().replace(/\s/g, "-");
		tabs.push(tab);
	};
	handleContainer(videoTab.content);
	return tabs;
}
function yt_loadChannelPageUploads(pagedContent) {
	var requestURL;
	if (yt_page.isDesktop) requestURL = HOST_YT + "/browse_ajax?" + "ctoken=" + pagedContent.data.conToken + "&continuation=" + pagedContent.data.conToken + "&itct=" + pagedContent.data.itctToken;
	else requestURL = HOST_YT_MOBILE + yt_channel.url + "?pbj=1&" + "ctoken=" + pagedContent.data.conToken + "&itct=" + pagedContent.data.itctToken;
	PAGED_REQUEST(pagedContent, "GET", requestURL, true, function(uploadsData) {
		// Parsing
		try { var obj = JSON.parse(uploadsData); 
		pagedContent.data.lastPage = yt_page.isDesktop? obj[1] : obj; 
		} catch (e) { console.error("Failed to get channel uploads data!", e, { uploadsData: uploadsData }); return; }
		yt_updateNavigation(pagedContent.data.lastPage);
		
		// Extract video uploads
		var prevVidCount = pagedContent.data.videos.length;
		var continuation = pagedContent.data.lastPage.response.continuationContents;
		var contents = (continuation.gridContinuation || continuation.itemSectionContinuation);
		pagedContent.data.conToken = contents.continuations? contents.continuations[0].nextContinuationData.continuation : undefined;
		pagedContent.data.itctToken = contents.continuations? contents.continuations[0].nextContinuationData.clickTrackingParams : undefined;
		pagedContent.data.videos = pagedContent.data.videos.concat(yt_parseChannelPageVideos(contents.items || contents.contents));
		ui_addChannelUploads(pagedContent.container, pagedContent.data.videos, prevVidCount);
		
		// Finish
		console.log("YT Uploads:", pagedContent.data, pagedContent.data.lastPage);
		pagedContent.triggerDistance = 500; // Increase after first load
		return pagedContent.data.conToken != undefined;
	});
}
function yt_parseChannelPageVideos (videos) {
	return videos.map(function (v) {
		v = v.gridVideoRenderer || v.compactVideoRenderer;
		return { 
			title: yt_parseLabel(v.title),
			videoID: v.videoId,
			views: yt_parseNum(yt_parseLabel(v.viewCountText)),
			length: v.thumbnailOverlays.reduce((t, v) => v.thumbnailOverlayTimeStatusRenderer? yt_parseTime(yt_parseLabel(v.thumbnailOverlayTimeStatusRenderer.text)) : t, 0),
			thumbnailURL: yt_selectThumbnail(v.thumbnail.thumbnails),
			uploadedTimeAgoText: yt_parseLabel(v.publishedTimeText),
			itctToken: v.navigationEndpoint.clickTrackingParams,
		}; 
	});
}

/* -------------------- */
/* ----- Watch -------- */
/* -------------------- */

function yt_loadVideoData() {
	if (!yt_videoID || yt_videoID.length != 11) return;
	yt_video = undefined;
	yt_browse ("/watch?v=" + yt_videoID, function () {
		if (ct_page != Page.Media) return;
		yt_video = { videoID: yt_videoID };
		// Check age restriction
		yt_video.ageRestricted = yt_page.html.indexOf("og:restrictions:age") != -1;
		if (yt_video.ageRestricted) console.warn("Video is age restricted!");
		// Parse player config
		try {  
			var match = yt_page.html.match (/;\s*ytplayer\.config\s*=\s*({.*?});/);
			if (!match) match = yt_page.html.match (/ytInitialPlayerConfig\s*=\s*({.*?});/);
			yt_page.config = JSON.parse(match[1]);
		} catch (e) {
			if (!yt_page.html.includes('id="player-api"')) {
				console.error("Failed to get player config!"); 
				ct_mediaError(e);
				ct_mediaLoaded();
			} else {
				yt_video.blocked = true;
				console.warn("Video is blocked in your country!");
				WGET_CORS(HOST_YT + "/get_video_info?ps=default&video_id=" + yt_videoID, function(playerArgs) {
					yt_page.config = { args: {} };
					playerArgs.split('&').forEach(s => { s = s.split('='); 
						yt_page.config.args[s[0]] = decodeURIComponent(s[1].replace(/\+/g, '%20')); 
					});
					yt_processVideoData();
					ct_updatePageState();
				});
			}
			return;
		}
		yt_processVideoData();
	 	ct_updatePageState();
	});
}
function yt_processVideoData () {
	yt_page.config.args.player_response = JSON.parse(yt_page.config.args.player_response);
	
	// Check if a signature is required for stream access
	yt_video.useCipher = yt_page.config.args.player_response.videoDetails.useCipher;
	if (yt_video.useCipher == undefined) yt_video.useCipher = true;

	// Check playability (blocked, age restricted, etc.)
	if (yt_page.config.args.player_response.playabilityStatus.status != "OK")
		console.error("Playability Status: " + yt_page.config.args.player_response.playabilityStatus.status);

	// Extract and display metadata first
	yt_extractVideoMetadata();

	if (!yt_video.blocked) {
		// Extract and decode stream data
		yt_decodeStreams();
		// Extract related videos
		yt_extractRelatedVideoData();
		// Extract further data requiring loading
		yt_extractVideoCommentData();
	} else {
		yt_video.streams = [];
		ct_mediaError(new Error("Video is blocked in your country!"));
		ct_mediaLoaded();
	}

	console.log("YT Video:", yt_video);
}
function yt_extractVideoMetadata() {
	yt_video.meta = {};

	try { // Extract primary metadata
		var videoDetail = yt_page.config.args.player_response.videoDetails;
		yt_video.meta.title = videoDetail.title;
		yt_video.meta.description = videoDetail.shortDescription;
		yt_video.meta.thumbnailURL = yt_selectThumbnail(videoDetail.thumbnail.thumbnails);
		yt_video.meta.length = parseInt(videoDetail.lengthSeconds);
		yt_video.meta.uploader = {
			name: videoDetail.author,
			channelID: videoDetail.channelId,
		};
		yt_video.meta.allowRatings = videoDetail.allowRatings;
		
	} catch (e) { console.error("Failed to read primary video metadata!", e, videoDetail); }

	if (!yt_page.initialData) {
		console.warn("Can't extract video metadata without initial data!", yt_page);
		return;
	}

	var metadataContainer, uploaderContainer;

	/* -- Desktop website -- */
	if (yt_page.initialData.contents.twoColumnWatchNextResults) {
			
		try {
			var data = yt_page.initialData.contents.twoColumnWatchNextResults.results.results;
			var primary = data.contents.find(c => c.videoPrimaryInfoRenderer).videoPrimaryInfoRenderer;
			var secondary = data.contents.find(c => c.videoSecondaryInfoRenderer).videoSecondaryInfoRenderer;
			metadataContainer = data.contents.find(c => c.videoSecondaryInfoRenderer).videoSecondaryInfoRenderer;
			uploaderContainer = secondary.owner.videoOwnerRenderer;
			// Upload date
			if (primary.dateText) yt_video.meta.uploadedDate = yt_parseDateText (primary.dateText.simpleText);
			else if (secondary.dateText) yt_video.meta.uploadedDate = yt_parseDateText (secondary.dateText.simpleText);
			// Views
			yt_video.meta.views = yt_parseNum(primary.viewCount.videoViewCountRenderer.viewCount.simpleText);
			// Ratings
			if (yt_video.meta.allowRatings) {
				var sentiments = primary.sentimentBar.sentimentBarRenderer.tooltip.split(' / ');
				yt_video.meta.likes = yt_parseNum(sentiments[0]);
				yt_video.meta.dislikes = yt_parseNum(sentiments[1]);
			}
			// Subscribers
			if (secondary.owner.videoOwnerRenderer.subscriberCountText) {
				yt_video.meta.uploader.subscribers = yt_parseNum(yt_parseLabel(secondary.owner.videoOwnerRenderer.subscriberCountText));
			} else {
				var subButton = secondary.subscribeButton.buttonRenderer;
				if (!subButton.isDisabled && subButton.text.runs) 
					yt_video.meta.uploader.subscribers = subButton.text.runs[1]? yt_parseNum(subButton.text.runs[1].text) : 0;
			}

		} catch (e) { console.error("Failed to read video metadata!", e, yt_page.initialData.contents); }
	}
	/* -- Mobile website -- */
	else if (yt_page.initialData.contents.singleColumnWatchNextResults) {

		try {
			// This is no joke
			var videoData = yt_page.initialData.contents.singleColumnWatchNextResults.results.results.contents
				.find(c => c.itemSectionRenderer && c.itemSectionRenderer.sectionIdentifier == "slim-video-metadata")
				.itemSectionRenderer.contents[0].slimVideoMetadataRenderer;
			metadataContainer = videoData;
			uploaderContainer = videoData.owner.slimOwnerRenderer;
			// Upload Date
			yt_video.meta.uploadedDate = yt_parseDateText (yt_parseLabel(videoData.dateText));
			// Views
			yt_video.meta.views = yt_parseNum(yt_parseLabel(videoData.expandedSubtitle));
			// Ratings
			if (yt_video.meta.allowRatings) {
				var likeButton = videoData.buttons.find(b => b.slimMetadataToggleButtonRenderer && b.slimMetadataToggleButtonRenderer.isLike).slimMetadataToggleButtonRenderer.button.toggleButtonRenderer;
				var dislikeButton = videoData.buttons.find(b => b.slimMetadataToggleButtonRenderer && b.slimMetadataToggleButtonRenderer.isDislike).slimMetadataToggleButtonRenderer.button.toggleButtonRenderer;
				yt_video.meta.likes = yt_parseNum(likeButton.defaultText.accessibility.accessibilityData.label);
				yt_video.meta.dislikes = yt_parseNum(dislikeButton.defaultText.accessibility.accessibilityData.label);
			}
			// Subscribers
			yt_video.meta.uploader.subscribers = yt_parseNum(yt_parseLabel(uploaderContainer.expandedSubtitle));

		} catch (e) { console.error("Failed to read video metadata!", e, yt_page.initialData.contents); }
	}

	try { // Extract uploader metadata
		yt_video.meta.uploader.name = yt_parseLabel(uploaderContainer.title);
		yt_video.meta.uploader.channelID = uploaderContainer.navigationEndpoint.browseEndpoint.browseId;
		yt_video.meta.uploader.url = uploaderContainer.navigationEndpoint.browseEndpoint.canonicalBaseUrl;
		yt_video.meta.uploader.userID = yt_video.meta.uploader.url.startsWith ("/user/")? yt_video.meta.uploader.url.substring(6) : undefined;
		yt_video.meta.uploader.profileImg = yt_selectThumbnail(uploaderContainer.thumbnail.thumbnails);
		yt_video.meta.uploader.badge = uploaderContainer.badges && uploaderContainer.badges.length > 0? uploaderContainer.badges[0].metadataBadgeRenderer.tooltip : undefined;
	} catch (e) { console.error("Failed to read video uploader metadata!", e, yt_page.initialData.contents); }

	try { // Extract secondary metadata
		yt_video.meta.metadata = metadataContainer.metadataRowContainer.metadataRowContainerRenderer.rows.reduce((d, r) => {
			if (r = r.metadataRowRenderer) 
				d.push({ 
					name: r.title.runs? r.title.runs.map(t => t.text).join(', ') : r.title.simpleText, 
					data: r.contents[0].runs? r.contents[0].runs.map(t => t.text).join(', ') : r.contents[0].simpleText, 
				});
			return d;
		}, []);
		var category = yt_video.meta.metadata.find(d => d.name == "Category");
		yt_video.meta.category = category? category.data : "Unknown";
	} catch (e) { console.error("Failed to read secondary video metadata!", e, yt_page.initialData.contents); }

	ex_interpretMetadata();
	ui_setVideoMetadata();
	ui_setupMediaSession();
}

/* -------------------- */
/* -- Related Videos -- */
/* -------------------- */

function yt_extractRelatedVideoData() {
	yt_video.related = { videos: [] };
	
	// Extract related videos
	var results, extData;
	/* -- Desktop Website -- */
	if (yt_page.initialData.contents.twoColumnWatchNextResults) {
		var contents = yt_page.initialData.contents.twoColumnWatchNextResults.secondaryResults.secondaryResults;
		results = contents.results;
		extData = yt_page.initialData.webWatchNextResponseExtensionData;
		yt_video.related.conToken = contents.continuations? contents.continuations[0].nextContinuationData.continuation : undefined;
	}
	/* -- Mobile Website -- */
	else if (yt_page.initialData.contents.singleColumnWatchNextResults) {
		var contents = yt_page.initialData.contents.singleColumnWatchNextResults.results.results;
		results = contents.contents.find(c => c.itemSectionRenderer && c.itemSectionRenderer.sectionIdentifier == "related-items").itemSectionRenderer.contents;
		extData = yt_page.initialData.webWatchNextResponseExtensionData;
		yt_video.related.conToken = contents.continuations? contents.continuations[0].reloadContinuationData.continuation : undefined;
	
	}
	yt_extractRelatedVideosObject(results, extData);	
	ui_addRelatedVideos(0);	

	// Setup further loading
	if (yt_video.related.conToken && ct_isAdvancedCorsHost) { // Advanced host required for cookies
		ct_registerPagedContent("RV", I("relatedContainer"), yt_loadMoreRelatedVideos, ct_isDesktop? 100 : false);
		ct_checkPagedContent();
	}
}
function yt_loadMoreRelatedVideos (pagedContent) {
	if (ct_pref.relatedVideos != "ALL") return; // Still registered to allow it to load immediately when settings change
	
	var requestURL = HOST_YT + "/related_ajax?" + 
		"&ctoken=" + yt_video.related.conToken + "&continuation=" + yt_video.related.conToken + "&itct=" + yt_video.related.itctToken; 
	PAGED_REQUEST(pagedContent, "POST", requestURL, true, function(relatedData) {
		// Parsing
		try { yt_video.related.lastPage = JSON.parse(relatedData)[1]; 
		} catch (e) { console.error("Failed to extract related video data!", e, { relatedData: relatedData }); return; }		
		yt_updateNavigation(yt_video.related.lastPage);
		
		if (!yt_video.related.lastPage.response.continuationContents)
			return; // Happens rarely
		
		// Extract related videos
		var lastRelatedVideoCount = yt_video.related.videos.length;
		var contents = yt_video.related.lastPage.response.continuationContents.watchNextSecondaryResultsContinuation;
		var extData = yt_video.related.lastPage.response.webWatchNextResponseExtensionData;
		yt_extractRelatedVideosObject(contents.results, extData);
		ui_addRelatedVideos(lastRelatedVideoCount);
		yt_video.related.conToken = contents.continuations? contents.continuations[0].nextContinuationData.continuation : undefined;
		
		// Finish
		console.log("YT Comments:", yt_video.related, yt_video.related.lastPage);
		pagedContent.triggerDistance = 500; // Increase after first load
		return yt_video.related.conToken != undefined;
	});
}
function yt_extractRelatedVideosObject (results, extData) {

	try { // Extract video list
		// Unwrap container of first autoplay item
		if (results[0].compactAutoplayRenderer) results[0] = results[0].compactAutoplayRenderer.contents[0];
		// Remove all mixes and playlists, live streams, etc.
		results = results.filter(v => v.compactVideoRenderer && !v.compactVideoRenderer.badges);
		// Extract information out of unified container
		results.forEach(function (v) { 
			v = v.compactVideoRenderer;
			var relVid = { 
				title: yt_parseLabel(v.title),
				videoID: v.videoId,
				views: yt_parseNum(yt_parseLabel(v.viewCountText)),
				length: yt_parseTime(yt_parseLabel(v.lengthText)),
				thumbnailURL: yt_selectThumbnail(v.thumbnail.thumbnails),
				itctToken: v.navigationEndpoint.clickTrackingParams,
			};
			var uLink = v.shortBylineText.runs[0].navigationEndpoint.browseEndpoint;
			relVid.uploader =  { 
				name: yt_parseLabel(v.shortBylineText), 
				channelID: uLink.browseId,
				url: uLink.canonicalBaseUrl? uLink.canonicalBaseUrl : "/channel/" + uLink.browseId,
				userID: uLink.canonicalBaseUrl && uLink.canonicalBaseUrl.startsWith ("/user/")? uLink.canonicalBaseUrl.substring(6) : undefined,
				profileImg: yt_selectThumbnail(v.channelThumbnail.thumbnails),
				badge: v.ownerBadges && v.ownerBadges.length > 0? v.ownerBadges[0].metadataBadgeRenderer.tooltip : undefined,
				itctToken: v.shortBylineText.runs[0].navigationEndpoint.clickTrackingParams,
			};
			yt_video.related.videos.push(relVid); 
		});
	} catch (e) { console.error("Failed to extract related videos!", e, videoData); return; }
	
	try { // Load related infos (session data including itct token)
		var infos = extData.relatedVideoArgs.split(',').forEach(s => {
			var vidInfo = {};
			s.split('&').forEach(p => { var data = p.split('=');
				vidInfo[data[0]] = decodeURIComponent(data[1]).replace(/\+/g, ' ');
			});
			if (!vidInfo.list && !vidInfo.live_playback && vidInfo.id) {
				var relVid = yt_video.related.videos.find(v => v.videoID == vidInfo.id);
				if (relVid) relVid.sessionData = vidInfo.session_data; // Could be used to navigate (i.e. skip HTML and load JSON)
				//else console.log("Info about non-existant related video:", vidInfo);
			}
		});
	} catch (e) { console.error("Failed to extract additional related video information!", e, videoData); }
}

/* -------------------- */
/* ----- Comments -----	*/
/* -------------------- */

function yt_extractVideoCommentData () {
	yt_video.commentData = {};

	if (!yt_page.initialData) {
		console.warn("Can't extract comment data without initial data!", yt_page);
		return;
	}

	try { // Extract Comments Data
		var commentData;
		if (yt_page.initialData.contents.twoColumnWatchNextResults)
			commentData = yt_page.initialData.contents.twoColumnWatchNextResults.results.results.contents.find(c => c.itemSectionRenderer).itemSectionRenderer;
		else if (yt_page.initialData.contents.singleColumnWatchNextResults)
			commentData = yt_page.initialData.contents.singleColumnWatchNextResults.results.results.contents.find(c => c.commentSectionRenderer).commentSectionRenderer;
		if (commentData.continuations) {
			yt_video.commentData.conToken = commentData.continuations[0].nextContinuationData.continuation;
			yt_video.commentData.itctToken = commentData.continuations[0].nextContinuationData.clickTrackingParams;
		} else {
			yt_video.commentData.deactivated = true;
		}
		if (commentData.header) { // Mobile only
			yt_video.commentData.count = yt_parseNum(commentData.header.commentSectionHeaderRenderer.countText.runs[1].text);
			yt_video.commentData.sorted = "TOP"; // No way to select sorting on mobile website (only on app)
		}
	} catch (e) { console.error("Failed to extract comment data!", e, yt_page.initialData); }
	
	yt_video.commentData.comments = [];

	if (yt_video.commentData.conToken && ct_isAdvancedCorsHost && ct_pref.loadComments) { // Advanced host required for cookies
		ct_registerPagedContent("CM", I("vdCommentList"), yt_loadMoreComments, 100, yt_video.commentData);
		ct_checkPagedContent();
	}
}
function yt_loadTopComments () {
	if (!yt_video.commentData.conTokenTop) return;
	ui_resetComments();
	yt_video.commentData.conToken = yt_video.commentData.conTokenTop;
	ct_registerPagedContent("CM", I("vdCommentList"), yt_loadMoreComments, 100, yt_video.commentData);
	ct_checkPagedContent();
}
function yt_loadNewComments () {
	if (!yt_video.commentData.conTokenNew) return;
	ui_resetComments();
	yt_video.commentData.conToken = yt_video.commentData.conTokenNew;
	ct_registerPagedContent("CM", I("vdCommentList"), yt_loadMoreComments, 100, yt_video.commentData);
	ct_checkPagedContent();
}
function yt_loadCommentReplies (comment, replyContainer) {
	if (!comment || comment.replyData.count <= comment.replyData.replies.length || !comment.replyData.conToken) return;
	var pagedContent = ct_getPagedContent("CM" + comment.id);
	if (!pagedContent) pagedContent = ct_registerPagedContent("CM" + comment.id, replyContainer, yt_loadMoreComments, false, comment.replyData);
	yt_loadMoreComments(pagedContent);
}
function yt_loadMoreComments (pagedContent) {
	if (!pagedContent.data.conToken || !yt_video.commentData.itctToken)
		return;
	
	var isReplyRequest = pagedContent.data.replies != undefined;
	var requestURL = (yt_page.isDesktop? HOST_YT + "/comment_service_ajax?" : HOST_YT_MOBILE + "/watch_comment?") + 
		(isReplyRequest? "action_get_comment_replies" : "action_get_comments") + "=1&pbj=1" + 
		"&ctoken=" + pagedContent.data.conToken + (pagedContent.data.conToken.length < 3000 && yt_page.isDesktop? "&continuation=" + pagedContent.data.conToken : "") +  "&itct=" + yt_video.commentData.itctToken; 
	PAGED_REQUEST(pagedContent, "POST", requestURL, true, function(commentData) {
		// Parsing
		try { yt_video.commentData.lastPage = JSON.parse(commentData); 
		} catch (e) { console.error("Failed to get comment data!", e, { commentData: commentData }); return; }		
		if (isReplyRequest || !yt_page.isDesktop) yt_video.commentData.lastPage = yt_video.commentData.lastPage[1];
		yt_updateNavigation(yt_video.commentData.lastPage);
		
		// Extract comments
		var comments = pagedContent.data.comments || pagedContent.data.replies;
		var lastCommentCount = comments.length;
		yt_extractVideoCommentObject(pagedContent.data, yt_video.commentData.lastPage.response);
		ui_addComments(pagedContent.container, comments, lastCommentCount, pagedContent.data.conToken == undefined);
		
		// Finish
		console.log("YT Comments:", pagedContent.data, yt_video.commentData.lastPage);
		pagedContent.triggerDistance = 500; // Increase after first load
		return pagedContent.data.conToken != undefined;
	});
}

function yt_extractVideoCommentObject (data, response) {
	if (!response.continuationContents) {
		data.conToken = undefined;
		return;
	}
	var isReplyRequest = data.comments == undefined;
	var comments = data.comments || data.replies;
	var contents = isReplyRequest? response.continuationContents.commentRepliesContinuation : response.continuationContents.itemSectionContinuation || response.continuationContents.commentSectionContinuation;
	
	if (contents.header) {
		try { // Extract comment header
			var header = contents.header.commentsHeaderRenderer;
			yt_video.commentData.count = header.commentsCount? yt_parseNum(header.commentsCount.simpleText) : (header.countText? yt_parseNum(header.countText.runs[0].text) : 0);
			var sortList = header.sortMenu.sortFilterSubMenuRenderer.subMenuItems;
			yt_video.commentData.conTokenTop = sortList[0].continuation.reloadContinuationData.continuation;
			yt_video.commentData.conTokenNew = sortList[1].continuation.reloadContinuationData.continuation;
			yt_video.commentData.sorted = sortList[0].selected? "TOP" : "NEW";
		} catch (e) { console.error("Failed to extract comment header!", e, yt_video.commentData); }
	} // Only in first main request, never reply requests

	if (contents.contents || contents.items) {
		try { // Extract comments
			(contents.contents || contents.items).forEach(function (c) {
				var thread, comm;
				if (c.commentThreadRenderer) {
					thread = c.commentThreadRenderer;
				 	comm = thread.comment.commentRenderer;
				} else comm = c.commentRenderer;
				var comment = {
					id: comm.commentId,
					text: comm.contentText.runs? yt_parseFormattedRuns(comm.contentText.runs) : comm.contentText.simpleText,
					likes: comm.likeCount,
					publishedTimeAgoText: yt_parseLabel(comm.publishedTimeText),
				};
				comment.author = { // If no authorText, YT failed to get author internally (+ default thumbnail) - looking comment up by ID retrieves author correctly
					name: yt_parseLabel(comm.authorText) || "[UNKNOWN AUTHOR]",
					channelID: comm.authorEndpoint.browseEndpoint.browseId,
					url: comm.authorEndpoint.browseEndpoint.canonicalBaseUrl,
					userID: comm.authorEndpoint.browseEndpoint.canonicalBaseUrl.startsWith("/user/")? comm.authorEndpoint.browseEndpoint.canonicalBaseUrl.substring(6) : undefined,
					profileImg: yt_selectThumbnail(comm.authorThumbnail.thumbnails),
					isUploader: comm.authorIsChannelOwner,
				};
				if (thread) { // Main, first stage comment
					comment.replyData = { 
						count: comm.replyCount? comm.replyCount : 0,
						conToken: thread.replies? thread.replies.commentRepliesRenderer.continuations[0].nextContinuationData.continuation : undefined, 
						replies: comm.replyCount? [] : undefined,
					};
				}
				comments.push(comment);
			});
		} catch (e) { console.error("Failed to extract comments!", e, data); }
	}

	try {
		data.conToken = contents.continuations? contents.continuations[0].nextContinuationData.continuation : undefined;
	} catch (e) { console.error("Failed to extract comment continuation!", e, data); }
}

/* ------------------------------------------------- */
/* -------- Stream Decoding ------------------------ */
/* ------------------------------------------------- */

function yt_getSignCache (jsID) {
	var cache = G("jscache" + jsID);
	if (cache) {
		return cache.split(',').map(c => {
			var data = c.split('+');
			return { func: data[0], value: data[1] };
		});
	}
}
function yt_setSignCache (jsID, transform) {
	S("jscache" + jsID, transform.map(t => t.func + "+" + t.value).join(','));
}

// Sanitized transformation functions used in the signing process of youtube
function reverse (arr, b) { arr.reverse(); }
function splice (arr, b) { arr.splice(0,b); }
function swap (arr, b) { var a = arr[0]; arr[0] = arr[b%arr.length]; arr[b%arr.length] = a; }

function yt_decodeStreams () {
	var parseStreams = function (streamData) {
		var stream = {};
		var params = streamData.split('&');
		for (var i = 0; i < params.length; i++) {
			var data = params[i].split('=');
			stream[data[0]] = decodeURIComponent(data[1]).replace(/\+/g, ' ');
		}
		return stream;
	}
	
	// Parse stream data strings as objects (both normal and adaptive)
	var legacyStreams, adaptiveStreams;
	if (yt_page.config.args.player_response.streamingData) {
		legacyStreams = yt_page.config.args.player_response.streamingData.formats;
		adaptiveStreams = yt_page.config.args.player_response.streamingData.adaptiveFormats;
	}
	// Load from raw string data
	if (!legacyStreams) legacyStreams = (yt_page.config.args.url_encoded_fmt_stream_map || "").split (',').map (s => parseStreams(s));
	if (!adaptiveStreams) adaptiveStreams = (yt_page.config.args.adaptive_fmts || "").split (',').map (s => parseStreams(s));
	// Combine
	yt_video.streams = (legacyStreams || []).concat(adaptiveStreams || []);
	
	// Decode video stream data
	if (yt_video.useCipher) {
		var jsID = yt_page.config.assets.js;
		var signTransformation = yt_getSignCache(jsID);
		if (!signTransformation) { // Extract and cache signing transformation from large base.js (2MB download)
			WGET_CORS(HOST_YT + jsID, function(jsSRC) {
				signTransformation = yt_extractSignTransform(jsSRC)
				yt_setSignCache(jsID, signTransformation);
				yt_signStreams(signTransformation);
				yt_processStreams();
			});
		} else { // Use cached signing transformation
			yt_signStreams(signTransformation);
			yt_processStreams();
		}
	} else {
		yt_processStreams();
	}
}
function yt_extractSignTransform(jsSRC) {
	// Get list of functions applied on the cipher in jsSRC code
	var tFuncCalls = jsSRC.match (/=function\(\w\)\{\w=\w\.split\(""\);(.*?);return \w\.join\(""\)\};/)[1].split(';');
	// Get list of function definitions out of the containing object in jsSRC code
	var tFuncDefs = jsSRC.match (new RegExp("var " + tFuncCalls[0].split('.')[0] + "=\\{([\\s\\S]*?)\\};"))[1].split(/,[\n\r]/);
	// Create mapping between jsSRC function name and sanitized implementation name
	var transformMap = {};
	for (var i = 0; i < tFuncDefs.length; i++) {
		var funcName = tFuncDefs[i].split(':')[0].trim();
		if (tFuncDefs[i].includes("reverse")) transformMap[funcName] = "rv";
		else if (tFuncDefs[i].includes("splice")) transformMap[funcName] = "sp";
		else if (tFuncDefs[i].includes("%")) transformMap[funcName] = "sw";
		else console.error("Unknown decoding function '" + tFuncDefs[i] + "'!", tFuncCalls, tFuncDefs);
	}
	// Create list of operations {function name, parameter} defining the final signing transformation
	var transformPlan = [];
	for (var i = 0; i < tFuncCalls.length; i++) {
		var callData = tFuncCalls[i].match(/\w+\.(\w+)\(\w,(\d+)\)/);
		transformPlan.push({ func : transformMap[callData[1]], value : callData[2] });
	}
	return transformPlan;
}
function yt_signStreams(signTransformation) {
	var signFunc = function (cipher) {
		var arr = cipher.split('');
		for (var i = 0; i < signTransformation.length; i++) { 
			switch (signTransformation[i].func) {
				case "rv": reverse(arr, signTransformation[i].value); break;
				case "sp": splice(arr, signTransformation[i].value); break;
				case "sw": swap(arr, signTransformation[i].value); break;
			}
			// Shortform broken by JS Minifiers mangling the function names
			// window[signTransformation[i].func](arr, signTransformation[i].value);
		}
		return arr.join('');
	}
	// Sign any stream urls that are yet unsigned
	// s is unsigned cipher to sign, url requires signature, sp is parameter name to assign the signature to
	for (var i = 0; i < yt_video.streams.length; i++) {
		var stream = yt_video.streams[i];
		if (stream.cipher) // Encoded on mobile: s, url, sp
			new URLSearchParams (stream.cipher).forEach(function (v, n) { stream[n] = v; });
		stream.url = stream.url + "&" + (stream.sp || "sig") + "=" + encodeURIComponent(signFunc(stream.s));
		if (!stream.url.includes("ratebypass")) stream.url += "&ratebypass=yes";
	}
}
function yt_processStreams () {
	// Process streams into unified format (discarding some information,)
	for (var i = 0; i < yt_video.streams.length; i++) {
		// Copy and process data into new stream object
		var s = yt_video.streams[i];
		var stream = {};
		stream.url = s.url;
		stream.itag = s.itag;
		// ITag-encoded data
		if (ITAGS[s.itag] !== undefined) {
			//stream.vResX = ITAGS[s.itag].x;
			//stream.vResY = ITAGS[s.itag].y;
			//stream.vFPS = ITAGS[s.itag].fps;
			stream.aBR = ITAGS[s.itag].aBR;
			stream.isLive = ITAGS[s.itag].hls;
			stream.isStereo = ITAGS[s.itag].ss3D;
		} else console.error("Unknown stream ITag '" + stream.itag + "'!", yt_video.streams);
		// Format
		stream.mimeType = s.mimeType;
		var mime = s.mimeType.match(/(\w+)\/(\w+);\scodecs="([a-zA-Z-0-9.,\s]*)"/);
		var codecs = mime[3].split(', ');
		stream.hasVideo = mime[1] == "video";
		stream.hasAudio = mime[1] == "audio" || codecs.length == 2;
		stream.isDash = codecs.length == 1;
		stream.container = mime[2];
		// Video	
		stream.vCodec = stream.isDash? (stream.hasVideo? codecs[0] : undefined) : codecs[0];
		stream.vBR = s.bitrate;
		stream.vResX = s.width;
		stream.vResY = s.height;
		stream.proj = s.projectionType;
		stream.vFPS = s.fps;
		// Dash
		if (stream.isDash && s.type != "FORMAT_STREAM_TYPE_OTF") {
			stream.start = parseInt(s.indexRange.start);
			stream.end = parseInt(s.indexRange.end);
		}
		// Audio
		stream.aCodec = stream.isDash? (stream.hasVideo? undefined : codecs[0]) : codecs[1];
		stream.aChannels = yt_parseNum(s.audio_channels || s.audioChannels);
		stream.aSR = yt_parseNum(s.audio_sample_rate || s.audioSampleRate);
		yt_video.streams[i] = stream;
	}
	yt_video.loaded = true;
	ct_mediaLoaded();
}

//endregion


/* -------------------------------------------------------------------------------------------------------------- */
/* ----------------- UI CONTENT --------------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------------------------------------------- */

//region

/* -------------------- */
/* --- UI LAYOUT ------ */
/* -------------------- */

function ui_updatePageLayout () {
	var fontSize = parseFloat(getComputedStyle(document.body).fontSize);
	ct_isDesktop = window.innerWidth / fontSize > 60;
	var setDesktop = document.body.classList.contains ("desktop");
	if (ct_isDesktop && !setDesktop) {
		if (ct_pref.smallPlayer)  // Move main player into main column 
			ht_main.appendChild(sec_player);
		ht_main.appendChild(sec_home);
		ht_main.appendChild(sec_video);
		ht_main.appendChild(sec_comments);
		ht_main.appendChild(sec_search);
		ht_main.appendChild(sec_channel);
		ht_side.appendChild(sec_playlist);
		ht_side.appendChild(sec_related);
		document.body.classList.add("desktop");
		document.body.classList.remove("mobile");
	}
	if (!ct_isDesktop && setDesktop) {
		if (ct_pref.smallPlayer) // Move main player back
			ht_container.insertBefore(sec_player, ht_container.firstChild);
		ht_mobile.appendChild(sec_playlist);
		ht_mobile.appendChild(sec_home);
		ht_mobile.appendChild(sec_video);
		ht_mobile.appendChild(sec_related);
		ht_mobile.appendChild(sec_comments);
		ht_mobile.appendChild(sec_search);
		ht_mobile.appendChild(sec_channel);
		document.body.classList.add("mobile");
		document.body.classList.remove("desktop");
	}
	if (!ct_isDesktop) { // Collapse playlist on mobile by default
		I("playlist").setAttribute("collapsed", "");
	}
}


/* -------------------- */
/* --- UI STATE -------	*/
/* -------------------- */

function ui_initStates () {
	ui_updatePageState();
	ui_updateSoundState();
	ui_updateOptionsState();
	ui_updateStreamState();
	ui_updatePlayerState();

	ui_updateTimelineProgress();
	ui_updateTimelineBuffered();
	ui_updateTimelinePeeking();
}
function ui_updatePageState () {
	document.body.className = document.body.className.replace(/\s?theme-[a-zA-Z]+\s?/gi, ' ');
	document.body.classList.add("theme-" + ct_pref.theme.toLowerCase());
}
function ui_updateSoundState () { 
	I("muteButton").setAttribute("state", ct_pref.muted? "on" : "off");
	I("volumeBar").style.width = (ct_pref.muted? 0 : ct_pref.volume*100) + "%";
	I("volumePosition").style.left = (ct_pref.muted? 0 : ct_pref.volume*100) + "%";
}
function ui_updateOptionsState () {
	setDisplay("optionsPanel", ct_temp.options? "flex" : "none");
	I("optionsButton").setAttribute("state", ct_temp.options? "on" : "off");
	I("loopToggle").checked = ct_temp.loop;
}
function ui_updateStreamState (selectedStreams) {
	I("legacyStreamToggle").checked = !ct_pref.dash;
	setDisplay("legacyStreamGroup", ct_pref.dash? "none" : "block");
	setDisplay("dashStreamGroup", ct_pref.dash? "block" : "none");
	I("select_dashContainer").value = ct_pref.dashContainer;
	if (selectedStreams) {
		I("select_dashVideo").value = !selectedStreams.dashAudio? "NONE" : 
			(isNaN(parseInt(ct_pref.dashVideo))? ct_pref.dashVideo : selectedStreams.dashVideo.vResY*100+selectedStreams.dashVideo.vFPS);
		I("select_dashAudio").value = !selectedStreams.dashAudio? "NONE" : 
			(isNaN(parseInt(ct_pref.dashAudio))? ct_pref.dashAudio: selectedStreams.dashAudio.aBR);
		I("select_legacy").value = !selectedStreams.dashAudio? "NONE" : 
			(isNaN(parseInt(ct_pref.legacyVideo))? ct_pref.legacyVideo : selectedStreams.legacyVideo.vResY);
	} else if (yt_video && yt_video.loaded) {
		// Triggered by changes to selectableStreams (streams were deemed unavailable)
		var dropdown = I("select_dashVideo");
		[].forEach.call(dropdown.options, o => {
			if (!isNaN(parseInt(o.value)) && yt_video.streams.findIndex(s => s.isDash && s.hasVideo && !s.unavailable && s.vResY*100+s.vFPS == o.value) == -1)
				o.label += " !";
		});
	}
}
function ui_updatePlayerState () {
	sec_player.style.display = ct_page == Page.Media? "block" : "none";
	I("playButton").setAttribute("state", ct_paused? "off" : "on");
	setDisplay("bufferingIndicator", ct_state == State.Loading || (ct_state == State.Started && ct_flags.buffering)? "block" : "none");
	setDisplay("errorIndicator", ct_state == State.Error? "block" : "none");
	setDisplay("endedIndicator", ct_state == State.Ended? "block" : "none");
	setDisplay("nextLoadIndicator", "none");
	setDisplay("startPlayIndicator", ct_state == State.PreStart? "block" : "none");
	setDisplay("videoPoster", ct_state == State.Started && ct_sources.video? "none" : "block");
}
function ui_updateFullscreenState () {
	I("fullscreenButton").setAttribute("state", ct_temp.fullscreen? "on" : "off");
	var d = document;
	var fsEl = d.fullscreenElement || d.webkitFullscreenElement || d.mozFullScreenElement || d.msFullscreenElement;
	var exit = d.exitFullscreen || d.webkitExitFullscreen || d.mozCancelFullScreen || d.msExitFullscreen;
	d = d.documentElement;
	var req = d.requestFullscreen || d.webkitRequestFullScreen || d.mozRequestFullScreen || d.msRequestFullscreen;
	if (ct_temp.fullscreen) {
		if (!fsEl) req.call(sec_player);
		sec_player.setAttribute("fullscreen", "");
	} else {
		if (fsEl) exit.call(document);
		sec_player.removeAttribute("fullscreen");
	}
}
function ui_indicatePause () {
	clearTimeout(ui_timerIndicator);
	I("playIndicator").removeAttribute("trigger");
	I("pauseIndicator").removeAttribute("trigger");
	I("pauseIndicator").setAttribute("trigger", "");
	ui_timerIndicator = setTimeout(() => I("pauseIndicator").removeAttribute("trigger"), 500);
}
function ui_indicatePlay () {
	clearTimeout(ui_timerIndicator);
	I("playIndicator").removeAttribute("trigger");
	I("pauseIndicator").removeAttribute("trigger");
	I("playIndicator").setAttribute("trigger", "");
	ui_timerIndicator = setTimeout(() => I("playIndicator").removeAttribute("trigger"), 500);
}
function ui_setPoster () {
	// Recreate to reset object fallback
	var oldVideoPoster = I("videoPoster");
	var newVideoPoster = oldVideoPoster.cloneNode(true);
	oldVideoPoster.parentElement.insertBefore (newVideoPoster, oldVideoPoster.nextSibling);
	oldVideoPoster.parentElement.removeChild (oldVideoPoster);
	I("videoPoster").data = !yt_videoID? "" : (HOST_YT_IMG + yt_videoID + "/maxresdefault.jpg");;
	I("videoPosterFallback").data = !yt_videoID? "" : (HOST_YT_IMG + yt_videoID + "/hqdefault.jpg");;
}

function ui_setupMediaSession () {
	if (navigator.mediaSession) {
		navigator.mediaSession.metadata = new MediaMetadata ({
			title: yt_video.meta.title,
			artist: yt_video.meta.uploader.name,
			artwork: [ { src: yt_video.meta.thumbnailURL } ]
		});
	}
}


/* -------------------- */
/* --- FORMATTING -----	*/
/* -------------------- */

function ui_formatDate (date) {
	return date.getDate() + ". " + date.toString().slice(4,7) + " " + date.getFullYear();
}
function ui_formatTimeText (time) {
	var sec = time - time % 1;
	var min = (sec/60) - (sec/60) % 1;
	var hrs = (min/60) - (min/60) % 1;
	var posMin = min-hrs*60;
	var posSec = sec-posMin*60-hrs*60*60;
	return (hrs > 0? (hrs + ":") : "") + (hrs > 0 && posMin < 10? "0" : "") + posMin + ":" + (posSec < 10? "0" : "") + posSec;
}
function ui_shortenNumber (num) {
	var p = function (from, to) { return ((num - num%Math.pow(10,from)) - (num - num%Math.pow(10,to || from+3))) / Math.pow(10,from); }
	if (num >= 1000000000) return p(9) + "," + p(7,8) + "B";
	if (num >= 10000000) return p(6,9) + "M";
	if (num >= 1000000) return p(6,9) + "," + p(5,6) + "M";
	if (num >= 10000) return p(3,6) + "K";
	if (num >= 1000) return p(3,6) + "," + p(2,3) + "K";
	return num + "";
}
function ui_formatNumber (num) {
	var p = function (from, to) { 
		var n = "" + ((num - num%Math.pow(10,from)) - (num - num%Math.pow(10,to || from+3))) / Math.pow(10,from);
		while (to && n.length < to-from) n = "0" + n;
		return n;
	}
	if (num >= 1000000000) return p(9) + "." + p(6,9) + "." + p(3,6) + "." + p(0,3);
	if (num >= 1000000) return p(6) + "." + p(3,6) + "." + p(0,3);
	if (num >= 1000) return p(3) + "." + p(0,3);
	return num + "";
}
function ui_formatDescription(text) {
	if (!text) return "";
	// NOTE: (^|\s|[^\w\/]) is delimiter for word-boundaries minus URL /
	// It will need to be restored, so that any : or other fancy chars will stay
	// Prevent tags in the description
	text = text.replace(/</g,'&lt;').replace(/>/g,'&gt;');
	// Restore bold and italic and empty links
	text = text.replace(/&lt;(\/?(?:b|i|a))&gt;/g,'<$1>');
	// Replace newlines with tags
	text = text.replace(/\n/g, '<br>\n');
	// URLs starting with http://, https://, or ftp://
	text = text.replace(/(^|\s|[^\w\/<>])((?:https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim, '$1<a href="$2">$2</a>');
	// URLs starting with "www."
	text = text.replace(/(^|\s|[^\w\/<>])(?:^|[^\/])(www\.[\S]+(\b|$))/gim, '$1<a href="http://$2">$2</a>');
	// Change email addresses to mailto:: links.
	text = text.replace(/(^|\s|[^\w\/<>])([a-zA-Z0-9\-\_\.]+@[a-zA-Z\_]+?(?:\.[a-zA-Z]{2,6})+)/gim, '$1<a href="mailto:$2">$2</a>');
	// Change timestamps to clickable timestamp links.
	text = text.replace(/([0-9]+:)?([0-9]+):([0-9]+)/gim, function(match) {
		var time = yt_parseTime(match);
		var url = new URL(window.location.href);
		url.searchParams.set("t", time + "s");
		return '<a href="' + (url.pathname + url.search) + '" onclick="md_updateTime(' + time + '); return false;">' + match + '</a>';
	});
	// Special social-media links
	text = text.replace(/(^|\s|[^\w\/<>])@([a-zA-Z0-9\_]+)/gim, '$1<a href="https://twitter.com/$2">@$2</a>'); // Twitter
	text = text.replace(/(^|\s|[^\w\/<>])(sm[0-9]{5,})/gim, '$1<a href="https://www.nicovideo.jp/watch/$2">$2</a>'); // NND Videos
	text = text.replace(/(^|\s|[^\w\/<>])mylist\/([0-9]{5,})/gim, '$1<a href="https://www.nicovideo.jp/mylist/$2">mylist/$2</a>'); // NND Mylists
	text = text.replace(/(^|\s|[^\w\/<>])(co[0-9]{5,})/gim, '$1<a href="https://com.nicovideo.jp/community/$2">$2</a>'); // NND Communities
	return text;
}


/* -------------------- */
/* --- UI SETTINGS ----	*/
/* -------------------- */

function ui_openSettings () {
	setDisplay("settingsPanel", "block");
	I("st_autoplay").checked = ct_pref.autoplay;
	I("st_plshuffle").checked = ct_pref.playlistRandom;
	I("st_theme").value = ct_pref.theme;
	I("st_related").value = ct_pref.relatedVideos;
	I("st_corsHost").value = ct_pref.corsAPIHost;
	I("st_filter_hide").checked = ct_pref.filterHideCompletely;
	I("st_comments").checked = ct_pref.loadComments;
	var filterCats = I("st_filter_categories");
	ui_fillCategoryFilter(filterCats);
	filterCats.firstElementChild.innerText = filterCats.countUnselected() + " filtered";
} 
function ui_closeSettings () {
	setDisplay("settingsPanel", "none");
} 


/* -------------------- */
/* --- UI HOME --------	*/
/* -------------------- */

function ui_setupHome () {
	if (ct_page != Page.Home) return;
	var playlistContainer = I("homePlaylists");
	playlistContainer.innerHTML = "";
	db_loadPlaylistIndex(function () {
		db_playlists.forEach(function (pl) {
			ht_appendPlaylistElement(playlistContainer, pl.listID, pl.thumbID, pl.title, pl.author, pl.count + " videos");
		});
		sec_home.style.display = "block";
	})
}

function ui_resetHome () {
	I("homePlaylists").innerHTML = "";
	sec_home.style.display = "none";
}


/* -------------------- */
/* --- UI PLAYER ------	*/
/* -------------------- */

function ui_setStreams () {
	var fillDropdown = function(dropdown, elements) {
		while (dropdown.childElementCount > 0) dropdown.remove(dropdown.lastChild); 
		ui_addDropdownElement(dropdown, "BEST", "Best");
		var unique = {};
		elements.filter(e => unique.hasOwnProperty(e.value) ? false : (unique[e.value] = true))
				.forEach (e => ui_addDropdownElement(dropdown, e.value, e.label));
		ui_addDropdownElement(dropdown, "WORST", "Worst");
		ui_addDropdownElement(dropdown, "NONE", "None");
	}
	// Fill dropdowns with available values
	var selectableStreams = md_selectableStreams();
	fillDropdown(I("select_dashVideo"), selectableStreams.dashVideo.map(function(s) { 
		return { value: s.vResY*100+s.vFPS, label: s.vResY + "p" + (s.vFPS != 30? "" + s.vFPS : "") }; 
	}));
	fillDropdown(I("select_dashAudio"), selectableStreams.dashAudio.map(function(s) { 
		return { value: s.aBR, label: s.aBR + "kbps" }; 
	}));
	fillDropdown(I("select_legacy"), selectableStreams.legacyVideo.map(function(s) { 
		return { value: s.vResY, label: s.vResY + "p / " + s.aBR + "kbps" }; 
	}));
}
function ui_resetStreams () {
	var resetDropdown = function(dropdown) { 
		while (dropdown.childElementCount > 0) dropdown.remove(dropdown.lastChild); 
		ui_addDropdownElement(dropdown, undefined, "None");
	}
	resetDropdown (I("select_dashVideo"));
	resetDropdown (I("select_dashAudio"));
	resetDropdown (I("select_legacy"));
}


/* -------------------- */
/* --- UI VIDEO -------	*/
/* -------------------- */

function ui_setVideoMetadata() {
	sec_video.style.display = "block";
	sec_comments.style.display = "block";
	I("vdTitle").innerText = yt_video.meta.title;
	I("vdViews").innerText = ui_formatNumber(yt_video.meta.views) + " views";
	if (yt_video.meta.likes != undefined) {
		I("vdUpvotes").innerText = ui_shortenNumber(yt_video.meta.likes);
		I("vdDownvotes").innerText = ui_shortenNumber(yt_video.meta.dislikes);
		I("vdSentiment").style.width = (yt_video.meta.likes/(yt_video.meta.dislikes+yt_video.meta.likes)*100) + "%";
		I("vdSentiment").parentElement.style.display = "block";
	} else {
		I("vdUpvotes").innerText = "---";
		I("vdDownvotes").innerText = "---";
		I("vdSentiment").parentElement.style.display = "none";
	}
	var uploaderNav = yt_video.meta.uploader.userID? ("u=" + yt_video.meta.uploader.userID) : ("c=" + yt_video.meta.uploader.channelID);
	[].forEach.call(document.getElementsByClassName("vdUploadLink"), function (link) {
		link.setAttribute("navigation", uploaderNav);
		link.href = ct_getNavLink(uploaderNav);
	});
	I("vdUploaderImg").src = yt_video.meta.uploader.profileImg;
	I("vdUploaderName").innerText = yt_video.meta.uploader.name;
	I("vdUploaderSubscribers").innerText = "SUBSCRIBE " + (ct_isDesktop? ui_formatNumber(yt_video.meta.uploader.subscribers) : ui_shortenNumber(yt_video.meta.uploader.subscribers));
	I("vdUploadDate").innerText = "Uploaded on " + ui_formatDate(yt_video.meta.uploadedDate);
	I("vdDescription").innerHTML = ui_formatDescription(yt_video.meta.description);

	var container = I("vdMetadata");
	yt_video.meta.metadata.forEach(m => {
		container.insertAdjacentHTML("beforeEnd", "<span>" + m.name + ":</span>");
		container.insertAdjacentHTML("beforeEnd", "<span>" + m.data + "</span>");
	});
	if (yt_video.meta.credits) {
		yt_video.meta.credits.forEach(m => {
			container.insertAdjacentHTML("beforeEnd", "<span>" + m.name + ":</span>");
			container.insertAdjacentHTML("beforeEnd", "<span>" + m.data + "</span>");
		});
	}

	ui_setupCollapsableText(I("vdTextContainer"), 8);
}
function ui_resetVideoMetadata () {
	sec_video.style.display = "none";
	sec_comments.style.display = "none";
	I("vdTitle").innerText = "";
	I("vdViews").innerText = "0 views";
	I("vdUpvotes").innerText = "0";
	I("vdDownvotes").innerText = "0";
	I("vdSentiment").style.width = "0%";
	I("vdUploaderImg").removeAttribute("src");
	I("vdUploaderName").innerText = "";
	I("vdUploadDate").innerText = "";
	I("vdDescription").innerHTML = "";
	I("vdMetadata").innerHTML = "";
}


/* -------------------- */
/* --- UI RELATED -----	*/
/* -------------------- */

function ui_addRelatedVideos (startIndex) {
	var videoContainer = I("relatedContainer");
	if (!startIndex) startIndex = 0;
	for(var i = startIndex; i < yt_video.related.videos.length; i++) {
		var video = yt_video.related.videos[i];
		ht_appendVideoElement(videoContainer, undefined, video.videoID, ui_formatTimeText(video.length), video.title, video.uploader.name, ui_shortenNumber(video.views) + " views");
	}
	sec_related.style.display = "block";
	ui_updateRelatedVideos();
}
function ui_updateRelatedVideos () {
	if (yt_video && yt_video.related) {
		if (ct_pref.relatedVideos == "NONE") {
			sec_related.style.display = "none";
		} else {
			sec_related.style.display = "block";
			var videoContainer = I("relatedContainer");
			[].forEach.call(videoContainer.children, function (c) {
				var filtered = false;
				// TODO
				c.style.display = ct_pref.relatedVideos == "ALL" && !filtered? "" : "none";
			});
			if (ct_pref.relatedVideos == "NEXT") {
				// TODO var firstMatch = videoContainer.firstElementChild;
				videoContainer.firstElementChild.style.display = "";
			}
		}
	}
}
function ui_resetRelatedVideos () {
	sec_related.style.display = "none";
	I("relatedContainer").innerHTML = "";
}


/* -------------------- */
/* --- UI COMMENTS ----	*/
/* -------------------- */

function ui_addComments (container, comments, startIndex, finished) {
	I("vdCommentLabel").innerText = ui_formatNumber (yt_video.commentData.count) + " comments";
	if (!startIndex) startIndex = 0;
	for(var i = startIndex; i < comments.length; i++) {
		var comm = comments[i];
		ht_appendCommentElement(container, comm.id, comm.author.userID? ("u=" + comm.author.userID) : ("c=" + comm.author.channelID), 
			comm.author.profileImg, comm.author.name, comm.publishedTimeAgoText, ui_formatDescription(comm.text), 
			ui_formatNumber(comm.likes), comm.replyData? comm.replyData.count : undefined);
	}
	ui_setupDropdowns();
	var loader = Array.from(container.children).find(c => c.className.includes("contentLoader"));
	if (loader) { // Update content loader button
		loader.parentElement.appendChild(loader);
		loader.style.display = finished? "none" : "";
	}
}
function ui_resetComments () {
	I("vdCommentLabel").innerText = "";
	I("vdCommentList").innerHTML = "";
}


/* -------------------- */
/* --- UI SEARCH ------	*/
/* -------------------- */

function ui_setupSearch () {
	sec_search.style.display = "block";
	ui_fillCategoryFilter (I("search_categories"));
	if (ct_pref.filterHideCompletely) I("search_hideCompletely").setAttribute("toggled", "");
	else I("search_hideCompletely").removeAttribute("toggled");
	I("searchField").value = yt_searchTerms;
}
function ui_addSearchResults (container, startIndex) {
	if (!startIndex) startIndex = 0;
	for(var i = startIndex; i < yt_searchResults.videos.length; i++) {
		var video = yt_searchResults.videos[i];
		ht_appendVideoElement(container, undefined, video.videoID, ui_formatTimeText(video.length), video.title, video.uploader.name, ui_shortenNumber(video.views) + " views");
	}
	ui_updateSearchResults();
}
function ui_updateSearchResults () {
	if (ct_page != Page.Search || !yt_searchResults) return;
	var videoContainer = I("searchContainer");
	[].forEach.call(videoContainer.children, function (c) {
		var videoID = c.getAttribute("videoID");
		var video = yt_searchResults.videos.find(v => v.videoID == videoID);
		var filtered = !video || ct_pref.filterCategories.includes(video.categoryID);
		c.style.display = filtered && ct_pref.filterHideCompletely? "none" : "";
		c.style.opacity = filtered && !ct_pref.filterHideCompletely? 0.2 : 1;
	});
}
function ui_resetSearch () {
	sec_search.style.display = "none";
	I("searchContainer").innerHTML = "";
}


/* -------------------- */
/* --- UI CHANNEL -----	*/
/* -------------------- */

function ui_setChannelMetadata () {
	if (yt_channel.meta.bannerImg) {
		I("chBannerImg").src = yt_channel.meta.bannerImg;
		sec_banner.style.display = "block";
		var linkContainer = I("chLinkBar");
		for(var i = 0; i < yt_channel.meta.links.length; i++) {
			var link = yt_channel.meta.links[i];
			ht_appendChannelLinkElement(linkContainer, link.link, link.icon, link.title);
		}
	} else I("chBannerImg").removeAttribute("src");

	sec_channel.style.display = "block";
	I("chProfileImg").src = yt_channel.meta.profileImg;
	I("chName").innerText = yt_channel.meta.name;
	I("chSubscribers").innerText = yt_channel.meta.subscribers? ui_formatNumber(yt_channel.meta.subscribers) + " subscribers" : " ";
	I("chDescription").innerHTML = ui_formatDescription(yt_channel.meta.description);
	ui_setupCollapsableText(I("chDescription").parentElement);
}
function ui_resetChannelMetadata () {
	sec_banner.style.display = "none";
	I("chBannerImg").removeAttribute("src");
	I("chLinkBar").innerHTML = "";

	sec_channel.style.display = "none";
	I("chProfileImg").removeAttribute("src");
	I("chName").innerText = "Name";
	I("chSubscribers").innerText = "0 subscribers";
	I("chDescription").innerHTML = "";
}
function ui_setupChannelTabs () {
	var tabBar = I("chTabBar");
	var container = I("chVideoContainer");
	if (yt_channel.uploads.tabs.length == 1) {
		var tab = yt_channel.uploads.tabs[0];
		tab.section = ht_appendFullVideoSection(container, tab.title, tab.id);
		tab.container = I("f-" + tab.id);
		tabBar.style.display = "none";
	} else {
		ht_appendTabHeader(tabBar, "Overview", "overview").setAttribute("selected", "");
		yt_channel.uploads.tabs.forEach (function (tab) {
			tab.tabHeader = ht_appendTabHeader(tabBar, tab.title, tab.id);
			tab.section = ht_appendFullVideoSection(container, tab.title, tab.id);
			tab.section.style.display = "none";
			tab.container = I("f-" + tab.id)
			tab.smallSection = ht_appendCollapsedVideoSection(container, tab.title, tab.id);
			tab.smallContainer = I("c-" + tab.id)
		});
		tabBar.style.display = "flex";
	}
}
function ui_addChannelTabHeader (name, id) {
	setDisplay("chTabBar", "block");
	return ht_appendTabHeader (I("chTabBar"), name, id);
}
function ui_addChannelSection (name, id) {
	return ht_appendVideoSection (I("chVideoContainer"), name, id);
}
function ui_setChannelSection (name, id) {
	return ht_setVideoSection (I("chVideoContainer"), name, id);
}
function ui_addChannelUploads (videoContainer, videos, startIndex, maxIndex) {
	if (!startIndex) startIndex = 0;
	if (!maxIndex) maxIndex = videos.length;
	for(var i = startIndex; i < videos.length && i < maxIndex; i++) {
		var video = videos[i];
		ht_appendVideoElement(videoContainer, undefined, video.videoID, ui_formatTimeText(video.length), video.title, ui_shortenNumber(video.views) + " views", video.uploadedTimeAgoText);
	}
}
function ui_resetChannelUploads () {
	var tabBar = I("chTabBar");
	tabBar.innerHTML = "";
	tabBar.style.display = "none";
	I("chVideoContainer").innerHTML = "";
}


/* -------------------- */
/* --- UI PLAYLIST ----	*/
/* -------------------- */

function ui_setupPlaylist () {
	I("plTitle").innerText = "";
	I("plDetail").innerText = "";
	sec_playlist.style.display = "block";
	setDisplay("plLoadingIndicator", "initial");
	ui_addLoadingIndicator(I("plVideos"), true);
	ui_setPlaylistSaved(false);
	db_loadPlaylistIndex(function () {
		ui_setPlaylistSaved(db_hasPlaylistSaved(yt_playlistID));
	});
}
function ui_setPlaylistSaved (saved) {
	setDisplay("plSave", saved? "none" : "initial");
	setDisplay("plRemove", saved? "initial" : "none");
	setDisplay("plUpdate", saved? "initial" : "none");
}
function ui_setPlaylistFinished () {
	setDisplay("plLoadingIndicator", "none");
}
function ui_addToPlaylist (startIndex) {
	I("plTitle").innerText = yt_playlist.title;
	I("plDetail").innerText = yt_playlist.author + " - " + yt_playlist.videos.length + " videos";
	var videoContainer = I("plVideos");
	ui_removeLoadingIndicator(videoContainer);
	if (!startIndex) startIndex = 0;
	var focusIndex = undefined;
	for(var i = startIndex; i < yt_playlist.videos.length; i++) {
		var video = yt_playlist.videos[i];
		videoContainer.appendChild (ht_getVideoPlaceholder(video.videoID, video.title, video.uploader.name));
		if (video.videoID == yt_videoID) focusIndex = i;
	}
	sec_playlist.style.display = "block";
	if (focusIndex != undefined) {
		videoContainer.scrollTop = Math.max(0, videoContainer.scrollHeight * focusIndex / videoContainer.childElementCount - 40);
	}
	videoContainer.onscroll = ui_checkPlaylist;
	I("playlist").onCollapse = function () { // Triggered by collapser
		ui_setPlaylistPosition();
		ui_checkPlaylist();
	}
	ui_checkPlaylist();
}
function ui_resetPlaylist () {
	var videoContainer = I("plVideos");
	videoContainer.innerHTML = "";
	videoContainer.removeAttribute("top-loaded");
	videoContainer.removeAttribute("bottom-loaded");
	sec_playlist.style.display = "none";

}
function ui_setPlaylistPosition() {
	var videoContainer = I("plVideos");
	videoContainer.scrollTop = Math.max(0, videoContainer.scrollHeight * ct_getVideoPlIndex() / videoContainer.childElementCount - 40);
}
function ui_checkPlaylist () {
	if (!yt_playlist) return; // Unloaded
	var container = I("plVideos");
	ui_adaptiveListLoad(container, yt_playlist.videos.length, function (index) {
		var video = yt_playlist.videos[index];
		ht_fillVideoPlaceholder(container.children[index], index+1, video.videoID, ui_formatTimeText(video.length));
	}, function (index) {
		ht_clearVideoPlaceholder(container.children[index]);
	});
}

//endregion


/* -------------------------------------------------------------------------------------------------------------- */
/* ----------------- UI INTERACTIVITY --------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------------------------------------------- */

//region


/* -------------------- */
/* -- UI HELPERS ------	*/
/* -------------------- */

function ui_isMouseIn (mouse, element) {
	var rect = element.getBoundingClientRect();
  	return mouse.clientX >= rect.left && mouse.clientX <= rect.right && mouse.clientY >= rect.top && mouse.clientY <= rect.bottom;
}
function ui_isInCascade (parent, element, steps) {
	while (element && steps-- > 0) {
		if (element == parent) return true;
		element = element.parentElement;
	}
	return false;
}
function ui_hasCascadedID (element, id, steps) {
	while (element && steps-- > 0) {
		if (element.id.includes(id)) return element;
		element = element.parentElement;
	}
	return undefined;
}
function ui_hasCascadedClass (element, className, steps) {
	while (element && steps-- > 0) {
		if (element.classList && element.classList.contains(className)) return element;
		element = element.parentElement;
	}
	return undefined;
}
function ui_hasDescendedClass (element, className) {
	if (element.classList.contains (className)) return element;
	return element.getElementsByClassName(className)[0];
}


/* -------------------- */
/* -- UI CONTROLS -----	*/
/* -------------------- */

function ui_setupCollapsableText (element, max) {
	if (!max) max = 5;
	var collapsable = ui_hasDescendedClass(element, "collapsable"); // include element itself
	var collapser = element.getElementsByClassName("collapser")[0];
	var textContent = element.getElementsByClassName("textContent")[0] || collapsable;
	if (collapsable && collapser) {
		collapsable.removeAttribute("collapsed");
		var style = getComputedStyle(textContent);
		if (collapsable.offsetHeight / parseInt(style.lineHeight) > max*1.05) {
			collapsable.setAttribute("collapsed", "");
			collapser.innerText = collapser.getAttribute("more-text");
			collapser.style.display = "block";
		} else {
			collapser.style.display = "none";
		}
	}
}
function ui_addLoadingIndicator (container, inside) {
	if (container.nextSibling && container.nextSibling.className && container.nextSibling.className.toString().includes("loadingIndicator"))
		return;
	if (inside && container.getElementsByClassName("loadingIndicator").length != 0)
		return;
	var loader = document.createElement("div");
	if (inside) container.appendChild(loader);
	else container.parentNode.insertBefore(loader, container.nextSibling);
	loader.outerHTML = 
		'<div class="loadingIndicator"> \n' +
			'<svg viewBox="0 0 48 48"><use href="#svg_loadCircle"/></svg> \n' +
		'</div> \n';
}
function ui_removeLoadingIndicator (container) {
	while (container.nextSibling && container.nextSibling.className && container.nextSibling.className.toString().includes("loadingIndicator"))
		container.parentElement.removeChild(container.nextSibling);
	[].forEach.call(container.getElementsByClassName("loadingIndicator"), function (l) { container.removeChild(l); });
}
function ui_addDropdownElement (dropdown, value, label) {
	var opt = document.createElement("option");
	opt.value = value; opt.innerText = label;
	dropdown.appendChild (opt);
	return opt;
}
function ui_addDropdownElementCustom (dropdown, value, label) {
	var opt = document.createElement("span"); // or anything really
	opt.setAttribute("tabindex", 0);
	opt.setAttribute("value", value);
	opt.innerText = label;
	dropdown.appendChild (opt);
	return opt;
}
function ui_setupDropdowns () {
	var scriptDropdowns = document.getElementsByClassName("dropdown script");
	[].forEach.call(scriptDropdowns, function (d) {
		d.container = d.getElementsByClassName("dropdownContent")[0];
		d.options = d.container.children;
		d.getOptions = function () { return [].slice.call(d.options); }
		d.getSelected = function () { return [].filter.call(d.options, o => o.selected, 0); }
		d.getUnselected = function () { return [].filter.call(d.options, o => !o.selected, 0); }
		d.countSelected = function () { return [].reduce.call(d.options, (c, o) => c + (o.selected? 1 : 0), 0); }
		d.countUnselected = function () { return [].reduce.call(d.options, (c, o) => c + (!o.selected? 1 : 0), 0); }
		var handler = function (event) { ui_handleDropdown(d, event); };
		d.onclick = handler;
		d.addEventListener("blur", handler, true);
	});

	var toggleDropdowns = document.getElementsByClassName("dropdown toggle");
	[].forEach.call(toggleDropdowns, function (d) {
		onToggleButton(d);
	});
}
function ui_fillCategoryFilter (categories) {
	categories.container.innerHTML = "";
	Object.keys(CATEGORIES).forEach (c => {
		var el = ui_addDropdownElementCustom(categories.container, c, CATEGORIES[c]);
		el.selected = !ct_pref.filterCategories.includes(parseInt(c));
	});
}


/* -------------------- */
/* -- UI GENERIC ------	*/
/* -------------------- */

function ui_adaptiveListLoad (container, count, load, unload) {
	if (container.scrollHeight <= 0) return; // collapsed
	// Previously Loaded
	var prevTop = parseInt(container.getAttribute ("top-loaded"));
	var prevBot = parseInt(container.getAttribute ("bottom-loaded"));
	if (isNaN(prevTop)) prevTop = count;
	if (isNaN(prevBot)) prevBot = -1;
	// New Loaded
	var topLd, botLd;
	if (count < 40) { // Load All
		topLd = 0;
		botLd = count-1;
	} else { // Load visible + margin
		const margin = 4;
		var topEl = Math.floor((container.scrollTop/container.scrollHeight) * count);
		var botEl = Math.ceil(((container.scrollTop+container.clientHeight)/container.scrollHeight) * count);
		topLd = Math.max (0, topEl-margin);
		botLd = Math.min (count-1, botEl + margin);
	}
	// Apply
	if (prevTop == topLd && prevBot == botLd) return;
	for (var i = topLd; i <= botLd && i < count; i++) {
		if (prevTop > i || prevBot < i) load(i);
	}
	for (var i = prevTop; i <= prevBot && i < count; i++) {
		if (topLd > i || botLd < i) unload(i);
	}
	container.setAttribute("top-loaded", topLd);
	container.setAttribute("bottom-loaded", botLd);
}
function ui_updateSlider (mouse) {
	if (ui_dragSlider) {
		if ((mouse.buttons & 1) == 0 || !ui_isMouseIn(mouse, document.body)) {
			ui_dragSlider = false;
			return;
		}
		var sliderValue = ui_dragSliderElement.getElementsByClassName("sliderBar value")[0];
		if (!sliderValue) return;
		var sliderKnob = ui_dragSliderElement.getElementsByClassName("sliderKnob")[0];
		var sliderRect = ui_dragSliderElement.getBoundingClientRect();
	  	var sliderPos = Math.min(1, Math.max(0, (mouse.clientX - sliderRect.left) / sliderRect.width));
		sliderValue.style.width = sliderPos*100 + "%";
		sliderKnob.style.left = sliderPos*100 + "%";
		ui_dragSliderElement.value = sliderPos;
		if (ui_dragSliderElement.onchange != undefined) ui_dragSliderElement.onchange();
	}	
	else if (mouse.type == "mousedown" && mouse.buttons & 1 != 0) {
		if (ui_dragSliderElement) {
			ui_dragSliderElement.parentElement.removeAttribute("interacting");
			ui_dragSliderElement = undefined;
		}
		if (mouse.target && mouse.target.className.toString().indexOf("slider") >= 0) {
			var sliderControl = mouse.target;
			while (mouse.target.className.toString().indexOf("slider") >= 0 && !sliderControl.classList.contains("slider")) 
				sliderControl = sliderControl.parentElement;
			if (!sliderControl.classList.contains(("slider"))) return;
			ui_dragSlider = true;
			ui_dragSliderElement = sliderControl;
			ui_dragSliderElement.parentElement.setAttribute("interacting", "");
			ui_updateSlider(mouse);
		}
	}
}
function ui_handleDropdown (dropdown, event) {
	var click = event.type == "click"; // Else focusout
	if (!ui_isInCascade(dropdown, click? document.activeElement : event.relatedTarget, 3)) {
		dropdown.removeAttribute("toggled"); // Focus not in dropdown - close
	} else if (click && dropdown.hasAttribute("toggled")) {
		var close = true;
		if (dropdown != document.activeElement) {
			var selected = document.activeElement, steps = 2, onSelect;
			while (selected && selected.parentElement && !selected.parentElement.classList.contains("dropdownContent") && steps-- > 0) selected = selected.parentElement;
			if (selected.parentElement.classList.contains("dropdownContent")) { // Select element was clicked
				if (dropdown.classList.contains("multiple")) {
					selected.selected = !selected.selected;
					if (selected.selected) selected.setAttribute("selected", "");
					else selected.removeAttribute("selected");
					close = false;
				}
				if (dropdown.onchange) dropdown.onchange(selected.getAttribute("value"), dropdown, selected);
			}
		}
		if (close) dropdown.removeAttribute("toggled");
	} else {
		dropdown.setAttribute("toggled", "");
		[].forEach.call(dropdown.options, function (c) {
			if (c.selected) c.setAttribute("selected", "");
			else c.removeAttribute("selected");
		});
	}
}


/* -------------------- */
/* -- UI TIMELINE -----	*/
/* -------------------- */

function ui_updateTimelineProgress () {
	// Time Label
	if (ct_totalTime > 0) timeLabel.innerText = ui_formatTimeText(ct_curTime) + " / " + ui_formatTimeText(ct_totalTime);
	else timeLabel.innerText = "0:00 / 0:00";
	// Timeline
	var progress = ct_totalTime > 0? (ct_curTime / ct_totalTime * 100) : 0;
	timelineProgress.style.width = progress + "%";
	timelinePosition.style.left = progress + "%";
}
function ui_updateTimelineBuffered () {
	var buffered = ct_totalTime > 0? ((md_getBufferedAhead()+ct_curTime) / ct_totalTime * 100) : 0;
	timelineBuffered.style.width = buffered + "%";
}
function ui_updateTimelinePeeking (mouse) {
	if (ct_state == State.None) {
		timelinePeeking.style.width = "0%";
		return;
	}
	if (mouse) {
		var timelineRect = timelineControl.getBoundingClientRect();
	  	var timelinePeekPos = Math.min(1, Math.max(0, (mouse.clientX - timelineRect.left) / timelineRect.width));
		if (ct_state == State.Started && ct_flags.seeking) {
			if ((mouse.buttons & 1) != 0 && ui_isMouseIn(mouse, document.body)) {
				md_updateTime(timelinePeekPos * ct_totalTime);
				timelinePeeking.style.width = "0%";
			} else { // Left bounds or released mouse button
				ct_endSeeking ();
				timelineControl.removeAttribute("interacting");
			}
		} else if (ui_isMouseIn(mouse, timelineControl)) {
			if (mouse.type == "mousedown" && mouse.buttons & 1 != 0) {
				ct_beginSeeking();
				md_updateTime(timelinePeekPos * ct_totalTime);
				timelineControl.setAttribute("interacting", "");
				timelinePeeking.style.width = "0%";
			} else { // Peeking in timeline bounds
				timelinePeeking.style.width = (timelinePeekPos*100) + "%";
			}
		} else { // Reset peeking if outside timeline bounds
			timelinePeeking.style.width = "0%";
		}
	} else {
		timelinePeeking.style.width = "0%";
	}
}


/* -------------------- */
/* -- UI CONTROL BAR --	*/
/* -------------------- */

function ui_showControlBar () {
	ui_cntControlBar = 0;
	sec_player.removeAttribute("retracted");
	ct_temp.showControlBar = true;
}
function ui_hideControlBar () {
	ui_cntControlBar = 10*3;
	sec_player.setAttribute("retracted", "");
	ct_temp.showControlBar = false;
	I("volumeSlider").parentElement.removeAttribute("interacting");
}
function ui_updateControlBar (mouse) { // MouseEvent + 100ms Interval
	if (ct_temp.options) { // Force show when options are open
		ui_showControlBar();
		return;
	}
	if (ct_isPlaying()) {
		if (mouse) { // Mouse Action - Show on mouse move or click
			if (ui_isMouseIn(mouse, sec_player)) {
				if (mouse.type != "mousemove" || mouse.movementX * mouse.movementX + mouse.movementY * mouse.movementY > 0.1) {
					ui_showControlBar();
				}
			} else ui_hideControlBar();
		} else { // Interval - Hide when mouse unmoved
			if (ui_cntControlBar > 10*3) ui_hideControlBar();
			else ui_cntControlBar++;
		}
	} else ui_showControlBar(); // Force show on pause / buffering / seeking
}


/* -------------------- */
/* -- UI HANDLERS -----	*/
/* -------------------- */

function ui_setupEventHandlers () {

	/* DOM Events */
	document.onvisibilitychange = onPageVisibilityChange;
	window.onresize = onWindowResize;
	window.onpopstate = onHistoryChange;
	
	/* General Input */
	document.body.onkeydown = onKeyDown;
	document.body.onkeyup = onKeyUp;
	document.body.onmousedown = onMouseDown;
	document.body.onmouseup = onMouseUp;
	document.body.onclick = onMouseClick;
	document.body.onmousemove = onMouseUpdate;
	document.body.onmouseleave = onMouseLeave;
	document.body.onscroll = onMouseScroll;
	//ht_container.onscroll = onMouseScroll;
	//ht_content.onscroll = onMouseScroll;

	/* Media Events */
	// Video
	videoMedia.preload = "auto";
	videoMedia.onabort = onMediaAbort;
	videoMedia.onerror = onMediaError;
	videoMedia.onstalled = onMediaStalled;
	videoMedia.onsuspend = onMediaSuspended;
	videoMedia.onwaiting = onMediaWaiting;
	videoMedia.onprogress = onMediaBuffering;
	videoMedia.onended = onMediaEnded;
	videoMedia.ontimeupdate = onMediaTimeUpdate;
	// Audio
	audioMedia.preload = "auto";
	audioMedia.onabort = onMediaAbort;
	audioMedia.onerror = onMediaError;
	audioMedia.onstalled = onMediaStalled;
	audioMedia.onsuspend = onMediaSuspended;
	audioMedia.onwaiting = onMediaWaiting;
	audioMedia.onprogress = onMediaBuffering;
	audioMedia.onended = onMediaEnded;
	audioMedia.ontimeupdate = onMediaTimeUpdate;

	/* Setup */
	ui_setupDropdowns();

	// Control Bar hiding (+ in onmouse events)
	setInterval(ui_updateControlBar, 100);
	controlBar.addEventListener ("focus", ui_showControlBar, true);
	
	/* Button Handlers */
	// Header
	I("searchField").onkeyup = function (event) { if (event.key == 'Enter') onSearchGo() };
	I("searchButton").onclick = onSearchGo;
	I("settingsOpenButton").onclick = onSettingsToggle;
	I("settingsCloseButton").onclick = onSettingsToggle;
	// Control Buttons
	I("prevButton").onclick = onControlPrev;
	I("playButton").onclick = onControlPlay;
	I("nextButton").onclick = onControlNext;
	I("muteButton").onclick = onControlMute;
	I("optionsButton").onclick = onToggleOptions;
	I("fullscreenButton").onclick = onToggleFullscreen;
	I("volumeSlider").onchange = onControlVolumeChange;
	// Options Panel
	I("select_legacy").onchange = onSelectStreams;
	I("select_dashContainer").onchange = onSelectStreams;
	I("select_dashVideo").onchange = onSelectStreams;
	I("select_dashAudio").onchange = onSelectStreams;
	I("legacyStreamToggle").onchange = onToggleLegacyStream;
	I("loopToggle").onchange = onToggleLoop;
	// Playlist
	I("plClose").onclick = ct_resetPlaylist;
	I("plSave").onclick = db_savePlaylist;
	I("plRemove").onclick = db_removePlaylist;
	I("plUpdate").onclick = ct_updatePlaylist;
	// Context
	I("videoContextActions").onchange = onSelectContextAction;
	I("channelContextActions").onchange = onSelectContextAction;
	// Settings Panel
	I("st_theme").onchange = function () { onSettingsChange("TH"); };
	I("st_autoplay").onchange = function () { onSettingsChange("AP"); };
	I("st_plshuffle").onchange = function () { onSettingsChange("PS"); };
	I("st_related").onchange = function () { onSettingsChange("RV"); };
	I("st_filter_categories").onchange = function () { onSettingsChange("FV"); };
	I("st_filter_hide").onchange = function () { onSettingsChange("FV"); };
	I("st_comments").onchange = function () { onSettingsChange("CM"); };
	I("st_corsHost").onchange = function () { onSettingsChange("CH"); };
	// Search Bar
	I("search_categories").onchange = onSearchUpdate;
	onToggleButton(I("search_hideCompletely"), onSearchUpdate);
	I("searchContextActions").onchange = onSelectContextAction;
	// Update Notification
	I("newVersionUpdate").onclick = sw_update;
	I("newVersionClose").onclick = function () { setDisplay("newVersionPanel", "none")};
	
}

//endregion


/* -------------------------------------------------------------------------------------------------------------- */
/* ----------------- UI CALLBACKS ------------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------------------------------------------- */

//region


/* -------------------- */
/* -- DOM HANDLERS ----	*/
/* -------------------- */

function onPageVisibilityChange () {
	// Fix video position (video is only advancing when visible)
	if (document.visibilityState == "visible")
		md_assureSync();
}
function onWindowResize () {
	ui_updatePageLayout ();
}
function onHistoryChange () {
	window.scrollTo(0, 0);
	ct_resetContent();
	ct_readParameters();
	ct_loadContent();
}


/* -------------------- */
/* -- BUTTON HANDLERS -	*/
/* -------------------- */

function onSettingsToggle () {
	ct_temp.settings = !ct_temp.settings;
	if (ct_temp.settings) {
		//if (ct_state == State.Started) // Pause if playing
		//	ct_mediaPlayPause(true, true);
		ui_openSettings ();
	} else {
		ui_closeSettings ();
		if (ct_page == Page.Search) ui_setupSearch();
	}
}
function onSettingsChange (hint) {
	switch (hint) {
		case "AP": 
			ct_pref.autoplay = I("st_autoplay").checked;
			break;
		case "PS": 
			ct_pref.playlistRandom = I("st_plshuffle").checked;
			break;
		case "CH":
			ct_pref.corsAPIHost = I("st_corsHost").value;
			break;
		case "FV":
			ct_pref.filterHideCompletely = I("st_filter_hide").checked;
			ct_pref.filterCategories = I("st_filter_categories").getUnselected().map(o => parseInt(o.getAttribute("value")));
			I("st_filter_categories").firstElementChild.innerText = I("st_filter_categories").countUnselected() + " filtered";
			ui_updateSearchResults();
			break;
		case "CM":
			ct_pref.loadComments = I("st_comments").checked;
		case "TH": 
			ct_pref.theme = I("st_theme").value;
			ui_updatePageState(); 
			break;
		case "RV":
			ct_pref.relatedVideos = I("st_related").value;
			ui_updateRelatedVideos(); 
			break;
		default: 
			break;
	}
	ct_savePreferences();
}
function onSearchGo () {
	ct_navSearch(I("searchField").value);
}
function onSearchUpdate () {
	ct_pref.filterHideCompletely = I("search_hideCompletely").hasAttribute("toggled");
	ct_pref.filterCategories = I("search_categories").getUnselected().map(o => parseInt(o.getAttribute("value")));
	ui_updateSearchResults();
	ct_savePreferences();
}
function onControlPlay () {
	ct_mediaPlayPause(!ct_paused, false);
}
function onControlNext () {
	ct_nextVideo();
}
function onControlPrev () {
	history.back();
}
function onControlMute () {
	ct_pref.muted = !ct_pref.muted;
	md_updateVolume();
	ct_savePreferences();
}
function onControlVolumeChange () {
	md_updateVolume(I("volumeSlider").value);
	ct_savePreferences();
}
function onToggleFullscreen () {
	ct_temp.fullscreen = !ct_temp.fullscreen;
	ui_updateFullscreenState();
}
function onToggleOptions () {
	ct_temp.options = !ct_temp.options;
	ui_updateOptionsState();
	ui_updateControlBar();
}
function onToggleLoop() {
	ct_temp.loop = !ct_temp.loop;
	ui_updateOptionsState();
}
function onToggleLegacyStream() {
	ct_pref.dash = !ct_pref.dash;
	ct_savePreferences();
	md_updateStreams();
}
function onSelectStreams () {
	ct_pref.legacyVideo = I("select_legacy").value;
	ct_pref.dashVideo = I("select_dashVideo").value;
	ct_pref.dashAudio = I("select_dashAudio").value;
	ct_pref.dashContainer = I("select_dashContainer").value;
	ct_savePreferences();
	md_updateStreams();
}
function onSelectContextAction (selectedValue, dropdownElement, selectedElement) {
	var selectedValue = selectedValue || "";
	if (selectedValue == "top") yt_loadTopComments ();
	else if (selectedValue == "new") yt_loadNewComments ();
}
function onLoadReplies (container, commentID) {
	var comment = yt_video.commentData.comments.find(c => c.id == commentID);
	yt_loadCommentReplies(comment, container);
}
function onToggleButton (button, callback) {
	button.onclick = function () {
		var toggled = button.toggleAttr("toggled");
		if (callback) callback(toggled);
	}
}
function onBrowseTab (tabID) {
	[].forEach.call(I("chTabBar").children, function (header) { header.removeAttribute("selected"); });
	if (tabID == "overview") {
		yt_channel.uploads.tabs.forEach(function (tab) {
			tab.section.style.display = "none";
			if (tab.smallSection) tab.smallSection.style.display = "block";
		});
		I("h-overview").setAttribute("selected", "");
	} else {
		var selectedTab = yt_channel.uploads.tabs.find(function (t) { return t.id == tabID; });
		yt_channel.uploads.tabs.forEach(function (tab) {
			tab.section.style.display = "none";
			if (tab.smallSection) tab.smallSection.style.display = "none";
		});
		selectedTab.section.style.display = "block";
		selectedTab.tabHeader.setAttribute("selected", "");
	}
}


/* -------------------- */
/* -- MOUSE HANDLERS --	*/
/* -------------------- */

function onMouseClick (mouse) {
	if (mouse.defaultPrevented) return;
	var overridePlayer = false;
	var target;

	// Handle click outside of fullscreen panel to close it
	if (mouse.target.classList.contains("fullscreenPanel")) {
		if (mouse.target.id == "settingsPanel") ui_closeSettings();
		else mouse.target.style.display = "none";
		mouse.preventDefault();
		return;
	}
	
	// Handle Close Options when clicked outside of opened panel or button
	if (ct_temp.options && !ui_hasCascadedID(mouse.target, "optionsButton", 3) && !ui_hasCascadedID(mouse.target, "optionsPanel", 4)) {
		onToggleOptions();
		overridePlayer = true;
	}
	
	// Handle Media Player Click
	if (mouse.target.classList.contains("controlOverlay")) {
		// Don't register touch when control bar isn't shown (it will be shown afterwards, though)
		var isTouch = mouse.sourceCapabilities && mouse.sourceCapabilities.firesTouchEvents;
		if (!overridePlayer && (ct_temp.showControlBar || !isTouch))  
			ct_mediaPlayPause(!ct_paused, true);
		mouse.preventDefault();
	}

	// Show control bar after click has been registered above
	ui_updateControlBar(mouse);

	// Handle In-Page Navigation
	if (mouse.target && mouse.target.hasAttribute("navigation")) {
		var match = mouse.target.getAttribute("navigation").match(/^(.*?)=(.*)$/);
		if (match) {
			switch (match[1]) {
				case "v":  ct_navVideo(match[2]); break;
				case "u": ct_navChannel({ user: match[2] }); break;
				case "c": ct_navChannel({ channel: match[2] }); break;
				case "q": ct_navSearch(match[2]); break;
				case "list": ct_loadPlaylist(match[2]); break;
				case "tab": onBrowseTab(match[2]); break;
				default: break;
			}
		}
		mouse.preventDefault();
	}

	// Handle Toggles
	if (mouse.target && (target = ui_hasCascadedClass(mouse.target, "toggle", 3)))
		target.toggleAttr("toggled");

	// Handle Collapser
	if (target = ui_hasCascadedClass(mouse.target, "collapser", 4)) {
		var collapsable = ui_hasCascadedClass(target, "collapsable", 4);
		var text = collapsable.toggleAttr("collapsed")? "more-text" : "less-text";
		if (target.hasAttribute(text)) target.innerText = target.getAttribute(text);
		if (collapsable.onCollapse) collapsable.onCollapse();
	}

	// Handle Content Loader
	if (target = ui_hasCascadedClass(mouse.target, "contentLoader", 2)) {
		var container = target.parentElement.className.includes("contentContainer")? target.parentElement 
				: target.parentElement.getElementsByClassName("contentContainer")[0];
		new Function ("container", target.getAttribute("load-content"))(container);
		container.setAttribute("loaded", "");
		if (target.className.includes("collapser")) // Only act as collapser from now on
			target.classList.remove("contentLoader");
	}
}
function onMouseUpdate (mouse) {
	ui_updateControlBar(mouse);
	ui_updateTimelinePeeking(mouse);
	ui_updateSlider(mouse);
}
function onMouseDown (mouse) {
	if (ui_isMouseIn(mouse, timelineControl))
		ui_updateTimelinePeeking(mouse);
	ui_updateSlider(mouse);
}
function onMouseLeave (mouse) {
	ui_updateControlBar(mouse);
	ui_updateTimelinePeeking(mouse);
	ui_updateSlider(mouse);
}
function onMouseUp (mouse) {
	ui_updateTimelinePeeking(mouse);
	ui_updateSlider(mouse);
}
function onMouseScroll (mouse) {
	ui_updateControlBar(mouse);
	ui_updateTimelinePeeking(mouse);
	ct_checkPagedContent();
}


/* -------------------- */
/* -- KEYBOARD HANDLER	*/
/* -------------------- */

function onKeyDown (keyEvent) {
	if (keyEvent.defaultPrevented) return;
	if (document.activeElement.tagName == "INPUT") return;
	var pass = false;
	switch (keyEvent.key) {
		case " ": case "k":
			ct_mediaPlayPause(!ct_paused, true);
			break;
		case "Left": case "ArrowLeft": case "j": 
			ct_beginSeeking();
			md_updateTime(ct_curTime - 5);
			break;
		case "Right": case "ArrowRight": case "l":
			ct_beginSeeking();
			md_updateTime(ct_curTime + 5);
			break;
		case "Up": case "ArrowUp": 
			md_updateVolume(ct_pref.volume + 0.1);
			ct_savePreferences();
			break
		case "Down": case "ArrowDown": 
			md_updateVolume(ct_pref.volume - 0.1);
			ct_savePreferences();
			break;
		case "f": 
			onToggleFullscreen();
			pass = true;
			break;
		case "m": 
			onControlMute();
			break;
		case "n": 
			if(keyEvent.shiftKey) 
				onControlNext();
			break;
		case "p": 
			if(keyEvent.shiftKey) 
				onControlPrev();
			break;
		default:
			if (keyEvent.keyCode >= 48 && keyEvent.keyCode <= 57)
				md_updateTime(ct_totalTime * (keyEvent.keyCode-48)/10);
			else
				pass = true;
	}
	if (!pass) {
		event.preventDefault();
		ui_showControlBar();
	}
}
function onKeyUp (keyEvent) {
	var pass = false;
	switch (keyEvent.key) {
		case "Left": case "ArrowLeft": case "Right": case "ArrowRight": 
			ct_endSeeking();
			break;
		default:
			pass = true;
	}
	if (!pass) {
		event.preventDefault();
		ui_showControlBar();
	}
}


/* -------------------- */
/* -- MEDIA HANDLERS --	*/
/* -------------------- */

function onMediaAbort () {
	ct_mediaError(new Error(this.tagName + " aborted!"));
}
function onMediaError (error) {
	if (!error.target || error.target.error.message != "MEDIA_ELEMENT_ERROR: Empty src attribute")  {
		ct_mediaError(error);
	}
}
function onMediaStalled () {
	console.log("WARNING: " + this.tagName + " stalled!");
}
function onMediaSuspended () {
	// If video is suspended, waiting for more data to load is useless
	// Only used in cases where browser caps buffer ahead to ~2-3s for no reason
	if (this.tagName == "VIDEO")
		md_cntBufferPause += 8;
	//console.log("WARNING: " + this.tagName + " suspended!");
	//md_assureSync();
}
function onMediaWaiting () {
	md_checkBuffering();
	md_assureSync();
}
function onMediaBuffering () {
	if (ct_state == State.Started && !ct_flags.buffering)
		md_assureBuffer();
	ui_updateTimelineBuffered();
}
function onMediaEnded () {
	ct_mediaEnded();
}
function onMediaTimeUpdate () {
	// Prefer audio - it will advance when not viewed, video not
	// And syncing video to audio is less noticeable than the other way around
	if (ct_state == State.Started && !ct_flags.seeking) {
		if (ct_sources.audio) ct_curTime = audioMedia.currentTime;
		else if (ct_sources.video) ct_curTime = videoMedia.currentTime;
		else ct_curTime = 0;
		ui_updateTimelineProgress();
	}
}

//endregion


/* -------------------------------------------------------------------------------------------------------------- */
/* ----------------- MEDIA FUNCTIONS ---------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------------------------------------------- */

//region


/* -------------------- */
/* ---- STREAMS ------- */
/* -------------------- */

// Assign value to streams for sorting: DashVideo DashAudio LegacyVideo
function md_dvVal (s) { return (s.vResY * 100 + s.vFPS) * 2 + (s.container == ct_pref.dashContainer? 1 : 0); }
function md_daVal (s) { return s.aBR; }
function md_lvVal (s) { return s.vResY; }

function md_selectableStreams () {
	if (!yt_video && yt_video.loaded) return undefined;
	// Return streams available in each category sorted from best to worst
	var streams = {};
	streams.dashVideo = yt_video.streams
		.filter(s => !s.unavailable && s.isDash && s.hasVideo && videoMedia.canPlayType(s.mimeType))
		.sort((s1, s2) =>  md_dvVal(s1) > md_dvVal(s2)? -1 : 1);
	streams.dashAudio = yt_video.streams
		.filter(s => !s.unavailable && s.isDash && s.hasAudio && audioMedia.canPlayType(s.mimeType))
		.sort((s1, s2) =>  md_daVal(s1) > md_daVal(s2)? -1 : 1);
	streams.legacyVideo = yt_video.streams
		.filter(s => !s.unavailable && !s.isDash && videoMedia.canPlayType(s.mimeType))
		.sort((s1, s2) =>  md_daVal(s1) > md_daVal(s2)? -1 : 1);
	return streams;
}
function md_selectStreams () {
	if (!yt_video && yt_video.loaded) return undefined;
	// Return the selected stream in each category according to preferences
	var select = function (s, pref, value, sec) { // SECondary selector, f.E. container
		if (pref == "NONE" || s.length == 0) return undefined;
		if (s.length == 1) return s[0];
		if (pref == "BEST") return s[0];
		if (pref == "WORST") // Still select the preferred container
			return sec && value(s[s.length-2]) == value(s[s.length-1])+1? s[s.length-2] : s[s.length-1];
		return s.find(s1 => value(s1) <= (sec? parseInt(pref)*2+1 : parseInt(pref))) || s[s.length-1];
	}
	var allStreams = md_selectableStreams();
	var streams = {};
	streams.dashVideo = select(allStreams.dashVideo, ct_pref.dashVideo, md_dvVal, true);
	streams.dashAudio = select(allStreams.dashAudio, ct_pref.dashAudio, md_daVal);
	streams.legacyVideo = select(allStreams.legacyVideo, ct_pref.legacyVideo, md_lvVal);
	console.log("MD: Selected Streams:", streams);
	return streams;
}
function md_updateStreams ()  {
	if (!yt_video || !yt_video.loaded) {
		ct_sources = undefined;
		return;
	}
	var loadStream = function (media, source)  {
		media.src = source;
		media.currentTime = ct_curTime;
		media.load();
	}
	// Read selected streams from UI
	var selectedStreams = md_selectStreams();
	ct_sources = {};
	if (ct_pref.dash) {
		ct_sources.video = selectedStreams.dashVideo? selectedStreams.dashVideo.url : '';
		ct_sources.audio = selectedStreams.dashAudio? selectedStreams.dashAudio.url : '';
	} else {
		ct_sources.video = selectedStreams.legacyVideo? selectedStreams.legacyVideo.url : '';
		ct_sources.audio = '';
	}
	ui_updateStreamState(selectedStreams);
	// Trigger reload
	if ((videoMedia.src != ct_sources.video && ct_sources.video) || (audioMedia.src != ct_sources.audio && ct_sources.audio)) {
		// One stream will need buffering after change
		videoMedia.pause(); audioMedia.pause();
	}
	if (videoMedia.src != ct_sources.video) loadStream(videoMedia, ct_sources.video);
	if (audioMedia.src != ct_sources.audio) loadStream(audioMedia, ct_sources.audio);
	ui_updatePlayerState();
	md_checkStartMedia();
}
function md_resetStreams () {
	videoMedia.pause();
	//videoMedia.removeAttribute("src");
	videoMedia.src = "";
	videoMedia.load();
	audioMedia.pause();
	//audioMedia.removeAttribute("src");
	audioMedia.src = "";
	audioMedia.load();
}


/* -------------------- */
/* ---- STATE --------- */
/* -------------------- */

function md_updateTime(time) {
	if (time != undefined) ct_curTime = time;
	ct_curTime = Math.min(ct_totalTime, Math.max(0, ct_curTime))
	videoMedia.currentTime = ct_curTime;
	audioMedia.currentTime = ct_curTime;
	ui_updateTimelineProgress();
	ui_updateTimelineBuffered();
	if (!ct_flags.seeking) md_checkBuffering();
}
function md_updateVolume (volume) {
	if (volume != undefined) ct_pref.volume = volume;
	ct_pref.volume  = Math.min(1, Math.max(0, ct_pref.volume));
	if (ct_pref.dash) {
		videoMedia.muted = true;
		audioMedia.muted = ct_pref.muted;
	} else {
		videoMedia.muted = ct_pref.muted;
		audioMedia.muted = true;
	}
	videoMedia.volume = ct_pref.volume;
	audioMedia.volume = ct_pref.volume;
	ui_updateSoundState();
}


/* -------------------- */
/* ---- PLAYBACK ------ */
/* -------------------- */

function md_pause(explicit) {
	if (!md_attemptPlayStarted) {
		videoMedia.pause();
		audioMedia.pause();
		onMediaTimeUpdate();
	} else if (explicit) md_attemptPause = true;
	//videoMedia.currentTime = ct_curTime;
	//audioMedia.currentTime = ct_curTime;
}
function md_checkStartMedia() {
	if (!ct_paused) {
		if (ct_canPlay())
			md_checkBuffering();
		else { // Enter prestart
			ct_paused = true;
			ct_mediaReady();
		}
	}
}
function md_checkBuffering(forceBuffer) {
	clearTimeout(md_timerCheckBuffering);
	if (md_attemptPlayStarted) return;
	if (!ct_sources) return;
	if (!ct_sources.video && !ct_sources.audio) {
		console.error("Sources not yet loaded");
		return;
	}
	if (ct_paused || ct_flags.buffering) { // Assure times are synced
		videoMedia.currentTime = ct_curTime;
		audioMedia.currentTime = ct_curTime;
	}
	// Get current buffer in front of current position
	var bufferedAhead = md_getBufferedAhead();
	var finishedBuffering = ct_curTime + bufferedAhead > ct_totalTime-1;
	if (bufferedAhead >= md_lastBuffer) md_cntBufferPause = 0;
	md_lastBuffer = bufferedAhead-bufferedAhead%0.1+0.1;

	// Decide if buffering is needed / should continue
	if (ct_flags.buffering) { // Known to need buffering (preloading or interrupted)
		if ((bufferedAhead >= 2 && md_cntBufferPause > 10) || bufferedAhead >= 4 || finishedBuffering) {
			console.info("MD: Finished buffering " + bufferedAhead.toFixed(0) + "s ahead!");
			if (!ct_paused) {
				console.info("MD: Starting media playback!");
				md_forceStartMedia();
				md_assureBuffer();
			} else {
				ct_mediaReady();
			}
		} else { // Recheck until buffering is finished
			console.info("MD: Buffering " + bufferedAhead.toFixed(0) + "s ahead!");
			md_timerCheckBuffering = setTimeout(md_checkBuffering, 500);
			md_cntBufferPause++;
		}
	} else { // Suspect buffering from waiting event or resume operation
		if (!ct_paused && videoMedia.paused && audioMedia.paused) {
			if (bufferedAhead >= 4 || finishedBuffering) {
				console.info("MD: Starting media playback!");
				md_forceStartMedia();
				md_assureBuffer();
			} else {
				console.info("MD: Start buffering!");
				ct_flags.buffering = true;
				ui_updatePlayerState();
				md_timerCheckBuffering = setTimeout(md_checkBuffering, 500);
			}
		}
		else if (!finishedBuffering && (bufferedAhead <= 1.5 || forceBuffer)) {
			console.info("MD: Start buffering!");
			md_pause();
			ct_flags.buffering = true;
			ui_updatePlayerState();
			md_timerCheckBuffering = setTimeout(md_checkBuffering, 500);
		}
	}
}
function md_getBufferedAhead () {
	var getBuffered = function (buffered, time) {
		for (var i = 0; i < buffered.length && buffered.start(i) <= time; i++);
		return Math.abs(i == 0? 0 : buffered.end(i-1));
	}
	if (!ct_sources) return 0;
	var buffered = ct_totalTime;
	if (ct_sources.video) buffered = Math.min (buffered, getBuffered(videoMedia.buffered, ct_curTime));
	if (ct_sources.audio) buffered = Math.min (buffered, getBuffered(audioMedia.buffered, ct_curTime));
	return buffered - ct_curTime;
}
function md_getBufferedMax () {
	var getBuffered = function (buffered) {
		return buffered.length == 0? 0 : buffered.end(buffered.length-1);
	}
	if (!ct_sources) return 0;
	var buffered = ct_totalTime;
	if (ct_sources.video) buffered = Math.min (buffered, getBuffered(videoMedia.buffered));
	if (ct_sources.audio) buffered = Math.min (buffered, getBuffered(audioMedia.buffered));
	return buffered;
}
function md_forceStartMedia() {
	if (!ct_sources) return;
	if (md_attemptPlayStarted) return;
	// Setup (just to make sure)
	md_updateVolume();
	var time = ct_curTime;
	videoMedia.currentTime = ct_curTime;
	audioMedia.currentTime = ct_curTime;
	// Attempt to start playing
	md_attemptPlayStarted = true;
	var waitForOther = (ct_sources.video != false) && (ct_sources.audio != false);
	var attemptError, attemptAborted;
	// Note: Timeout usually means it doesn't have an error and it already started playing - the promise just concludes late (sometimes up to a second too late)
	// Any attempts to restart usually are bad - usually audio (and video) started playing already, video a bit delayed, so just sync as normal and prevent audio jumps
	var timeout = false;
	var attemptTimeout = setTimeout (function() {
		console.warn("--- Attempt timed out!");
		timeout = true; // Try again
		videoMedia.pause();
		audioMedia.pause();
	}, 500);
	var attemptFinally = function() {
		if (timeout) {
			ct_curTime = time;
			if (!md_attemptPause)
				setTimeout(md_checkStartMedia, 500);
			md_attemptPause = false;
			md_attemptPlayStarted = false;
			return;
		} // Leftover promise call after timeout
		clearTimeout(attemptTimeout);
		md_attemptPlayStarted = false;
		if (md_attemptPause) {
			md_pause();
			md_attemptPause = false;
			return;
		}
		if (attemptError) {
			ct_paused = true;
			md_pause();
			if (attemptError.name == "NotAllowedError") {
				console.warn("--- Automatic playback rejected!");
				attemptAborted = true;
				ct_mediaReady();
			} else if (!attemptError instanceof DOMException) {
				console.error("--- Failed to start media playback!");
				ct_mediaError(attemptError);
				setTimeout(md_checkStartMedia, 500);
			} else if (!attemptAborted) {
				setTimeout(md_checkStartMedia, 500);
			}
		} else {
			console.log("--- MD: Started media playback!");
			md_assureSync();
			ct_mediaReady();
		}
	}
	var attemptPlay = function(media) {
		media.play().then(_ => {
			console.info("--- MD: Started " + media.tagName + " stream!");
			if (waitForOther) waitForOther = false;
			else attemptFinally();
		}).catch(error => {
			console.warn("--- Failed to start " + media.tagName + " stream!");
			attemptError = error;
			if (waitForOther && attemptError.name != "NotAllowedError") waitForOther = false;
			else attemptFinally();
		});
	};
	// Attempt to start playing
	if (ct_sources.video) attemptPlay(videoMedia);
	if (ct_sources.audio) attemptPlay(audioMedia);
}
function md_assureBuffer () {
	clearTimeout(md_timerCheckBuffering);
	bufferedAhead = md_getBufferedAhead();
	md_timerCheckBuffering = setTimeout(function () {
		if (ct_state == State.Started && !ct_flags.buffering) {
			//console.log(bufferedAhead*1000 + "ms in the future: " + md_getBufferedAhead()*1000);
			md_checkBuffering();
		}
	}, (bufferedAhead-1)*1000);
}
function md_assureSync () {
	clearTimeout(md_timerSyncMedia);
	if (ct_sources && ct_sources.video && ct_sources.audio && !md_attemptPlayStarted) {
		var syncTimes = function (syncSignificance) {
			if (ct_sources && ct_sources.video && ct_sources.audio) {
				if (ct_isPlaying()) {
					var timeDiff = audioMedia.currentTime-videoMedia.currentTime;
					var timeDiffLabel = (timeDiff*1000-(timeDiff*1000)%1) + "ms";
					if (Math.abs(timeDiff) > syncSignificance) {
						videoMedia.currentTime = audioMedia.currentTime + Math.max(0, Math.min(0.1, Math.abs(timeDiff)/2));
						console.info("MD: Sync Error: " + timeDiffLabel + " - Fixing!");
						md_checkBuffering(); // Incase video was hidden (diff multiple seconds), video might not have been buffered
						if (!ct_flags.buffering) md_timerSyncMedia = setTimeout(() => syncTimes(syncSignificance + 0.05), 1000*(syncSignificance + 0.1));
					} else console.info("MD: Sync Error: " + timeDiffLabel + "!");
				} else {
					videoMedia.currentTime = ct_curTime;
					audioMedia.currentTime = ct_curTime;
				}
			}
		}
		md_timerSyncMedia = setTimeout(() => syncTimes(0.05), 100);
	}
}

//endregion


/* -------------------------------------------------------------------------------------------------------------- */
/* ----------------- UTILITY FUNCTIONS -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------------------------------------------- */

//region


/* -------------------- */
/* ---- REQUESTS ------ */
/* -------------------- */

// Just a wrapper to facilitate paged requests
function PAGED_REQUEST (pagedContent, method, url, authenticate, callback, supressLoader) {
	if (!pagedContent || pagedContent.loading || pagedContent.aborted)
		return;
	// Setup UI for paged content
	pagedContent.loading = true;
	if (!supressLoader) ui_addLoadingIndicator(pagedContent.container);
	// Perform request
	WREQ(method, ct_pref.corsAPIHost + url, function (response) {
		if (!supressLoader) ui_removeLoadingIndicator(pagedContent.container);
		if (pagedContent.aborted) return;
		if (callback(response)) { // Continue
			pagedContent.loading = false;
			if (pagedContent.autoTrigger && pagedContent.triggerDistance == undefined)
				ct_checkPagedContent();
		} else // End reached, remove
			ct_removePagedContent(pagedContent.id);
	},
	authenticate? yt_getRequestHeadersYoutube("application/x-www-form-urlencoded") : yt_getRequestHeadersBrowser(false),
	authenticate? "session_token=" + encodeURIComponent(yt_page.secrets.xsrfToken) : "",
	);
}
function WGET_CORS(url, callback, headers, body) {
	WREQ("GET", ct_pref.corsAPIHost + url, function (response, xhttp) { 
		if (ct_isAdvancedCorsHost == undefined) {
			try { ct_isAdvancedCorsHost = xhttp.getAllResponseHeaders().includes("x-set-cookies"); }
			catch (e) { ct_isAdvancedCorsHost = false; }
		}
		callback (response, xhttp); 
	}, headers, body);
}
function WGET(url, callback, headers, body) {
	WREQ("GET", url, callback, headers, body);
}
function WPOST_CORS(url, callback, headers, body) {
	WREQ("POST", ct_pref.corsAPIHost + url, callback, headers, body);
}
function WPOST(url, callback, headers, body) {
	WREQ("POST", url, callback, headers, body);
}
function WREQ(method, url, callback, headers, body, retries) {
	var xhttp = new XMLHttpRequest();
	if (retries == undefined) retries = 2;
	xhttp.onreadystatechange = function() {
		if (xhttp.readyState == 4 && xhttp.status == 200)
		{ callback(xhttp.responseText, xhttp); }
		else if (xhttp.readyState == 4 && xhttp.status == 0) {
			console.warn("Request Failed:", url); 
			if (retries > 0) WREQ(method, url, callback, headers, body, retries-1);
		}
	}
	xhttp.timeout = 8000;
	xhttp.open(method, url, true);
	if (headers) headers.forEach(h => xhttp.setRequestHeader(h.header, h.value));
	xhttp.send(body);
}

/* -------------------- */
/* ---- EXPERIMENTAL -- */
/* -------------------- */

function ex_interpretMetadata() {
	var char = "-\\w" // And now all Japanese and Chinese chars...
		+ "\\u3041-\\u3096\\u309D-\\u309F\\uD82C\\uDC01\\uD83C\\uDE00\\u30A1-\\u30FA\\u30FD-\\u30FF\\u31F0-\\u31FF\\u32D0-\\u32FE\\u3300-\\u3357\\uFF66-\\uFF6F\\uFF71-\\uFF9D\\uD82C\\uDC00"
		+ "\\u2E80-\\u2E99\\u2E9B-\\u2EF3\\u2F00-\\u2FD5\\u3005\\u3007\\u3021-\\u3029\\u3038-\\u303B\\u3400-\\u4DB5\\u4E00-\\u9FD5\\uF900-\\uFA6D\\uFA70-\\uFAD9\\uD840-\\uD868\\uD86A-\\uD86C" 
		+ "\\uD86F-\\uD872\\uDC00-\\uDFFF\\uD869\\uDC00-\\uDED6\\uDF00-\\uDFFF\\uD86D\\uDC00-\\uDF34\\uDF40-\\uDFFF\\uD86E\\uDC00-\\uDC1D\\uDC20-\\uDFFF\\uD873\\uDC00-\\uDEA1\\uD87E\\uDC00-\\uDE1D"
		+ ""; // Anything that could be part of a name
	var oBracket = "\\u0028\\u005B\\u007B\\u00AB\\u2018\\u2019\\u201C\\u201D\\u27E6\\u3008\\u300C\\u300E\\u3010\\u3016\\uFF08\\uFF3B\\uFF5B\\uFF5F\\uFF62";
	var cBracket = "\\u0029\\u005D\\u007D\\u00BB\\u2018\\u2019\\u201C\\u201D\\u27E7\\u3009\\u300D\\u300F\\u3011\\u3017\\uFF09\\uFF3D\\uFF5D\\uFF60\\uFF63";
	var connector = "/\\&,+|\\u30FB";

	var label = "\\(?([" + char + oBracket + cBracket + "[^\\S\\r\\n]]+?)\\)?";
	//var label = "([\\w\\s]+?)";
	var secSep = "[^\\S\\r\\n]*(?:[" + connector + "]|and)[^\\S\\r\\n]*";
	var primSep = "[^\\S\\r\\n]*(?:by[^\\S\\r\\n]*|from[^\\S\\r\\n]*|[^" + char + oBracket + cBracket + connector + "[^\\S\\r\\n]][^\\S\\r\\n]*)+[^\\S\\r\\n]*";

	var secSepRE = new RegExp(secSep, "gi");
	var primSepRE = new RegExp(primSep, "gi");
	var creditRE = new RegExp("\^(?:" + label + secSep + ")*" + label + primSep + "()(?:" + label + secSep + ")*" + label + "\$", "gim");
	
	var match = yt_video.meta.description.match(creditRE);
	yt_video.meta.credits = [];
	if (match) {
		try {
			match.forEach(m => {
				var data = m.split(primSepRE).filter(d => d);
				var roles = data[0].split(secSepRE).filter(d => d).map(s => s.trim());
				var names = data[1].split(secSepRE).filter(d => d).map(s => s.trim());
				roles.forEach(r => yt_video.meta.credits.push({ name: r, data: names }));
			});
		} catch(e) { console.warn("Experimental metadata detection failed!"); }
	}
}


/* -------------------- */
/* ---- HTML BIN ------ */
/* -------------------- */

function ht_getVideoPlaceholder (id, prim, sec) {
	container.insertAdjacentHTML ("beforeEnd",
		'<div class="liElement" videoID="' + id + '">' + 
			'<div class="liDetail selectable">' + 
				'<span class="twoline liPrimary">' + prim + '</span>' +
				'<span class="oneline liSecondary">' + sec + '</span>' +
			'</div>' + 
		'</div>');
	return container.lastElementChild;
}
function ht_fillVideoPlaceholder (element, index, id, length) {
	element.insertAdjacentHTML ("afterBegin",
		'<a class="overlayLink" navigation="v=' + id + '" href="' + ct_getNavLink("v=" + id) + '"></a>' + 
		'<div class="liIndex">' + index + '</div>' + 
		'<div class="liThumbnail">' + 
			'<img class="liThumbnailImg" src="' + HOST_YT_IMG +  id + '/default.jpg">' +
			'<span class="liThumbnailInfo"> ' +  length + ' </span>' +
		'</div>');
	return element;
}
function ht_clearVideoPlaceholder (element) {
	if (element.firstElementChild.className == "overlayLink")
		element.removeChild(element.firstElementChild);
	if (element.firstElementChild.className == "liIndex")
		element.removeChild(element.firstElementChild);
	if (element.firstElementChild.className == "liThumbnail")
		element.removeChild(element.firstElementChild);
	return element;
}
function ht_appendVideoElement (container, index, id, length, prim, sec, tert) {
	container.insertAdjacentHTML ("beforeEnd",
		'<div class="liElement" videoID="' + id + '">' + 
			'<a class="overlayLink" navigation="v=' + id + '" href="' + ct_getNavLink("v=" + id) + '"></a>' + 
(index == undefined?	'' :
			'<div class="liIndex">' + index + '</div>') + 
			'<div class="liThumbnail">' + 
				'<img class="liThumbnailImg" src="' + HOST_YT_IMG +  id + '/default.jpg">' +
				'<span class="liThumbnailInfo"> ' +  length + ' </span>' +
			'</div>' + 
			'<div class="liDetail selectable">' + 
				'<span class="twoline liPrimary">' + prim + '</span>' +
				'<span class="oneline liSecondary">' + sec + '</span>' +
(tert == undefined?	'' :
				'<span class="oneline liTertiary">' + tert + '</span>') +
			'</div>' + 
		'</div>');
	return container.lastElementChild;
}
function ht_appendPlaylistElement (container, id, thumbID, prim, sec, tert) {
	container.insertAdjacentHTML ("beforeEnd",
		'<div class="liElement">' + 
			'<a class="overlayLink" navigation="list=' + id + '" href="' + ct_getNavLink("list=" + id) + '"></a>' + 
			'<div class="liThumbnail">' + 
				'<img class="liThumbnailImg" src="' + HOST_YT_IMG +  thumbID + '/default.jpg">' +
			'</div>' + 
			'<div class="liDetail selectable">' + 
				'<span class="twoline liPrimary">' + prim + '</span>' +
				'<span class="oneline liSecondary">' + sec + '</span>' +
				'<span class="oneline liTertiary">' + tert + '</span>' +
			'</div>' + 
//			'<button class="liAction" id="playlistContextAction">' + 
//				'<svg viewBox="6 6 36 36" class="icon"><use href="#svg_vdots"/></svg>' +
//			'</button>' + 
		'</div>');
	return container.lastElementChild;
}
function ht_appendTabHeader (container, label, id) {
	container.insertAdjacentHTML ("beforeEnd",
		'<button class="tabHeader" id="h-' + id + '" navigation="tab=' + id +  '">' + label + '</button>');
	return container.lastElementChild;
}
function ht_appendCollapsedVideoSection (container, label, id) {
	container.insertAdjacentHTML ("beforeEnd",
		'<div class="videoSection">' +
			'<button class="videoSectionHeader" navigation="tab=' + id +  '">' + label + '</button>' +
			'<div class="videoList" id="c-' + id + '"></div>' +
		'</div>');
	return container.lastElementChild;
}
function ht_appendFullVideoSection (container, label, id) {
	container.insertAdjacentHTML ("beforeEnd",
		'<div class="videoSection">' +
			//'<div class="videoSectionLabel">' + label + '</div>' +
			'<div class="videoList" id="f-' + id + '"></div>' +
		'</div>');
	return container.lastElementChild;
}
function ht_appendChannelLinkElement (container, link, icon, title) {
	container.insertAdjacentHTML ("beforeEnd",
		'<div class="chLink">' +
			'<a href="' + link + '"></a>' +
			'<img src="' + icon + '">' +
			'<span>' + title + '</span>' +
		'</div>');
	return container.lastElementChild;
}
function ht_appendCommentElement (container, commentID, authorNav, authorIMG, authorName, dateText, commentText, likes, replies) {
	var repliesContainer = "";
	if (replies) {
		var replyText = (replies > 1? replies + ' replies' : '1 reply');
		repliesContainer =
		'<div class="cmReplies collapsable" collapsed>' +
			'<button class="cmToggleReplies collapser contentLoader" load-content="onLoadReplies(container, &quot;' + commentID + '&quot;)"' + 
						'more-text="Show ' + replyText + '" less-text="Hide ' + replyText + '">Show ' + replyText + '</button>' +
			'<div class="contentContainer collapsableContainer">' +
				'<button class="cmToggleReplies contentLoader" load-content="onLoadReplies(container, &quot;' + commentID + '&quot;)" style="display: none;">Load more replies</button>' +
			'</div>' +
		'</div>';
	}
	container.insertAdjacentHTML ("beforeEnd",
		'<div class="cmContainer">' + 
			'<button class="contextAction script dropdown left down">' +
				'<svg viewBox="6 6 36 36"><use href="#svg_vdots"/></svg>' +
				'<div class="dropdownContent">' +
					'<a tabindex="0" href="' + yt_url + '&lc=' + commentID + '" target="_blank">Comment on YouTube</a>' +
				'</div>' +
			'</button>' +
			'<div class="cmProfileColumn">' +
				'<a class="overlayLink" navigation="' + authorNav + '" href="' + ct_getNavLink(authorNav) + '"></a>' + 
				'<img class="cmProfileImg profileImg" src="' + authorIMG + '">' +
			'</div>' +
			'<div class="cmContentColumn selectable">' +
				'<a navigation="' + authorNav + '" href="' + ct_getNavLink(authorNav) + '">' + 
					'<span class="cmAuthorName">' + authorName + '</span>' +
				'</a>' +
				'<span class="cmPostedDate">' + dateText + '</span>' +
				'<div class="cmBody collapsable">' +
					'<div class="textContent collapsableText">' + commentText + '</div>' +
					'<button class="cmCollapser collapser" more-text="Show More" less-text="Show Less"></button>' +
				'</div>' +
				'<div class="cmActionBar actionBar noselect">' +
					'<button class="barAction"><svg viewBox="6 6 36 36"><use href="#svg_like"/></svg> ' + (likes? likes : "") + '</button>' +
					'<button class="barAction"><svg viewBox="6 6 36 36"><use href="#svg_dislike"/></svg></button>' +
					'<button class="barAction"><span>Reply</span></button>' +
				'</div>' +
		repliesContainer +
			'</div>' +
		'</div>');
	ui_setupCollapsableText(container.lastElementChild);
	return container.lastElementChild;
}

//endregion


/* -------------------------------------------------------------------------------------------------------------- */
/* ----------------- DATA --------------------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------------------------------------------- */

//region

var ITAGS = {
// LEGACY Streams
  5: { x:  426, y:  240, hdr: false, fps: 30, ss3D: false, hls: false, aBR: 64  }, 
  6: { x:  480, y:  270, hdr: false, fps: 30, ss3D: false, hls: false, aBR: 64  }, 
 13: { x:  256, y:  144, hdr: false, fps: 30, ss3D: false, hls: false 		   }, 
 17: { x:  256, y:  144, hdr: false, fps: 30, ss3D: false, hls: false, aBR: 24  }, 
 18: { x:  640, y:  360, hdr: false, fps: 30, ss3D: false, hls: false, aBR: 96  }, 
 22: { x: 1280, y:  720, hdr: false, fps: 30, ss3D: false, hls: false, aBR: 192 }, 
 34: { x:  640, y:  360, hdr: false, fps: 30, ss3D: false, hls: false, aBR: 128 }, 
 35: { x:  854, y:  480, hdr: false, fps: 30, ss3D: false, hls: false, aBR: 128 }, 
 36: { x:  426, y:  240, hdr: false, fps: 30, ss3D: false, hls: false		   }, 
 37: { x: 1920, y: 1080, hdr: false, fps: 30, ss3D: false, hls: false, aBR: 192 }, 
 38: { x: 4096, y: 3072, hdr: false, fps: 30, ss3D: false, hls: false, aBR: 192 }, 
 43: { x:  640, y:  360, hdr: false, fps: 30, ss3D: false, hls: false, aBR: 128 }, 
 44: { x:  854, y:  480, hdr: false, fps: 30, ss3D: false, hls: false, aBR: 128 }, 
 45: { x: 1280, y:  720, hdr: false, fps: 30, ss3D: false, hls: false, aBR: 192 }, 
 46: { x: 1920, y: 1080, hdr: false, fps: 30, ss3D: false, hls: false, aBR: 192 }, 
 59: { x:  854, y:  480, hdr: false, fps: 30, ss3D: false, hls: false, aBR: 128 }, 
 78: { x:  854, y:  480, hdr: false, fps: 30, ss3D: false, hls: false, aBR: 128 }, 
// Special: StereoScopic3D and Apple HTTP live streaming (HLS)
 82: { x:  640, y:  360, hdr: false, fps: 30, ss3D:  true, hls: false, aBR: 128 }, 
 83: { x:  854, y:  480, hdr: false, fps: 30, ss3D:  true, hls: false, aBR: 128 }, 
 84: { x: 1280, y:  720, hdr: false, fps: 30, ss3D:  true, hls: false, aBR: 192 }, 
 85: { x: 1920, y: 1080, hdr: false, fps: 30, ss3D:  true, hls: false, aBR: 192 }, 
 91: { x:  256, y:  144, hdr: false, fps: 30, ss3D: false, hls:  true, aBR: 48  }, 
 92: { x:  426, y:  240, hdr: false, fps: 30, ss3D: false, hls:  true, aBR: 48  }, 
 93: { x:  640, y:  360, hdr: false, fps: 30, ss3D: false, hls:  true, aBR: 128 }, 
 94: { x:  854, y:  480, hdr: false, fps: 30, ss3D: false, hls:  true, aBR: 128 }, 
 95: { x: 1280, y:  720, hdr: false, fps: 30, ss3D: false, hls:  true, aBR: 256 }, 
 96: { x: 1920, y: 1080, hdr: false, fps: 30, ss3D: false, hls:  true, aBR: 256 }, 
100: { x:  640, y:  360, hdr: false, fps: 30, ss3D:  true, hls: false, aBR: 128 }, 
101: { x:  854, y:  480, hdr: false, fps: 30, ss3D:  true, hls: false, aBR: 192 }, 
102: { x: 1280, y:  720, hdr: false, fps: 30, ss3D:  true, hls: false, aBR: 192 }, 
132: { x:  426, y:  240, hdr: false, fps: 30, ss3D: false, hls:  true, aBR: 48  }, 
151: { x: 1280, y:  720, hdr: false, fps: 30, ss3D: false, hls:  true, aBR: 24  }, 

// DASH Video
133: { x:  426, y:  240, hdr: false, fps: 30, ss3D: false, hls: false },
134: { x:  640, y:  360, hdr: false, fps: 30, ss3D: false, hls: false },
135: { x:  854, y:  480, hdr: false, fps: 30, ss3D: false, hls: false },
136: { x: 1280, y:  720, hdr: false, fps: 30, ss3D: false, hls: false },
137: { x: 1920, y: 1080, hdr: false, fps: 30, ss3D: false, hls: false },
138: { x: 4096, y: 2160, hdr: false, fps: 30, ss3D: false, hls: false },
160: { x:  256, y:  144, hdr: false, fps: 30, ss3D: false, hls: false },
167: { x:  640, y:  360, hdr: false, fps: 30, ss3D: false, hls: false },
168: { x:  854, y:  480, hdr: false, fps: 30, ss3D: false, hls: false },
169: { x: 1280, y:  720, hdr: false, fps: 30, ss3D: false, hls: false },
170: { x: 1920, y: 1080, hdr: false, fps: 30, ss3D: false, hls: false },
212: { x:  854, y:  480, hdr: false, fps: 30, ss3D: false, hls: false },
218: { x:  854, y:  480, hdr: false, fps: 30, ss3D: false, hls: false },
219: { x:  854, y:  480, hdr: false, fps: 30, ss3D: false, hls: false },
242: { x:  426, y:  240, hdr: false, fps: 30, ss3D: false, hls: false },
243: { x:  640, y:  360, hdr: false, fps: 30, ss3D: false, hls: false },
244: { x:  854, y:  480, hdr: false, fps: 30, ss3D: false, hls: false },
245: { x:  854, y:  480, hdr: false, fps: 30, ss3D: false, hls: false },
246: { x:  854, y:  480, hdr: false, fps: 30, ss3D: false, hls: false },
247: { x: 1280, y:  720, hdr: false, fps: 30, ss3D: false, hls: false },
248: { x: 1920, y: 1080, hdr: false, fps: 30, ss3D: false, hls: false },
264: { x: 2560, y: 1440, hdr: false, fps: 30, ss3D: false, hls: false },
266: { x: 4096, y: 2160, hdr: false, fps: 30, ss3D: false, hls: false },
271: { x: 2560, y: 1440, hdr: false, fps: 30, ss3D: false, hls: false },
272: { x: 4096, y: 2160, hdr: false, fps: 30, ss3D: false, hls: false },
278: { x:  256, y:  144, hdr: false, fps: 30, ss3D: false, hls: false },
// 60fps
298: { x: 1280, y:  720, hdr: false, fps: 60, ss3D: false, hls: false },
299: { x: 1920, y: 1080, hdr: false, fps: 60, ss3D: false, hls: false },
302: { x: 1280, y:  720, hdr: false, fps: 60, ss3D: false, hls: false },
303: { x: 1920, y: 1080, hdr: false, fps: 60, ss3D: false, hls: false },
308: { x: 2560, y: 1440, hdr: false, fps: 60, ss3D: false, hls: false },
313: { x: 4096, y: 2160, hdr: false, fps: 30, ss3D: false, hls: false },
315: { x: 4096, y: 2160, hdr: false, fps: 60, ss3D: false, hls: false },
// Special: 60fps + HDR
330: { x:  256, y:  144, hdr:  true, fps: 60, ss3D: false, hls: false },
331: { x:  426, y:  240, hdr:  true, fps: 60, ss3D: false, hls: false },
332: { x:  640, y:  360, hdr:  true, fps: 60, ss3D: false, hls: false },
333: { x:  854, y:  480, hdr:  true, fps: 60, ss3D: false, hls: false },
334: { x: 1280, y:  720, hdr:  true, fps: 60, ss3D: false, hls: false },
335: { x: 1920, y: 1080, hdr:  true, fps: 60, ss3D: false, hls: false },
336: { x: 2560, y: 1440, hdr:  true, fps: 60, ss3D: false, hls: false },
337: { x: 4096, y: 2160, hdr:  true, fps: 60, ss3D: false, hls: false },

// DASH Audio
139: { aBR: 48,    },
140: { aBR: 128,   },
141: { aBR: 256,   },
171: { aBR: 128,   },
172: { aBR: 256,   },
249: { aBR: 50,    },
250: { aBR: 70,    },
251: { aBR: 160,   },
256: { },
258: { },
325: { },
328: { },

// Curious unknown formats
394: { x:  256,  y:  144, hdr:  false, fps: 30, ss3D: false, hls: false },
395: { x:  426,  y:  240, hdr:  false, fps: 30, ss3D: false, hls: false },
396: { x:  640,  y:  360, hdr:  false, fps: 30, ss3D: false, hls: false },
397: { x:  854,  y:  480, hdr:  false, fps: 30, ss3D: false, hls: false },
398: { x: 1280,  y:  720, hdr:  false, fps: 30, ss3D: false, hls: false },
399: { x: 1920,  y: 1080, hdr:  false, fps: 30, ss3D: false, hls: false },
}

var CATEGORIES = {
1	: "Film & Animation",
2	: "Autos & Vehicles",
10	: "Music",
15	: "Pets & Animals",
17	: "Sports",
18	: "Short Movies",
19	: "Travel & Events",
20	: "Gaming",
21	: "Videoblogging",
22	: "People & Blogs",
23	: "Comedy",
24	: "Entertainment",
25	: "News & Politics",
26	: "Howto & Style",
27	: "Education",
28	: "Science & Technology",
29	: "Nonprofits & Activism",
}

var AUTOCATEGORIES = {
30	: "Movies",
31	: "Anime / Animation",
32	: "Action / Adventure",
33	: "Classics",
34	: "Comedy",
35	: "Documentary",
36	: "Drama",
37	: "Family",
38	: "Foreign",
39	: "Horror",
40	: "Sci-Fi / Fantasy",
41	: "Thriller",
42	: "Shorts",
43	: "Shows",
44	: "Trailers",
}

//endregion

ct_init();
