"use strict";
// Rotating Proxy Service - Free proxy pool with automatic rotation
// Fetches and maintains a pool of working proxies from multiple sources
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rotatingProxyService = void 0;
const axios_1 = __importDefault(require("axios"));
const https_proxy_agent_1 = require("https-proxy-agent");
const cloudflare_solver_service_1 = require("./cloudflare-solver.service");
class RotatingProxyService {
    proxyPool = [];
    currentIndex = 0;
    lastRefresh = 0;
    REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes
    MAX_FAIL_COUNT = 3;
    PROXY_SOURCES = [
        'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all',
        'https://www.proxy-list.download/api/v1/get?type=http',
        'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt',
        'https://raw.githubusercontent.com/clarketm/proxy-list/master/proxy-list-raw.txt'
    ];
    constructor() {
        this.refreshProxyPool();
    }
    /**
     * Fetch proxies from multiple free sources
     */
    async fetchProxiesFromSource(sourceUrl) {
        try {
            const response = await axios_1.default.get(sourceUrl, { timeout: 10000 });
            const proxies = response.data
                .split('\n')
                .map((line) => line.trim())
                .filter((line) => {
                // Match IP:PORT format
                return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d{2,5}$/.test(line);
            });
            console.log(`[PROXY_POOL] Fetched ${proxies.length} proxies from ${sourceUrl}`);
            return proxies;
        }
        catch (error) {
            console.error(`[PROXY_POOL] Failed to fetch from ${sourceUrl}:`, error);
            return [];
        }
    }
    /**
     * Refresh the proxy pool from all sources
     */
    async refreshProxyPool() {
        const now = Date.now();
        if (now - this.lastRefresh < this.REFRESH_INTERVAL && this.proxyPool.length > 10) {
            return; // Don't refresh too often
        }
        console.log('[PROXY_POOL] Refreshing proxy pool...');
        const allProxies = [];
        // Fetch from all sources in parallel
        const fetchPromises = this.PROXY_SOURCES.map(source => this.fetchProxiesFromSource(source));
        const results = await Promise.allSettled(fetchPromises);
        results.forEach(result => {
            if (result.status === 'fulfilled') {
                allProxies.push(...result.value);
            }
        });
        // Remove duplicates
        const uniqueProxies = [...new Set(allProxies)];
        // Convert to ProxyInfo objects
        const newProxies = uniqueProxies.map(proxy => {
            const [host, portStr] = proxy.split(':');
            return {
                host,
                port: parseInt(portStr),
                url: `http://${proxy}`,
                lastUsed: new Date(0),
                failCount: 0,
                successCount: 0,
                avgResponseTime: 0
            };
        });
        // Merge with existing pool, keeping stats for known proxies
        const existingProxyMap = new Map(this.proxyPool.map(p => [`${p.host}:${p.port}`, p]));
        this.proxyPool = newProxies.map(newProxy => {
            const key = `${newProxy.host}:${newProxy.port}`;
            const existing = existingProxyMap.get(key);
            if (existing) {
                return {
                    ...existing,
                    // Reset fail count if it's been a while
                    failCount: existing.failCount > 0 ? Math.max(0, existing.failCount - 1) : 0
                };
            }
            return newProxy;
        });
        // Remove proxies with too many failures
        this.proxyPool = this.proxyPool.filter(p => p.failCount < this.MAX_FAIL_COUNT);
        // Sort by success rate
        this.proxyPool.sort((a, b) => {
            const aScore = a.successCount - a.failCount * 2;
            const bScore = b.successCount - b.failCount * 2;
            return bScore - aScore;
        });
        this.lastRefresh = now;
        console.log(`[PROXY_POOL] Pool refreshed: ${this.proxyPool.length} proxies available`);
    }
    /**
     * Get next proxy from the pool (round-robin)
     */
    async getNextProxy() {
        await this.refreshProxyPool();
        if (this.proxyPool.length === 0) {
            console.error('[PROXY_POOL] No proxies available!');
            return null;
        }
        // Round-robin through available proxies
        this.currentIndex = (this.currentIndex + 1) % this.proxyPool.length;
        const proxy = this.proxyPool[this.currentIndex];
        proxy.lastUsed = new Date();
        return proxy;
    }
    /**
     * Mark proxy as failed
     */
    markProxyFailed(proxy) {
        proxy.failCount++;
        console.log(`[PROXY_POOL] Proxy ${proxy.url} failed (${proxy.failCount}/${this.MAX_FAIL_COUNT})`);
    }
    /**
     * Mark proxy as successful
     */
    markProxySuccess(proxy, responseTime) {
        proxy.successCount++;
        // Running average of response time
        proxy.avgResponseTime = proxy.avgResponseTime === 0
            ? responseTime
            : (proxy.avgResponseTime * 0.7 + responseTime * 0.3);
        console.log(`[PROXY_POOL] Proxy ${proxy.url} success (${proxy.successCount} total, ${responseTime}ms)`);
    }
    /**
     * Make HTTP request through rotating proxy
     * Will automatically retry with different proxies on failure
     * Uses advanced Cloudflare bypass techniques
     */
    async makeRequest(targetUrl, config = {}, maxRetries = 3) {
        let lastError = null;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            const proxy = await this.getNextProxy();
            if (!proxy) {
                // No proxies available, try direct connection
                console.log('[PROXY_POOL] No proxies available, trying direct connection...');
                try {
                    return await axios_1.default.get(targetUrl, config);
                }
                catch (error) {
                    throw new Error('Direct connection failed and no proxies available');
                }
            }
            try {
                const startTime = Date.now();
                // Create proxy agent
                const proxyAgent = new https_proxy_agent_1.HttpsProxyAgent(proxy.url);
                // Advanced Cloudflare bypass headers
                const cloudflareBypassHeaders = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Sec-Fetch-User': '?1',
                    'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
                    'Sec-Ch-Ua-Mobile': '?0',
                    'Sec-Ch-Ua-Platform': '"Windows"',
                    'Cache-Control': 'max-age=0',
                    // CRITICAL: Spoof referrer to look like organic traffic
                    'Referer': 'https://www.google.com/',
                    // CRITICAL: Include Cloudflare cookies if available (empty for first request)
                    'Cookie': '',
                    ...config.headers
                };
                const response = await axios_1.default.get(targetUrl, {
                    ...config,
                    httpAgent: proxyAgent,
                    httpsAgent: proxyAgent,
                    timeout: 15000,
                    headers: cloudflareBypassHeaders,
                    // CRITICAL: Follow redirects (Cloudflare challenge redirects)
                    maxRedirects: 10,
                    validateStatus: (status) => status < 500 // Accept 4xx as valid
                });
                const responseTime = Date.now() - startTime;
                // Check if response is Cloudflare error page (400/403/404 with "cloudflare" in HTML)
                const isCloudflareBlock = (response.status === 400 || response.status === 403 || response.status === 404) &&
                    response.data &&
                    Buffer.isBuffer(response.data) &&
                    response.data.toString('utf-8').toLowerCase().includes('cloudflare');
                if (isCloudflareBlock) {
                    console.log(`[PROXY_POOL] Proxy ${proxy.url} blocked by Cloudflare (${response.status})`);
                    this.markProxyFailed(proxy);
                    throw new Error(`Cloudflare blocked proxy with ${response.status}`);
                }
                // Real success - valid response
                this.markProxySuccess(proxy, responseTime);
                console.log(`[PROXY_POOL] Request successful via ${proxy.url} (${responseTime}ms)`);
                return response;
            }
            catch (error) {
                lastError = error;
                this.markProxyFailed(proxy);
                console.log(`[PROXY_POOL] Attempt ${attempt + 1}/${maxRetries} failed with proxy ${proxy.url}:`, error.message);
                // Continue to next proxy
                continue;
            }
        }
        // All retries exhausted - Try Cloudflare solver as last resort
        console.log('[PROXY_POOL] All proxies failed. Trying Cloudflare solver...');
        try {
            const solution = await cloudflare_solver_service_1.cloudflareSolverService.solveChallenge(targetUrl, 30000);
            console.log('[PROXY_POOL] Cloudflare solver success!');
            // Return response in axios format
            return {
                status: solution.status,
                data: Buffer.from(solution.html),
                headers: {
                    'content-type': 'text/html; charset=UTF-8',
                    'user-agent': solution.userAgent
                },
                config: config,
                statusText: 'OK'
            };
        }
        catch (solverError) {
            console.error('[PROXY_POOL] Cloudflare solver also failed:', solverError.message);
            throw new Error(`All attempts failed. Proxies: ${lastError?.message}, Solver: ${solverError.message}`);
        }
    }
    /**
     * Get proxy pool statistics
     */
    getStats() {
        const workingProxies = this.proxyPool.filter(p => p.failCount < this.MAX_FAIL_COUNT);
        const avgResponseTime = workingProxies.reduce((sum, p) => sum + p.avgResponseTime, 0) / workingProxies.length;
        return {
            totalProxies: this.proxyPool.length,
            workingProxies: workingProxies.length,
            averageResponseTime: Math.round(avgResponseTime),
            lastRefresh: new Date(this.lastRefresh).toISOString(),
            currentProxy: this.proxyPool[this.currentIndex]?.url || 'none',
            topProxies: workingProxies.slice(0, 5).map(p => ({
                url: p.url,
                successRate: p.successCount / (p.successCount + p.failCount),
                avgResponseTime: Math.round(p.avgResponseTime)
            }))
        };
    }
    /**
     * Test a specific proxy
     */
    async testProxy(proxyUrl, testUrl = 'https://httpbin.org/ip') {
        try {
            const proxyAgent = new https_proxy_agent_1.HttpsProxyAgent(proxyUrl);
            const response = await axios_1.default.get(testUrl, {
                httpAgent: proxyAgent,
                httpsAgent: proxyAgent,
                timeout: 10000
            });
            console.log(`[PROXY_TEST] ${proxyUrl} - OK (${JSON.stringify(response.data)})`);
            return true;
        }
        catch (error) {
            console.log(`[PROXY_TEST] ${proxyUrl} - FAILED (${error.message})`);
            return false;
        }
    }
}
// Singleton instance
exports.rotatingProxyService = new RotatingProxyService();
