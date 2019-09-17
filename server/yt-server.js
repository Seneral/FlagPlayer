// Listen on a specific host via the HOST environment variable
var host = process.env.HOST || '0.0.0.0';
// Listen on a specific port via the PORT environment variable
var port = process.env.PORT || 8080;

var cors_proxy = require('./lib/cors-anywhere');
cors_proxy.createServer({
    passCookies: true,
    copyOrigin: true,
    setMode: true,
    /*originWhitelist: [
        null,
    ],*/
    /*targetWhitelist: [
        "youtube.com",
    ],*/
    removeHeaders: [
        'connection',
        'host',
        'origin',
    ],
    setHeaders : {
    },
    httpProxyOptions: {
        xfwd: false,
    },
}).listen(port, host, function() {
  console.log('Running CORS Anywhere on ' + host + ':' + port);
});
