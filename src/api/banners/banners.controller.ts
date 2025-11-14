import { Request, Response } from 'express';

/**
 * Banners Controller
 *
 * Handles banner/hero image endpoints for frontend display
 */

/**
 * Get all active banners
 * GET /api/banners
 */
export const getAllBanners = async (req: Request, res: Response) => {
  try {
    // TODO: Query database for banners when banner management is implemented
    // For now, return empty array to prevent 404 errors
    res.json({
      success: true,
      data: {
        banners: [], // No banners configured yet
        total: 0
      }
    });
  } catch (error: any) {
    console.error('Error fetching banners:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch banners',
      error: error.message
    });
  }
};
