var VERSION = 3;
var APP_CACHE = "flagplayer-cache-1";
var IMG_CACHE = "flagplayer-thumbs";
var MEDIA_CACHE = "flagplayer-media";
var VIRT_CACHE = "https://flagplayer.seneral.dev/caches/vd-"; // Virtual adress used for caching. Doesn't actually exist, but needs to be https
var BASE = location.href.substring(0, location.href.lastIndexOf("/"));
var reMainPage = new RegExp(BASE.replace("/", "\\/") + "(|\\/|\\/index\\.html)(\\?.*)?$")
var database;
var dbLoading = false;
var dbPromises = [];

// Database access - minimal, no error handling, since it's only readonly and assumes a working database management on the main site
function db_access() {
	return new Promise(function(accept, reject) {
		if (!indexedDB) reject();
		else if (database) accept(database);
		else {
			dbPromises.push(accept);
			if (dbLoading) return;
			dbLoading = true;
			// Open
			var request = indexedDB.open("ContentDatabase");
			request.onerror = reject;
			request.onsuccess = function(e) { // Ready
				database = e.target.result;
				database.onerror = reject;
				database.onclose = () => database = undefined;
				dbLoading = false;
				dbPromises.forEach((acc) => acc(database));
				dbPromises = [];
			};
		}
	});
}

function db_hasVideo(videoID) {
	return new Promise(function(accept, reject) {
		db_access().then(function(db) {
			var request = db.transaction("videos", "readonly").objectStore("videos").get(videoID);
			request.onerror = reject;
			request.onsuccess = function(e) {
				if (e.target.result) accept();
				else reject();
			};
		}).catch(reject);
	});
}

self.addEventListener('install', function(event) {
	event.waitUntil(
		caches.open(APP_CACHE)
		.then(function(cache) {
			return cache.addAll([
				"./style.css",
				"./index.html",
				"./page.js"
			]);
		})
	);
});
self.addEventListener('activate', function(event) {
	event.waitUntil(
		// Delete unused stuff (most likely not whole caches, but keys in caches)
		caches.keys().then(keys => Promise.all(
			keys.map(key => {
				if (key.startsWith("flagplayer-cache-") && key != APP_CACHE)
					return caches.delete(key);
			})
		))
	);
});

self.addEventListener('message', function(event) {
	if (event.data.action === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', function(event) {
	var url = event.request.url;
	if (url.match(reMainPage)) { // Always use cached app html
		event.respondWith(caches.match("./index.html"));
	}
	else if (url.includes(VIRT_CACHE)) { // Try to read from the media cache
		var pos = Number(/^bytes\=(\d+)\-$/g.exec(event.request.headers.get('range'))[1]);
		event.respondWith(
			caches.open("flagplayer-media")
			.then(function(cache) {
				return cache.match(url);
			}).then(function(cacheResponse) {
				if (cacheResponse)
					return cacheResponse;
				return fetch(event.request).then(function(fetchResponse) {
					return fetchResponse;
				});
			}).then(function(response) {
				return response.arrayBuffer()
				.then(function(byteData) {
					return new Response(byteData.slice(pos), {
						status: 206,
						statusText: 'Partial Content',
						headers: [
							['Content-Type', response.headers.get("content-type") ],
							['Content-Range', 'bytes ' + pos + '-' +
								(byteData.byteLength - 1) + '/' + byteData.byteLength
							]
						]
					});
				})
			})
		);
	}
	else {
		event.respondWith(
			caches.match(event.request)
			.then(function(response) {
				// From cache
				if (response) return response;
				// Fetch from net
				return fetch(event.request).then(function(response) {
					if (!response || (response.status !== 200 && response.status !== 0) || response.type == 'error')
						return response;
					// Cache if desired
					if (url.startsWith(BASE + "/favicon")) {
						var cacheResponse = response.clone();
						caches.open(APP_CACHE).then((cache) => cache.put(event.request, cacheResponse));
					}
					else {
						var thumb = url.match(/https:\/\/i.ytimg.com\/vi\/([a-zA-Z0-9_-]{11})\/default\.jpg/);
						if (thumb) {
							var cacheResponse = response.clone();
							db_hasVideo(thumb[1]).then(function() { // Video stored, cache thumbnail
								caches.open(IMG_CACHE).then((cache) => cache.put(event.request, cacheResponse));
							}).catch(function() {});
						}
					}
					return response;
				}).catch(function(error) {});
			})
		);
	}
});