// Listen on a specific host via the HOST environment variable
var host = process.env.HOST || 'localhost';
// Listen on a specific port via the PORT environment variable
var port = process.env.PORT || 26060;

if (process.env.IS_PUBLIC)
{ // Set on official heroku host
    originWhitelist = [ 'https://flagplayer.seneral.dev', 'https://www.seneral.dev' ];
    checkRateLimit = require('./lib/rate-limit')('5000 5');
}
else
{ // Default when hosting locally
    originWhitelist = []; // Allow local copies to access local heroku server
    checkRateLimit = undefined;
}

var cors_proxy = require('./lib/cors-anywhere');
cors_proxy.createServer({
    passCookies: true,
    copyOrigin: true,
    setMode: true,
    checkRateLimit: checkRateLimit,
    originWhitelist: originWhitelist,
    removeHeaders: [
        'connection',
        'host',
        'origin',
        // Strip Heroku-specific headers
        'x-heroku-queue-wait-time',
        'x-heroku-queue-depth',
        'x-heroku-dynos-in-use',
        'x-request-start',

    ],
    setHeaders : {
    },
    httpProxyOptions: {
        xfwd: true,
    },
}).listen(port, function() {
  console.log('Running CORS YT on ' + host + ':' + port);
});
