"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testProxy = exports.getProxyStats = void 0;
const rotating_proxy_service_1 = require("../../services/proxy/rotating-proxy.service");
/**
 * Get rotating proxy pool statistics
 * GET /api/admin/proxy/stats
 */
const getProxyStats = async (req, res) => {
    try {
        const stats = rotating_proxy_service_1.rotatingProxyService.getStats();
        res.status(200).json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get proxy stats',
            error: error.message
        });
    }
};
exports.getProxyStats = getProxyStats;
/**
 * Test a specific proxy
 * POST /api/admin/proxy/test
 * Body: { proxyUrl: "http://1.2.3.4:8080" }
 */
const testProxy = async (req, res) => {
    try {
        const { proxyUrl } = req.body;
        if (!proxyUrl) {
            res.status(400).json({
                success: false,
                message: 'proxyUrl is required'
            });
            return;
        }
        const isWorking = await rotating_proxy_service_1.rotatingProxyService.testProxy(proxyUrl);
        res.status(200).json({
            success: true,
            data: {
                proxyUrl,
                working: isWorking
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to test proxy',
            error: error.message
        });
    }
};
exports.testProxy = testProxy;
