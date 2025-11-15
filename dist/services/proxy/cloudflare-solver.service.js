"use strict";
// Cloudflare Solver Service using Puppeteer Stealth
// Solves Cloudflare challenges and returns cookies + HTML
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloudflareSolverService = void 0;
const puppeteer_extra_1 = __importDefault(require("puppeteer-extra"));
const puppeteer_extra_plugin_stealth_1 = __importDefault(require("puppeteer-extra-plugin-stealth"));
// Add stealth plugin to puppeteer
puppeteer_extra_1.default.use((0, puppeteer_extra_plugin_stealth_1.default)());
class CloudflareSolverService {
    browser = null;
    maxBrowserPages = 5;
    currentPages = 0;
    /**
     * Initialize browser (lazy loading)
     */
    async getBrowser() {
        if (!this.browser) {
            console.log('[CLOUDFLARE_SOLVER] Launching stealth browser...');
            this.browser = await puppeteer_extra_1.default.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            });
            console.log('[CLOUDFLARE_SOLVER] Browser launched successfully');
        }
        return this.browser;
    }
    /**
     * Solve Cloudflare challenge and get cookies + HTML
     */
    async solveChallenge(targetUrl, maxTimeout = 30000) {
        if (this.currentPages >= this.maxBrowserPages) {
            throw new Error('Too many concurrent browser pages. Please wait.');
        }
        this.currentPages++;
        const browser = await this.getBrowser();
        const page = await browser.newPage();
        try {
            console.log('[CLOUDFLARE_SOLVER] Solving Cloudflare challenge:', targetUrl);
            const startTime = Date.now();
            // Set viewport and user agent
            await page.setViewport({ width: 1920, height: 1080 });
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
            // Navigate to target URL
            await page.goto(targetUrl, {
                waitUntil: 'networkidle0',
                timeout: maxTimeout
            });
            // Wait for Cloudflare challenge to be solved
            // Cloudflare typically redirects or removes challenge within 5-10 seconds
            await this.waitForCloudflareChallengeSolved(page, maxTimeout);
            const solveTime = Date.now() - startTime;
            console.log(`[CLOUDFLARE_SOLVER] Challenge solved in ${solveTime}ms`);
            // Get final URL, status, cookies, and HTML
            const finalUrl = page.url();
            const cookies = await page.cookies();
            const html = await page.content();
            const userAgent = await page.evaluate(() => navigator.userAgent);
            // Get response status (approximate - Puppeteer doesn't expose this easily)
            const status = 200; // If we got here, assume success
            console.log('[CLOUDFLARE_SOLVER] Solution obtained:', {
                finalUrl,
                cookiesCount: cookies.length,
                htmlLength: html.length,
                solveTime
            });
            return {
                url: finalUrl,
                status,
                cookies,
                html,
                headers: {},
                userAgent
            };
        }
        catch (error) {
            console.error('[CLOUDFLARE_SOLVER] Error solving challenge:', error.message);
            throw error;
        }
        finally {
            await page.close();
            this.currentPages--;
        }
    }
    /**
     * Wait for Cloudflare challenge to be solved
     * Cloudflare shows a "Checking your browser" page, then redirects or loads content
     */
    async waitForCloudflareChallengeSolved(page, maxTimeout) {
        const startTime = Date.now();
        const checkInterval = 500; // Check every 500ms
        while (Date.now() - startTime < maxTimeout) {
            // Check if page contains Cloudflare challenge text
            const bodyText = await page.evaluate(() => document.body.textContent);
            const isChallengePage = bodyText.includes('Checking your browser') ||
                bodyText.includes('Just a moment') ||
                bodyText.includes('DDoS protection by Cloudflare');
            if (!isChallengePage) {
                // Challenge solved!
                return;
            }
            // Wait before next check
            await new Promise(resolve => setTimeout(resolve, checkInterval));
        }
        throw new Error('Cloudflare challenge timeout - unable to solve within ' + maxTimeout + 'ms');
    }
    /**
     * Make request using solved Cloudflare cookies
     * After solving challenge once, you can reuse cookies for subsequent requests
     */
    async makeRequestWithCookies(targetUrl, cookies) {
        const browser = await this.getBrowser();
        const page = await browser.newPage();
        try {
            // Set cookies from previous solve
            await page.setCookie(...cookies);
            // Navigate to target URL with cookies
            await page.goto(targetUrl, {
                waitUntil: 'networkidle0',
                timeout: 15000
            });
            const html = await page.content();
            return html;
        }
        finally {
            await page.close();
        }
    }
    /**
     * Close browser and cleanup
     */
    async cleanup() {
        if (this.browser) {
            console.log('[CLOUDFLARE_SOLVER] Closing browser...');
            await this.browser.close();
            this.browser = null;
        }
    }
    /**
     * Get solver statistics
     */
    getStats() {
        return {
            browserActive: !!this.browser,
            currentPages: this.currentPages,
            maxPages: this.maxBrowserPages
        };
    }
}
// Singleton instance
exports.cloudflareSolverService = new CloudflareSolverService();
// Cleanup on process exit
process.on('SIGTERM', async () => {
    await exports.cloudflareSolverService.cleanup();
});
process.on('SIGINT', async () => {
    await exports.cloudflareSolverService.cleanup();
});
