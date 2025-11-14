import axios from 'axios';
import { Request, Response } from 'express';
import crypto from 'crypto';
import { HttpsProxyAgent } from 'https-proxy-agent';
import zlib from 'zlib';
import { promisify } from 'util';
import { decompress as zstdDecompress } from '@mongodb-js/zstd';
// DISABLED: Rotating proxy service (free proxies blocked by Cloudflare)
// import { rotatingProxyService } from '../proxy/rotating-proxy.service';

const gunzipAsync = promisify(zlib.gunzip);
const inflateAsync = promisify(zlib.inflate);
const brotliDecompressAsync = promisify(zlib.brotliDecompress);

/**
 * Game Proxy Service
 *
 * This service acts as a reverse proxy for game iframes,
 * masking the player's real IP address with a configurable IP.
 *
 * Purpose: Bypass geo-restrictions imposed by game providers
 */

// Gibraltar IP as default (can be changed via environment variable)
const PROXY_IP = process.env.GAME_PROXY_IP || '104.255.128.2';

// Cache for proxy sessions (to avoid regenerating URLs)
const proxySessionCache = new Map<string, {
  originalUrl: string;
  createdAt: Date;
  userId: number;
  gameId: number;
}>();

// Clean up expired sessions every hour
setInterval(() => {
  const now = new Date();
  for (const [sessionId, session] of proxySessionCache.entries()) {
    const ageInHours = (now.getTime() - session.createdAt.getTime()) / (1000 * 60 * 60);
    if (ageInHours > 24) {
      proxySessionCache.delete(sessionId);
    }
  }
}, 60 * 60 * 1000);

/**
 * Generate a unique proxy session ID
 */
export const generateProxySessionId = (userId: number, gameId: number): string => {
  const timestamp = Date.now();
  const hash = crypto
    .createHash('sha256')
    .update(`${userId}_${gameId}_${timestamp}_${process.env.JWT_SECRET}`)
    .digest('hex')
    .substring(0, 32);

  return `proxy_${hash}`;
};

/**
 * Create a proxy URL for a game
 * This wraps the original game URL in our proxy endpoint
 */
export const createProxyUrl = (
  originalUrl: string,
  userId: number,
  gameId: number
): { proxyUrl: string; sessionId: string } => {
  const sessionId = generateProxySessionId(userId, gameId);

  // Store session info
  proxySessionCache.set(sessionId, {
    originalUrl,
    createdAt: new Date(),
    userId,
    gameId
  });

  // Build proxy URL - use full absolute URL to avoid React Router conflicts
  // IMPORTANT: Must use backend URL, not frontend URL
  const baseUrl = process.env.BACKEND_API_URL || process.env.SUPPLIER_CALLBACK_URL?.replace('/api/innova/', '') || 'https://backend.jackpotx.net';
  const proxyUrl = `${baseUrl}/api/game/proxy/${sessionId}`;

  console.log('[GAME_PROXY] Generated proxy URL:', {
    baseUrl,
    sessionId,
    fullProxyUrl: proxyUrl
  });

  console.log('[GAME_PROXY] Created proxy session:', {
    sessionId,
    userId,
    gameId,
    proxyUrl,
    maskedIp: PROXY_IP
  });

  return { proxyUrl, sessionId };
};

/**
 * Proxy handler for game iframe
 * This fetches the game content and serves it with modified headers
 */
export const proxyGameContent = async (req: Request, res: Response): Promise<void> => {
  try {
    // When using regex route, params are in array format
    // Capture group 1: sessionId, Capture group 2: additional path
    const sessionId = req.params[0];
    const requestPath = req.params[1] || '';

    // Retrieve session info
    const session = proxySessionCache.get(sessionId);
    if (!session) {
      console.error('[GAME_PROXY] Session not found:', {
        sessionId,
        requestPath,
        fullUrl: req.url,
        activeSessions: Array.from(proxySessionCache.keys())
      });
      res.status(404).send(`
        <!DOCTYPE html>
        <html>
          <head><title>Session Expired</title></head>
          <body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:Arial;">
            <div style="text-align:center;">
              <h1>Game Session Expired</h1>
              <p>Please reload the game from the lobby.</p>
            </div>
          </body>
        </html>
      `);
      return;
    }

    // Build target URL: if there's a path, append it to the original URL's base
    let targetUrl = session.originalUrl;
    if (requestPath) {
      // CRITICAL FIX: Check if requestPath contains a full proxy URL (double-rewrite prevention)
      // This happens when the HTML rewriter creates proxy URLs, then browser requests them again
      if (requestPath.includes('backend.jackpotx.net/api/game/proxy/')) {
        console.warn('[GAME_PROXY] Detected double-proxied URL, ignoring request:', {
          sessionId,
          requestPath,
          reason: 'URL already contains proxy path, would create invalid nested proxy URL'
        });
        res.status(400).send('Invalid nested proxy URL');
        return;
      }

      const baseUrl = new URL(session.originalUrl);
      targetUrl = `${baseUrl.origin}${requestPath}`;
    }

    console.log('[GAME_PROXY] Proxying request:', {
      sessionId,
      originalUrl: session.originalUrl,
      targetUrl,
      requestPath,
      realUserIp: req.ip,
      maskedIp: PROXY_IP,
      method: 'Full proxy with VPS - ALL requests routed through Slovenia'
    });

    // DISABLED: Rotating proxy (free proxies blocked by Cloudflare)
    // Always use direct connection now
    let response: any;

    {
      console.log('[GAME_PROXY] Using direct connection (no proxy)');

      // Advanced browser emulation headers to bypass Cloudflare
      const browserHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9,ro;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Cache-Control': 'max-age=0',
        'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'DNT': '1',
        'Connection': 'keep-alive'
      };

      const axiosConfig: any = {
        headers: browserHeaders,
        responseType: 'arraybuffer',
        maxRedirects: 5,
        validateStatus: () => true,
        timeout: 30000,
        decompress: true
      };

      response = await axios.get(targetUrl, axiosConfig);
    }

    // Check if response data is already decompressed by axios or still compressed
    let decompressedData = response.data;
    const contentEncoding = response.headers['content-encoding'];

    console.log('[GAME_PROXY] Response details:', {
      contentEncoding: contentEncoding || 'none',
      isBuffer: Buffer.isBuffer(response.data),
      dataLength: response.data.length,
      dataType: typeof response.data,
      first20Bytes: Buffer.isBuffer(response.data) ? response.data.slice(0, 20).toString('hex') : 'not a buffer'
    });

    // Only decompress if data is still a Buffer (compressed)
    // If axios already decompressed it, response.data will be a string
    if (Buffer.isBuffer(response.data) && contentEncoding) {
      try {
        if (contentEncoding.includes('gzip')) {
          decompressedData = await gunzipAsync(response.data);
          console.log('[GAME_PROXY] Manually decompressed gzip');
        } else if (contentEncoding.includes('deflate')) {
          decompressedData = await inflateAsync(response.data);
          console.log('[GAME_PROXY] Manually decompressed deflate');
        } else if (contentEncoding.includes('br')) {
          decompressedData = await brotliDecompressAsync(response.data);
          console.log('[GAME_PROXY] Manually decompressed brotli');
        } else if (contentEncoding.includes('zstd')) {
          // Zstandard compression (used by Cloudflare and modern servers)
          decompressedData = await zstdDecompress(response.data);
          console.log('[GAME_PROXY] Manually decompressed zstd (Zstandard)');
        } else {
          console.warn('[GAME_PROXY] Unknown content-encoding:', contentEncoding);
        }
      } catch (err: any) {
        console.error('[GAME_PROXY] Decompression failed:', err.message);
        // Use original data if decompression fails
      }
    } else if (Buffer.isBuffer(response.data) && !contentEncoding) {
      // Data is buffer but no encoding header - probably already decompressed by axios
      console.log('[GAME_PROXY] Data is buffer without encoding - keeping as-is');
    } else {
      // Data is already a string (axios decompressed it)
      console.log('[GAME_PROXY] Data already decompressed by axios (string)');
    }

    // Set response headers
    const contentType = response.headers['content-type'] || 'text/html';
    res.setHeader('Content-Type', contentType);

    // CRITICAL: Remove Content-Encoding header after decompression!
    // Otherwise browser will try to decompress already decompressed data
    res.removeHeader('Content-Encoding');

    // Add CORS headers to allow iframe embedding
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Remove X-Frame-Options to allow iframe embedding
    res.removeHeader('X-Frame-Options');

    // Add CSP header to allow iframe embedding
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self' *");

    // If it's HTML, rewrite URLs to route through proxy
    if (contentType.includes('text/html')) {
      let html = decompressedData.toString('utf-8');

      // COMPREHENSIVE TRACKING: Identify exactly what HTML we receive
      const htmlPreview = html.substring(0, 1000);
      const scriptTags = (html.match(/<script[^>]*src="([^"]+)"/g) || []).slice(0, 5);
      const linkTags = (html.match(/<link[^>]*href="([^"]+)"/g) || []).slice(0, 5);
      const imgTags = (html.match(/<img[^>]*src="([^"]+)"/g) || []).slice(0, 5);

      console.log('[GAME_PROXY] ═══════════════════════════════════════════════════════');
      console.log('[GAME_PROXY] HTML RECEIVED FROM VPS:');
      console.log('[GAME_PROXY] ═══════════════════════════════════════════════════════');
      console.log('[GAME_PROXY] Length:', html.length, 'chars');
      console.log('[GAME_PROXY] Status:', response.status);
      console.log('[GAME_PROXY] Content-Type:', contentType);
      console.log('[GAME_PROXY] ───────────────────────────────────────────────────────');
      console.log('[GAME_PROXY] HTML Preview (first 1000 chars):');
      console.log(htmlPreview);
      console.log('[GAME_PROXY] ───────────────────────────────────────────────────────');
      console.log('[GAME_PROXY] Found <script> tags:', scriptTags.length);
      scriptTags.forEach((tag, i) => console.log(`[GAME_PROXY]   ${i+1}. ${tag}`));
      console.log('[GAME_PROXY] ───────────────────────────────────────────────────────');
      console.log('[GAME_PROXY] Found <link> tags:', linkTags.length);
      linkTags.forEach((tag, i) => console.log(`[GAME_PROXY]   ${i+1}. ${tag}`));
      console.log('[GAME_PROXY] ───────────────────────────────────────────────────────');
      console.log('[GAME_PROXY] Found <img> tags:', imgTags.length);
      imgTags.forEach((tag, i) => console.log(`[GAME_PROXY]   ${i+1}. ${tag}`));
      console.log('[GAME_PROXY] ═══════════════════════════════════════════════════════');

      // FULL TRANSPARENT PROXY: Rewrite ALL URLs to go through our VPS proxy
      // This ensures all resources (JS, CSS, images) are fetched via VPS
      const originalHost = new URL(session.originalUrl).origin;
      const proxyBaseUrl = `${process.env.BACKEND_API_URL || 'https://backend.jackpotx.net'}/api/game/proxy/${sessionId}`;

      console.log('[GAME_PROXY] Rewriting URLs:', {
        originalHost,
        proxyBaseUrl,
        sessionId,
        htmlLength: html.length,
        sampleUrls: {
          absoluteUrl: html.match(/https:\/\/gamerun-eu\.gaminguniverse\.fun\/[^"'\s]+/)?.[0] || 'none',
          absolutePath: html.match(/src="\/[^"]+"/)?.[0] || 'none',
          relativeUrl: html.match(/src="[^"/:]+[^"]*\.(js|css|png)"/)?.[0] || 'none'
        }
      });

      // Escape special regex characters in originalHost
      const escapedHost = originalHost.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Strategy 1: Rewrite absolute URLs (https://gamerun-eu.gaminguniverse.fun/... → proxy URL)
      // CRITICAL: Avoid double-rewriting by checking EACH match individually
      const beforeStrategy1 = html;

      // Use replace with callback to check each match
      html = html.replace(new RegExp(escapedHost, 'g'), (match, offset) => {
        // Get context around the match (100 chars before)
        const contextBefore = html.substring(Math.max(0, offset - 100), offset);

        // Check if this match is already part of a proxy URL
        if (contextBefore.includes('/api/game/proxy/')) {
          // This is already a proxied URL, don't replace
          return match;
        }

        // This is a fresh URL from the provider, replace it
        return proxyBaseUrl;
      });

      console.log('[GAME_PROXY] Strategy 1 replacements:', {
        count: (beforeStrategy1.match(new RegExp(escapedHost, 'g')) || []).length,
        example: beforeStrategy1.match(new RegExp(`${escapedHost}[^"'\\s]+`))?.[0] || 'none'
      });

      // Strategy 2A: Rewrite parent directory paths (../)
      // CRITICAL FIX: Provider uses ../file.js which goes UP one level!
      // Browser interprets: https://backend.jackpotx.net/api/game/proxy/sessionId/../file.js
      // Which becomes: https://backend.jackpotx.net/api/game/file.js (EXITS proxy path!)
      // Solution: Replace ../ with direct proxy path
      const beforeStrategy2A = html;
      html = html.replace(/src="\.\.\/([^"]+)"/g, `src="${proxyBaseUrl}/$1"`);
      html = html.replace(/href="\.\.\/([^"]+)"/g, `href="${proxyBaseUrl}/$1"`);
      html = html.replace(/url\(["']?\.\.\/([^)"']+)["']?\)/g, `url(${proxyBaseUrl}/$1)`);

      const strategy2AMatches = (beforeStrategy2A.match(/(?:src|href)="\.\.\/[^"]+"/g) || []).slice(0, 5);
      console.log('[GAME_PROXY] Strategy 2A (parent directory ../):', {
        foundMatches: strategy2AMatches.length > 0,
        examples: strategy2AMatches,
        proxyBaseUrl
      });

      // Strategy 2B: Rewrite absolute-path URLs (starting with /)
      // These MUST be rewritten because browser interprets them relative to domain
      // Example: src="/jquery.js" → "https://backend.jackpotx.net/jquery.js" (WRONG!)
      // We need: src="https://backend.jackpotx.net/api/game/proxy/sessionId/jquery.js" (CORRECT!)
      const beforeStrategy2B = html;
      html = html.replace(/src="\/([^"]+)"/g, `src="${proxyBaseUrl}/$1"`);
      html = html.replace(/href="\/([^"]+)"/g, `href="${proxyBaseUrl}/$1"`);
      html = html.replace(/url\(["']?\/([^)"']+)["']?\)/g, `url(${proxyBaseUrl}/$1)`);

      const strategy2BMatches = (beforeStrategy2B.match(/(?:src|href)="\/[^"]+"/g) || []).slice(0, 5);
      console.log('[GAME_PROXY] Strategy 2B (absolute paths /):', {
        foundMatches: strategy2BMatches.length > 0,
        examples: strategy2BMatches,
        proxyBaseUrl
      });

      // Strategy 3: DISABLED - Browser handles relative URLs automatically
      // Relative URLs (without /) are interpreted relative to current page URL
      // Example: "css/start.css" → "https://backend.jackpotx.net/api/game/proxy/sessionId/css/start.css"
      // This works automatically without any rewriting!

      // COMPREHENSIVE TRACKING: Show URLs AFTER rewriting
      const scriptTagsAfter = (html.match(/<script[^>]*src="([^"]+)"/g) || []).slice(0, 5);
      const linkTagsAfter = (html.match(/<link[^>]*href="([^"]+)"/g) || []).slice(0, 5);

      console.log('[GAME_PROXY] ═══════════════════════════════════════════════════════');
      console.log('[GAME_PROXY] AFTER URL REWRITING:');
      console.log('[GAME_PROXY] ═══════════════════════════════════════════════════════');
      console.log('[GAME_PROXY] <script> tags AFTER rewriting:', scriptTagsAfter.length);
      scriptTagsAfter.forEach((tag, i) => console.log(`[GAME_PROXY]   ${i+1}. ${tag}`));
      console.log('[GAME_PROXY] ───────────────────────────────────────────────────────');
      console.log('[GAME_PROXY] <link> tags AFTER rewriting:', linkTagsAfter.length);
      linkTagsAfter.forEach((tag, i) => console.log(`[GAME_PROXY]   ${i+1}. ${tag}`));
      console.log('[GAME_PROXY] ═══════════════════════════════════════════════════════');

      // CRITICAL: Inject JavaScript to intercept ALL dynamic resource loading
      // This handles resources loaded via JavaScript (XMLHttpRequest, fetch, Image, etc.)
      const interceptorScript = `
<script>
(function() {
  'use strict';

  const PROXY_BASE_URL = '${proxyBaseUrl}';
  const ORIGINAL_HOST = '${originalHost}';

  console.log('[PROXY_INTERCEPTOR] Initialized:', { PROXY_BASE_URL, ORIGINAL_HOST });

  // Helper function to rewrite URLs
  function rewriteUrl(url) {
    if (!url || typeof url !== 'string') return url;

    // Skip data: and blob: URLs
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      return url;
    }

    // Skip if already proxied
    if (url.includes('/api/game/proxy/')) {
      return url;
    }

    // Case 1: Absolute URL with original host
    if (url.startsWith(ORIGINAL_HOST)) {
      const path = url.replace(ORIGINAL_HOST, '');
      const rewritten = PROXY_BASE_URL + path;
      console.log('[PROXY_INTERCEPTOR] Rewriting absolute URL:', url, '→', rewritten);
      return rewritten;
    }

    // Case 2: Protocol-relative URL (//domain.com/path)
    if (url.startsWith('//')) {
      const rewritten = PROXY_BASE_URL + url.substring(url.indexOf('/', 2));
      console.log('[PROXY_INTERCEPTOR] Rewriting protocol-relative URL:', url, '→', rewritten);
      return rewritten;
    }

    // Case 3: Absolute path (/path/file.ext)
    if (url.startsWith('/')) {
      const rewritten = PROXY_BASE_URL + url;
      console.log('[PROXY_INTERCEPTOR] Rewriting absolute path:', url, '→', rewritten);
      return rewritten;
    }

    // Case 4: Parent directory relative path (../file.ext or ../../file.ext)
    if (url.startsWith('../') || url.startsWith('./')) {
      // Remove all ../ and ./ prefixes
      let cleanPath = url;
      while (cleanPath.startsWith('../') || cleanPath.startsWith('./')) {
        if (cleanPath.startsWith('../')) {
          cleanPath = cleanPath.substring(3);
        } else if (cleanPath.startsWith('./')) {
          cleanPath = cleanPath.substring(2);
        }
      }
      const rewritten = PROXY_BASE_URL + '/' + cleanPath;
      console.log('[PROXY_INTERCEPTOR] Rewriting parent/current dir path:', url, '→', rewritten);
      return rewritten;
    }

    // Case 5: Simple relative path (images/file.png or just file.png)
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      const rewritten = PROXY_BASE_URL + '/' + url;
      console.log('[PROXY_INTERCEPTOR] Rewriting relative path:', url, '→', rewritten);
      return rewritten;
    }

    // Case 6: External URLs (different domain) - pass through
    return url;
  }

  // Intercept XMLHttpRequest
  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    const rewrittenUrl = rewriteUrl(url);
    console.log('[PROXY_INTERCEPTOR] XMLHttpRequest.open:', { original: url, rewritten: rewrittenUrl });
    return originalXHROpen.call(this, method, rewrittenUrl, ...args);
  };

  // Intercept fetch
  const originalFetch = window.fetch;
  window.fetch = function(url, ...args) {
    const rewrittenUrl = rewriteUrl(url);
    console.log('[PROXY_INTERCEPTOR] fetch:', { original: url, rewritten: rewrittenUrl });
    return originalFetch.call(this, rewrittenUrl, ...args);
  };

  // Intercept Image constructor
  const OriginalImage = window.Image;
  window.Image = function() {
    const img = new OriginalImage();
    const originalSrcDescriptor = Object.getOwnPropertyDescriptor(OriginalImage.prototype, 'src');

    Object.defineProperty(img, 'src', {
      get: function() {
        return originalSrcDescriptor.get.call(this);
      },
      set: function(url) {
        const rewrittenUrl = rewriteUrl(url);
        console.log('[PROXY_INTERCEPTOR] Image.src:', { original: url, rewritten: rewrittenUrl });
        return originalSrcDescriptor.set.call(this, rewrittenUrl);
      }
    });

    return img;
  };

  // Intercept createElement for images
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName, ...args) {
    const element = originalCreateElement.call(this, tagName, ...args);

    if (tagName.toLowerCase() === 'img') {
      const originalSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
      Object.defineProperty(element, 'src', {
        get: function() {
          return originalSrcDescriptor.get.call(this);
        },
        set: function(url) {
          const rewrittenUrl = rewriteUrl(url);
          console.log('[PROXY_INTERCEPTOR] createElement(img).src:', { original: url, rewritten: rewrittenUrl });
          return originalSrcDescriptor.set.call(this, rewrittenUrl);
        }
      });
    }

    return element;
  };

  console.log('[PROXY_INTERCEPTOR] All interceptors installed successfully');
})();
</script>`;

      // Inject the interceptor script right after <head> tag
      html = html.replace(/<head>/i, '<head>' + interceptorScript);

      console.log('[GAME_PROXY] URL rewriting completed with dynamic interceptor injection');
      console.log('[GAME_PROXY] Successfully proxied game content (HTML):', {
        sessionId,
        contentType,
        statusCode: response.status,
        originalLength: response.data.length,
        decompressedLength: Buffer.isBuffer(decompressedData) ? decompressedData.length : decompressedData.length
      });
      return res.send(html);
    } else {
      // For non-HTML content, send decompressed data
      console.log('[GAME_PROXY] Successfully proxied game content (non-HTML):', {
        sessionId,
        contentType,
        statusCode: response.status,
        originalLength: response.data.length,
        decompressedLength: Buffer.isBuffer(decompressedData) ? decompressedData.length : decompressedData.length
      });
      return res.send(decompressedData);
    }

    // This should never be reached (removed dead code due to return statements above)

  } catch (error: any) {
    console.error('[GAME_PROXY] Error proxying game:', {
      sessionId: req.params.sessionId,
      error: error.message,
      stack: error.stack
    });

    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Game Loading Error</title></head>
        <body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:Arial;">
          <div style="text-align:center;">
            <h1>Unable to Load Game</h1>
            <p>An error occurred while loading the game. Please try again.</p>
            <p style="color:#666;font-size:12px;">Error: ${error.message}</p>
          </div>
        </body>
      </html>
    `);
  }
};

/**
 * Get session info (for debugging)
 */
export const getProxySessionInfo = (sessionId: string) => {
  return proxySessionCache.get(sessionId);
};

/**
 * Clear a specific session
 */
export const clearProxySession = (sessionId: string): boolean => {
  return proxySessionCache.delete(sessionId);
};

/**
 * Get all active sessions (for admin monitoring)
 */
export const getActiveProxySessions = () => {
  const sessions: any[] = [];
  for (const [sessionId, session] of proxySessionCache.entries()) {
    sessions.push({
      sessionId,
      userId: session.userId,
      gameId: session.gameId,
      createdAt: session.createdAt,
      ageMinutes: Math.floor((Date.now() - session.createdAt.getTime()) / (1000 * 60))
    });
  }
  return sessions;
};
