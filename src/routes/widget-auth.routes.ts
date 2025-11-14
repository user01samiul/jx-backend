import express, { Request, Response } from 'express';
import crypto from 'crypto';
import { env } from '../configs/env';

const router = express.Router();

/**
 * @route POST /api/widget-auth/key
 * @desc Generate secure authentication key for Innova Widget SDK
 * @access Public (but rate-limited)
 *
 * This endpoint generates the authentication key server-side to keep
 * the secret key secure and not exposed in browser code.
 */
router.post('/key', async (req: Request, res: Response) => {
  try {
    const { player, currency } = req.body;

    // Generate timestamp (5 years in future for expiration)
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 5);
    const ts = futureDate.toISOString();

    // Get secret key from environment (for aggregator integration)
    // Use SUPPLIER_SECRET_KEY as it's the aggregator integration key
    const secretKey = env.SUPPLIER_SECRET_KEY; // '2aZWQ93V8aT1sKrA'

    let key: string;

    if (player && currency) {
      // Player authentication mode
      // key = sha1('relayer' + player + currency + ts + secret key)
      key = crypto
        .createHash('sha1')
        .update('relayer' + player + currency + ts + secretKey)
        .digest('hex');
    } else {
      // Anonymous mode
      // key = sha1('relayer' + ts + secret key)
      key = crypto
        .createHash('sha1')
        .update('relayer' + ts + secretKey)
        .digest('hex');
    }

    console.log('[WIDGET_AUTH] Generated key for:', {
      mode: player ? 'player' : 'anonymous',
      player: player || 'none',
      currency: currency || 'none',
      ts,
      keyPreview: key.substring(0, 10) + '...'
    });

    res.json({
      success: true,
      data: {
        ts,
        key,
        mode: player ? 'player' : 'anonymous'
      }
    });
  } catch (error: any) {
    console.error('[WIDGET_AUTH] Error generating key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate authentication key'
    });
  }
});

export default router;
