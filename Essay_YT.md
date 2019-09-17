# YouTube is Embarassingly bad
I have a slow, old, 2012 Tablet-PC. Or at least I think it is slow, I can barely browse YouTube with it without getting hung up, after all.\ 
But it wasn't always like that - this only got so bad after YouTubes new UI. \
Here's my rant on YouTube (or software in general) getting heavier and heavier - without any need to.\

## Disclaimer: YouTube's feats
Let's start off by acknowledging that YouTube has to support a wide variety of devices (in fact: all of them) in a single webpage, has to support tons of features (some of which most will never get to see) and that they probably intentionally increase complexity to scare parsers (which obviously barely works).\
For example, they need to support screen readers - you'll find that alot of the html code is hidden reader data, with tons of duplicated texts that most of us will never get to see.\

## How Heavy is YouTube really?
I'll use my crappy Tablet-PC as an example - mind you, I do have a proper PC, but YouTube should work on all devices. Here, I have caching enabled, so around half the request are instantaneous, and even without, my network is fast. The Table-PC is the only thing that is slow apart from YouTube.\
Even on that old thing, the video is playing since 6 seconds after load! So it can't be that bad, right?\
Well, let's look at the time to interactivity - here the point at which all content is loaded, I can scroll without waiting a second for it to react, and I can pause the video with less than 2 seconds delay. It is an astronomical 30 seconds.\
Even worse - video playback. It is true that it is playing since 6s after load - but what if I don't want it to play? Only here for comments? In a public location?\
I'll have to wait until 15-20seconds after start to at least have a HOPE to stop it from playing! And only after 30s reliably (I often find myself trying to pause, but it will immediately start playing again because it is so delayed and unresponsive).\
That is NOT good. Please, start playing only after the website is responsive - or make the website light enough that this is not noticeable. Your choice, but don't force playback on users still waiting to load.\
### Requested Scripts & HTML
3 Major HTML files 487.9KB (downloaded) 3.6MB (uncompressed)\
13 major javascript files 1.35MB (downloaded) 4.55MB (uncompressed)\
Not that these are all TEXT files - scripts and html that need to be parsed, executed, whatever. \
This is HUGE - most sites with plenty of images use way less data.\
Until the page becomes interactive, 2MB have been downloaded already (without caching, without videos and images).\
### Page bloat
I understand some features, like screen readers, require additional content to be plastered around, but what I don't understand is the horribly bloated HTML.\
Why have ten generic containers wrapped in and out when one suffices? It immensely slows down the website even after loading.\
Just take any video, scroll down, load maybe a few dozen pages of comments. Should be no big deal.\
But even my beafy (if old) main PC quickly starts to stutter scrolling down. And notice how each comments takes ages to be placed in the page, even though they are all loaded at once?\
Load up the DOM (document object model) in your favourite browser using 'Inspect' and you'll enjoy a slow experience while the browser struggles to present you what it has to cope with.\

## Fun Fact: How many comments can you load?
All you say? You just need to have patience to wait for YouTube slow load?\
Well, let's see. In my local version I manually loaded comments, without any slowdown at all - until I hit a wall. \
With every continuous comment load request, the URL (including certain required tokens) gets longer and longer - until it get's so long that browsers and web servers don't accept it anymore. I managed to get to 7640+ characters (equates to 660 out of 6600 comments) until I got a 400: Bad Request. Turns out that it was my Node.js proxy server limit, so I increased it and it seemed to work. But URLs are technically invalid after 2000 characters - how long does it take for a different intermediate party to say nay?
Double that, apparently. At 14654 bytes I got 413: Payload too large. Turns out: IT'S YOUTUBES SERVERS! Haha. At 1559 out of ~6600 comments. Apparently, they won't let us load more (provided you even managed to get that far with standard means - that alone requires inhuman patience).\
Of course, I had to test standard YouTube as well to verify. So an AutoScroller and just 25 minutes later (no joke, you could comfortably read all but the longest comments while they were slowly individually loaded) it turns out: After only 1319 comments (12890 character long URL) it stopped loading.\
#### This means: It is impossible to load more than ~1600 comments - is this censoring?
Just kidding, but yeah, it is a problem.\
But I will tell you: Down there, there are comments. Comments, waiting forever to be liked. There are some lucky ones that have a few likes, even dozens, but it looks grim, for they will be reached no longer.

## Bugs
There are bugs in every software - the more complex, the more bugs. Can't really blame engineers for struggling to fix and even regularily introducing new bugs in overly complicated software. What, YouTube is overly complicated? What a suprise. There have been many bugs, but here are two that continuously disturb playback (first one has been active for years): \
- Random Playlist playback sometimes get's stuck in a loop including only a handful of videos (of hundreds in the playlist). Need to reload to fix \
- Playlist playback get's stuck on deleted videos, next video needs to be manually loaded \