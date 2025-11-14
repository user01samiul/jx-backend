/**
 * Server Injector
 * Overrides the game's server URLs IMMEDIATELY to use our local servers:
 * - Game commands: Server.php bridge
 * - ISoftBet XML: Our ISoftBet proxy endpoint
 */

(function() {
    console.log('[SERVER_INJECTOR] Initializing IMMEDIATELY...');

    // IMMEDIATELY override XMLHttpRequest - don't wait for anything
    var originalOpen = XMLHttpRequest.prototype.open;
    var originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
        // Store original URL
        this._originalUrl = url;
        var originalUrl = url;

        // Intercept ISoftBet GPM XML requests FIRST (most important!)
        if (typeof url === 'string' && url.includes('gpm.isoftbet.com')) {
            // Replace gpm.isoftbet.com with our local proxy
            url = url.replace('https://gpm.isoftbet.com', 'https://backend.jackpotx.net');
            url = url.replace('http://gpm.isoftbet.com', 'https://backend.jackpotx.net');
            console.log('[SERVER_INJECTOR] ✅ Redirecting ISB XML request:', originalUrl, '->', url);
        }
        // Intercept game server POST requests
        else if (method.toUpperCase() === 'POST' &&
            (url.includes('Server.php') || url.includes('/php/') || (!url.startsWith('http') && !url.startsWith('//')))) {

            // Wait for GAME_CONFIG if needed
            if (window.GAME_CONFIG && window.GAME_CONFIG.serverUrl) {
                url = window.GAME_CONFIG.serverUrl;
                console.log('[SERVER_INJECTOR] ✅ Redirecting game server request to:', url);
            } else {
                // Fallback: construct URL from current location
                url = 'Server.php' + window.location.search;
                console.log('[SERVER_INJECTOR] ⚠️  Using fallback server URL:', url);
            }
        }

        // Call original open with modified URL
        return originalOpen.call(this, method, url, async, user, password);
    };

    console.log('[SERVER_INJECTOR] ✅ XMLHttpRequest interceptor installed IMMEDIATELY');

    // Also override fetch IMMEDIATELY
    if (window.fetch) {
        var originalFetch = window.fetch;
        window.fetch = function(url, options) {
            var originalUrl = url;

            // Intercept ISoftBet GPM XML requests
            if (typeof url === 'string' && url.includes('gpm.isoftbet.com')) {
                url = url.replace('https://gpm.isoftbet.com', 'https://backend.jackpotx.net');
                url = url.replace('http://gpm.isoftbet.com', 'https://backend.jackpotx.net');
                console.log('[SERVER_INJECTOR] ✅ Redirecting ISB XML fetch:', originalUrl, '->', url);
            }
            // Intercept game server POST requests
            else if (options && options.method && options.method.toUpperCase() === 'POST' &&
                (typeof url === 'string') &&
                (url.includes('Server.php') || url.includes('/php/') || (!url.startsWith('http') && !url.startsWith('//')))) {

                if (window.GAME_CONFIG && window.GAME_CONFIG.serverUrl) {
                    url = window.GAME_CONFIG.serverUrl;
                } else {
                    url = 'Server.php' + window.location.search;
                }
                console.log('[SERVER_INJECTOR] ✅ Redirecting fetch request to:', url);
            }

            return originalFetch.call(this, url, options);
        };
        console.log('[SERVER_INJECTOR] ✅ Fetch interceptor installed IMMEDIATELY');
    }

    console.log('[SERVER_INJECTOR] ✨ All interceptors active and ready!');

})();
