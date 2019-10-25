var checkRateLimit = require('./lib/rate-limit')('50 5');

originWhitelist = [ 'https://flagplayer.seneral.dev', 'https://seneral.dev' ];
if (process.env.HEROKU_LOCAL) // Only specified in local .env file
    originWhitelist.push('null'); // Allow local copies to access local heroku server

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
}).listen(process.env.PORT, function() {
  console.log('Running CORS YT on ' + process.env.PORT);
});
