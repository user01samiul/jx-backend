import express, { Request, Response } from 'express';
import CampaignsService from '../services/CampaignsService';
import { authenticate, adminAuth } from '../middlewares/auth.middleware';

const router = express.Router();

/**
 * @route GET /api/campaigns/vendors
 * @desc Get list of supported campaign vendors
 * @access Admin
 */
router.get('/vendors', authenticate, adminAuth, async (req: Request, res: Response) => {
  try {
    const vendors = await CampaignsService.listVendors();
    res.json({ success: true, data: vendors });
  } catch (error: any) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/campaigns/game-limits
 * @desc Get betting limits for games
 * @access Admin
 */
router.get('/game-limits', authenticate, adminAuth, async (req: Request, res: Response) => {
  try {
    const { vendors, games, currencies } = req.query;

    const limits = await CampaignsService.getGameLimits(
      vendors as string,
      games as string,
      currencies as string
    );

    res.json({ success: true, data: limits });
  } catch (error: any) {
    console.error('Error fetching game limits:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/campaigns/sync-limits
 * @desc Sync game limits from platform to database
 * @access Admin
 */
router.post('/sync-limits/:vendor', authenticate, adminAuth, async (req: Request, res: Response) => {
  try {
    const { vendor } = req.params;
    await CampaignsService.syncGameLimitsFromPlatform(vendor);
    res.json({ success: true, message: `Game limits synced for ${vendor}` });
  } catch (error: any) {
    console.error('Error syncing game limits:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/campaigns
 * @desc List all campaigns with filters
 * @access Admin
 */
router.get('/', authenticate, adminAuth, async (req: Request, res: Response) => {
  try {
    const { vendors, currencies, players, games, include_expired, per_page } = req.query;

    const filters: any = {};
    if (vendors) filters.vendors = vendors;
    if (currencies) filters.currencies = currencies;
    if (players) filters.players = players;
    if (games) filters.games = games;
    if (include_expired !== undefined) filters.include_expired = include_expired === 'true';
    if (per_page) filters.per_page = parseInt(per_page as string);

    const campaigns = await CampaignsService.listCampaigns(filters);
    res.json({ success: true, data: campaigns });
  } catch (error: any) {
    console.error('Error listing campaigns:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/campaigns/:campaignCode
 * @desc Get campaign details
 * @access Admin
 */
router.get('/:campaignCode', authenticate, adminAuth, async (req: Request, res: Response) => {
  try {
    const { campaignCode } = req.params;
    const campaign = await CampaignsService.getCampaignDetails(campaignCode);
    res.json({ success: true, data: campaign });
  } catch (error: any) {
    console.error('Error fetching campaign details:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/campaigns
 * @desc Create a new campaign
 * @access Admin
 */
router.post('/', authenticate, adminAuth, async (req: Request, res: Response) => {
  try {
    const campaignData = req.body;
    await CampaignsService.createCampaign(campaignData);
    res.json({ success: true, message: 'Campaign created successfully' });
  } catch (error: any) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/campaigns/:campaignCode/cancel
 * @desc Cancel a campaign
 * @access Admin
 */
router.post('/:campaignCode/cancel', authenticate, adminAuth, async (req: Request, res: Response) => {
  try {
    const { campaignCode } = req.params;
    await CampaignsService.cancelCampaign(campaignCode);
    res.json({ success: true, message: 'Campaign cancelled successfully' });
  } catch (error: any) {
    console.error('Error cancelling campaign:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/campaigns/:campaignCode/players/add
 * @desc Add players to a campaign
 * @access Admin
 */
router.post('/:campaignCode/players/add', authenticate, adminAuth, async (req: Request, res: Response) => {
  try {
    const { campaignCode } = req.params;
    const { players } = req.body;

    if (!players || (Array.isArray(players) && players.length === 0)) {
      return res.status(400).json({ success: false, error: 'Players array is required' });
    }

    await CampaignsService.addPlayersToCampaign(campaignCode, players);
    res.json({ success: true, message: 'Players added to campaign successfully' });
  } catch (error: any) {
    console.error('Error adding players to campaign:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/campaigns/:campaignCode/players/remove
 * @desc Remove players from a campaign
 * @access Admin
 */
router.post('/:campaignCode/players/remove', authenticate, adminAuth, async (req: Request, res: Response) => {
  try {
    const { campaignCode } = req.params;
    const { players } = req.body;

    if (!players || (Array.isArray(players) && players.length === 0)) {
      return res.status(400).json({ success: false, error: 'Players array is required' });
    }

    await CampaignsService.removePlayersFromCampaign(campaignCode, players);
    res.json({ success: true, message: 'Players removed from campaign successfully' });
  } catch (error: any) {
    console.error('Error removing players from campaign:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/campaigns/user/:userId
 * @desc Get campaigns for a specific user (player endpoint)
 * @access Player
 */
router.get('/user/:userId', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);

    // Ensure user can only see their own campaigns
    if (req.user.id !== userId && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const campaigns = await CampaignsService.getUserCampaigns(userId);
    res.json({ success: true, data: campaigns });
  } catch (error: any) {
    console.error('Error fetching user campaigns:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/campaigns/use-freespin
 * @desc Use a free spin from a campaign
 * @access Player
 */
router.post('/use-freespin', authenticate, async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.body;
    const userId = req.user.id;

    const success = await CampaignsService.useFreeSpinFromCampaign(userId, campaignId);

    if (success) {
      res.json({ success: true, message: 'Free spin used successfully' });
    } else {
      res.status(400).json({ success: false, error: 'No free spins remaining' });
    }
  } catch (error: any) {
    console.error('Error using free spin:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
