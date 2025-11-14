// Proxy Statistics Controller - Monitor rotating proxy pool
import { Request, Response } from 'express';
import { rotatingProxyService } from '../../services/proxy/rotating-proxy.service';

/**
 * Get rotating proxy pool statistics
 * GET /api/admin/proxy/stats
 */
export const getProxyStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = rotatingProxyService.getStats();
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to get proxy stats',
      error: error.message
    });
  }
};

/**
 * Test a specific proxy
 * POST /api/admin/proxy/test
 * Body: { proxyUrl: "http://1.2.3.4:8080" }
 */
export const testProxy = async (req: Request, res: Response): Promise<void> => {
  try {
    const { proxyUrl } = req.body;

    if (!proxyUrl) {
      res.status(400).json({
        success: false,
        message: 'proxyUrl is required'
      });
      return;
    }

    const isWorking = await rotatingProxyService.testProxy(proxyUrl);

    res.status(200).json({
      success: true,
      data: {
        proxyUrl,
        working: isWorking
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to test proxy',
      error: error.message
    });
  }
};
