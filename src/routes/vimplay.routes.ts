import { Router, Request, Response } from 'express';
import { VimplayCallbackService } from '../services/payment/vimplay-callback.service';

const router = Router();
const vimplayService = VimplayCallbackService.getInstance();

/**
 * @openapi
 * /vimplay/authenticate:
 *   post:
 *     summary: Vimplay authentication endpoint
 *     tags:
 *       - Vimplay
 *     description: Authenticates user session and returns balance
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: User session token
 *     responses:
 *       200:
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 balance:
 *                   type: number
 *                 player_id:
 *                   type: string
 *                 token:
 *                   type: string
 */
router.post('/authenticate', async (req: Request, res: Response) => {
  try {
    console.log('[VIMPLAY] Authenticate request:', {
      token: req.body.token ? '***' : undefined
    });

    const response = await vimplayService.authenticate(req.body);

    console.log('[VIMPLAY] Authenticate response:', {
      player_id: response.player_id,
      balance: response.balance,
      status: response.status
    });

    res.status(200).json(response);
  } catch (error: any) {
    console.error('[VIMPLAY] Authenticate error:', error);
    res.status(200).json({
      status: 999,
      balance: 0,
      player_id: '',
      token: ''
    });
  }
});

/**
 * @openapi
 * /vimplay/debit:
 *   post:
 *     summary: Vimplay debit (bet) endpoint
 *     tags:
 *       - Vimplay
 *     description: Process bet transaction and deduct from user balance
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - siteId
 *               - playerId
 *               - token
 *               - currency
 *               - roundId
 *               - gameId
 *               - trnasaction
 *             properties:
 *               siteId:
 *                 type: integer
 *               playerId:
 *                 type: string
 *               token:
 *                 type: string
 *               currency:
 *                 type: string
 *               roundId:
 *                 type: string
 *               gameId:
 *                 type: integer
 *               trnasaction:
 *                 type: object
 *                 properties:
 *                   transactionId:
 *                     type: string
 *                   betAmount:
 *                     type: number
 *                   inGameBouns:
 *                     type: boolean
 *                   bonusId:
 *                     type: string
 *     responses:
 *       200:
 *         description: Debit processed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 balance:
 *                   type: number
 *                 playerId:
 *                   type: string
 *                 transaction:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: integer
 *                     transactionId:
 *                       type: string
 *                     partnerTransactionId:
 *                       type: string
 */
router.post('/debit', async (req: Request, res: Response) => {
  try {
    // Log full request body to debug field names
    console.log('[VIMPLAY] Debit FULL request body:', JSON.stringify(req.body, null, 2));

    // Normalize: Vimplay may send "transaction", "trnasaction", or data at root level
    let txData = req.body.transaction || req.body.trnasaction;

    // If no nested transaction object, check if data is at root level
    if (!txData && req.body.transactionId) {
      txData = {
        transactionId: req.body.transactionId,
        betAmount: req.body.betAmount,
        inGameBouns: req.body.inGameBouns || req.body.inGameBonus,
        bonusId: req.body.bonusId
      };
    }

    console.log('[VIMPLAY] Debit request:', {
      playerId: req.body.playerId,
      gameId: req.body.gameId,
      roundId: req.body.roundId,
      transactionId: txData?.transactionId,
      betAmount: txData?.betAmount
    });

    // Normalize the request body to use 'trnasaction' for the service
    const normalizedRequest = {
      ...req.body,
      trnasaction: txData
    };

    const response = await vimplayService.processDebit(normalizedRequest);

    console.log('[VIMPLAY] Debit response:', {
      playerId: response.playerId,
      balance: response.balance,
      status: response.transaction?.status
    });

    res.status(200).json(response);
  } catch (error: any) {
    console.error('[VIMPLAY] Debit error:', error);
    const txData = req.body.transaction || req.body.trnasaction;
    res.status(200).json({
      balance: 0,
      playerId: req.body.playerId,
      transaction: {
        status: 999,
        transactionId: txData?.transactionId || '',
        partnerTransactionId: txData?.transactionId || ''
      }
    });
  }
});

/**
 * @openapi
 * /vimplay/credit:
 *   post:
 *     summary: Vimplay credit (win) endpoint
 *     tags:
 *       - Vimplay
 *     description: Process win transaction and add to user balance
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - siteId
 *               - playerId
 *               - token
 *               - currency
 *               - roundId
 *               - gameId
 *               - transaction
 *             properties:
 *               siteId:
 *                 type: integer
 *               playerId:
 *                 type: string
 *               token:
 *                 type: string
 *               currency:
 *                 type: string
 *               roundId:
 *                 type: string
 *               gameId:
 *                 type: integer
 *               transaction:
 *                 type: object
 *                 properties:
 *                   transactionId:
 *                     type: string
 *                   betAmount:
 *                     type: number
 *                   inGameBouns:
 *                     type: boolean
 *                   bonusId:
 *                     type: string
 *                   winAmount:
 *                     type: number
 *                   betTransactionId:
 *                     type: string
 *     responses:
 *       200:
 *         description: Credit processed
 */
router.post('/credit', async (req: Request, res: Response) => {
  try {
    // Log full request body to debug field names
    console.log('[VIMPLAY] Credit FULL request body:', JSON.stringify(req.body, null, 2));

    // Normalize: Vimplay may send "transaction", "trnasaction", or data at root level
    let txData = req.body.transaction || req.body.trnasaction;

    // If no nested transaction object, check if data is at root level
    if (!txData && req.body.transactionId) {
      txData = {
        transactionId: req.body.transactionId,
        betAmount: req.body.betAmount,
        winAmount: req.body.winAmount,
        inGameBouns: req.body.inGameBouns || req.body.inGameBonus,
        bonusId: req.body.bonusId,
        betTransactionId: req.body.betTransactionId
      };
    }

    console.log('[VIMPLAY] Credit request:', {
      playerId: req.body.playerId,
      gameId: req.body.gameId,
      roundId: req.body.roundId,
      transactionId: txData?.transactionId,
      winAmount: txData?.winAmount
    });

    // Normalize the request body to use 'transaction' for the service
    const normalizedRequest = {
      ...req.body,
      transaction: txData
    };

    const response = await vimplayService.processCredit(normalizedRequest);

    console.log('[VIMPLAY] Credit response:', {
      playerId: response.playerId,
      balance: response.balance,
      status: response.transaction?.status
    });

    res.status(200).json(response);
  } catch (error: any) {
    console.error('[VIMPLAY] Credit error:', error);
    const txData = req.body.transaction || req.body.trnasaction;
    res.status(200).json({
      balance: 0,
      playerId: req.body.playerId,
      transaction: {
        status: 999,
        transactionId: txData?.transactionId || '',
        partnerTransactionId: txData?.transactionId || ''
      }
    });
  }
});

/**
 * @openapi
 * /vimplay/betwin:
 *   post:
 *     summary: Vimplay betwin endpoint
 *     tags:
 *       - Vimplay
 *     description: Process combined bet and win transaction
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - siteId
 *               - playerId
 *               - token
 *               - currency
 *               - roundId
 *               - gameId
 *               - trnasaction
 *             properties:
 *               siteId:
 *                 type: integer
 *               playerId:
 *                 type: string
 *               token:
 *                 type: string
 *               currency:
 *                 type: string
 *               roundId:
 *                 type: string
 *               gameId:
 *                 type: integer
 *               trnasaction:
 *                 type: object
 *                 properties:
 *                   transactionId:
 *                     type: string
 *                   betAmount:
 *                     type: number
 *                   bonusId:
 *                     type: string
 *                   inGameBouns:
 *                     type: boolean
 *                   winAmount:
 *                     type: number
 *     responses:
 *       200:
 *         description: BetWin processed
 */
router.post('/betwin', async (req: Request, res: Response) => {
  try {
    // Log full request body to debug field names
    console.log('[VIMPLAY] BetWin FULL request body:', JSON.stringify(req.body, null, 2));

    // Normalize: Vimplay may send "transaction", "trnasaction", or data at root level
    let txData = req.body.transaction || req.body.trnasaction;

    // If no nested transaction object, check if data is at root level
    if (!txData && req.body.transactionId) {
      txData = {
        transactionId: req.body.transactionId,
        betAmount: req.body.betAmount,
        winAmount: req.body.winAmount,
        inGameBouns: req.body.inGameBouns || req.body.inGameBonus,
        bonusId: req.body.bonusId
      };
    }

    console.log('[VIMPLAY] BetWin request:', {
      playerId: req.body.playerId,
      gameId: req.body.gameId,
      roundId: req.body.roundId,
      transactionId: txData?.transactionId,
      betAmount: txData?.betAmount,
      winAmount: txData?.winAmount
    });

    // Normalize the request body to use 'trnasaction' for the service
    const normalizedRequest = {
      ...req.body,
      trnasaction: txData
    };

    const response = await vimplayService.processBetWin(normalizedRequest);

    console.log('[VIMPLAY] BetWin response:', {
      playerId: response.playerId,
      balance: response.balance,
      status: response.transaction?.status
    });

    res.status(200).json(response);
  } catch (error: any) {
    console.error('[VIMPLAY] BetWin error:', error);
    const txData = req.body.transaction || req.body.trnasaction;
    res.status(200).json({
      balance: 0,
      playerId: req.body.playerId,
      transaction: {
        status: 999,
        transactionId: txData?.transactionId || '',
        partnerTransactionId: txData?.transactionId || ''
      }
    });
  }
});

/**
 * @openapi
 * /api/games/partner/list:
 *   post:
 *     summary: Get VimPlay game list
 *     tags:
 *       - Vimplay
 *     description: Get list of available games for VimPlay partner integration
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - secret
 *             properties:
 *               secret:
 *                 type: string
 *                 description: Partner secret key
 *     responses:
 *       200:
 *         description: List of games
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   images:
 *                     type: object
 *                     properties:
 *                       ls:
 *                         type: object
 *                         properties:
 *                           org:
 *                             type: string
 *                           avif:
 *                             type: string
 *                           webp:
 *                             type: string
 *                       pr:
 *                         type: object
 *                         properties:
 *                           org:
 *                             type: string
 *                           avif:
 *                             type: string
 *                           webp:
 *                             type: string
 *                       sq:
 *                         type: object
 *                         properties:
 *                           org:
 *                             type: string
 *                           avif:
 *                             type: string
 *                           webp:
 *                             type: string
 *                   type:
 *                     type: string
 */
router.post('/api/games/partner/list', async (req: Request, res: Response) => {
  try {
    console.log('[VIMPLAY] Game list request');

    const games = await vimplayService.getGameList(req.body);

    console.log(`[VIMPLAY] Game list response: ${games.length} games`);

    res.status(200).json(games);
  } catch (error: any) {
    console.error('[VIMPLAY] Game list error:', error);
    res.status(403).json({
      error: 'Unauthorized',
      message: 'Invalid secret or access denied'
    });
  }
});

/**
 * @openapi
 * /vimplay/refund:
 *   post:
 *     summary: Vimplay refund endpoint
 *     tags:
 *       - Vimplay
 *     description: Process transaction refund
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - transactionId
 *               - token
 *               - playerId
 *               - gameId
 *             properties:
 *               transactionId:
 *                 type: string
 *               token:
 *                 type: string
 *               playerId:
 *                 type: string
 *               gameId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Refund processed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                 balance:
 *                   type: number
 */
router.post('/refund', async (req: Request, res: Response) => {
  try {
    console.log('[VIMPLAY] Refund request:', {
      playerId: req.body.playerId,
      gameId: req.body.gameId,
      transactionId: req.body.transactionId
    });

    const response = await vimplayService.processRefund(req.body);

    console.log('[VIMPLAY] Refund response:', {
      balance: response.balance,
      status: response.status
    });

    res.status(200).json(response);
  } catch (error: any) {
    console.error('[VIMPLAY] Refund error:', error);
    res.status(200).json({
      status: 999,
      balance: 0
    });
  }
});

export default router;
