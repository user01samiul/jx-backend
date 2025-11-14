import { Router, Request, Response } from 'express';
import pool from '../db/postgres';
import { authenticate, adminAuth } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @openapi
 * /api/admin/provider/validate-transaction:
 *   post:
 *     summary: Validate if a transaction can be cancelled
 *     tags:
 *       - Admin Provider
 *     description: |
 *       Validates if a transaction_id exists and can be cancelled.
 *       Checks if the transaction has a corresponding bet record.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - transaction_id
 *             properties:
 *               transaction_id:
 *                 type: string
 *                 description: Transaction ID to validate
 *               user_id:
 *                 type: integer
 *                 description: User ID (optional, for additional validation)
 *     responses:
 *       200:
 *         description: Transaction validation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     transaction_id:
 *                       type: string
 *                     exists:
 *                       type: boolean
 *                     has_bet_record:
 *                       type: boolean
 *                     can_cancel:
 *                       type: boolean
 *                     transaction_status:
 *                       type: string
 *                     bet_outcome:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     user_id:
 *                       type: integer
 *                     created_at:
 *                       type: string
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/validate-transaction', authenticate, adminAuth, async (req: Request, res: Response) => {
  try {
    const { transaction_id, user_id } = req.body;

    if (!transaction_id) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID is required'
      });
    }

    // Check if transaction exists
    const transactionQuery = `
      SELECT 
        t.id,
        t.external_reference,
        t.type,
        t.amount,
        t.status,
        t.user_id,
        t.created_at,
        b.id as bet_id,
        b.outcome as bet_outcome
      FROM transactions t
      LEFT JOIN bets b ON t.id = b.transaction_id
      WHERE t.external_reference = $1
      ${user_id ? 'AND t.user_id = $2' : ''}
      ORDER BY t.created_at DESC
      LIMIT 1
    `;

    const transactionParams = user_id ? [transaction_id, user_id] : [transaction_id];
    const transactionResult = await pool.query(transactionQuery, transactionParams);

    if (transactionResult.rows.length === 0) {
      return res.json({
        success: true,
        message: 'Transaction not found',
        data: {
          transaction_id,
          exists: false,
          has_bet_record: false,
          can_cancel: false,
          transaction_status: null,
          bet_outcome: null,
          amount: null,
          user_id: null,
          created_at: null
        }
      });
    }

    const transaction = transactionResult.rows[0];
    const hasBetRecord = !!transaction.bet_id;
    const canCancel = hasBetRecord && transaction.status === 'completed';

    return res.json({
      success: true,
      message: 'Transaction validation completed',
      data: {
        transaction_id,
        exists: true,
        has_bet_record: hasBetRecord,
        can_cancel: canCancel,
        transaction_status: transaction.status,
        bet_outcome: transaction.bet_outcome,
        amount: transaction.amount,
        user_id: transaction.user_id,
        created_at: transaction.created_at,
        transaction_type: transaction.type
      }
    });

  } catch (error) {
    console.error('Error validating transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * @openapi
 * /api/admin/provider/list-cancellable-transactions:
 *   get:
 *     summary: List all cancellable transactions for a user
 *     tags:
 *       - Admin Provider
 *     description: |
 *       Lists all transactions that can be cancelled for a specific user.
 *       Only shows transactions with bet records and completed status.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: user_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID to get cancellable transactions for
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of transactions to return
 *     responses:
 *       200:
 *         description: List of cancellable transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       transaction_id:
 *                         type: string
 *                       bet_id:
 *                         type: integer
 *                       amount:
 *                         type: number
 *                       outcome:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                       game_id:
 *                         type: integer
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/list-cancellable-transactions', authenticate, adminAuth, async (req: Request, res: Response) => {
  try {
    const { user_id, limit = 10 } = req.query;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const query = `
      SELECT 
        t.external_reference as transaction_id,
        b.id as bet_id,
        t.amount,
        b.outcome,
        t.created_at,
        b.game_id
      FROM transactions t
      JOIN bets b ON t.id = b.transaction_id
      WHERE t.user_id = $1 
        AND t.status = 'completed'
        AND t.type = 'bet'
      ORDER BY t.created_at DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [user_id, limit]);

    return res.json({
      success: true,
      message: `Found ${result.rows.length} cancellable transactions`,
      data: result.rows
    });

  } catch (error) {
    console.error('Error listing cancellable transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * @openapi
 * /api/admin/provider/transaction-details:
 *   get:
 *     summary: Get detailed information about a transaction
 *     tags:
 *       - Admin Provider
 *     description: |
 *       Gets detailed information about a specific transaction including
 *       bet details, user information, and cancellation status.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: transaction_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID to get details for
 *     responses:
 *       200:
 *         description: Transaction details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     transaction:
 *                       type: object
 *                     bet:
 *                       type: object
 *                     user:
 *                       type: object
 *                     game:
 *                       type: object
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Transaction not found
 */
router.get('/transaction-details', authenticate, adminAuth, async (req: Request, res: Response) => {
  try {
    const { transaction_id } = req.query;

    if (!transaction_id) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID is required'
      });
    }

    const query = `
      SELECT 
        t.id as transaction_id,
        t.external_reference,
        t.type,
        t.amount,
        t.status,
        t.created_at,
        t.metadata,
        b.id as bet_id,
        b.bet_amount,
        b.win_amount,
        b.outcome,
        b.placed_at,
        b.game_data,
        u.id as user_id,
        u.username,
        g.id as game_id,
        g.name as game_name,
        g.category
      FROM transactions t
      LEFT JOIN bets b ON t.id = b.transaction_id
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN games g ON b.game_id = g.id
      WHERE t.external_reference = $1
      ORDER BY t.created_at DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [transaction_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    const row = result.rows[0];

    return res.json({
      success: true,
      message: 'Transaction details retrieved',
      data: {
        transaction: {
          id: row.transaction_id,
          external_reference: row.external_reference,
          type: row.type,
          amount: row.amount,
          status: row.status,
          created_at: row.created_at,
          metadata: row.metadata
        },
        bet: row.bet_id ? {
          id: row.bet_id,
          bet_amount: row.bet_amount,
          win_amount: row.win_amount,
          outcome: row.outcome,
          placed_at: row.placed_at,
          game_data: row.game_data
        } : null,
        user: {
          id: row.user_id,
          username: row.username
        },
        game: row.game_id ? {
          id: row.game_id,
          name: row.game_name,
          category: row.category
        } : null
      }
    });

  } catch (error) {
    console.error('Error getting transaction details:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

export default router; 