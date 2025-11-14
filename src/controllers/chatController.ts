import { Request, Response } from 'express';
import pool from '../db/postgres';

/**
 * Chat Controller - REST API endpoints for chat system
 * Works alongside WebSocket for historical data and management
 */

// Get agent's chat sessions
export const getAgentSessions = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).user.userId;
    const { status = 'active', limit = 50, offset = 0 } = req.query;

    const result = await pool.query(
      `SELECT cs.id, cs.user_id, cs.status, cs.priority, cs.subject, cs.started_at,
              cs.accepted_at, cs.total_messages, cs.updated_at,
              u.username as player_name, u.email as player_email,
              (SELECT COUNT(*) FROM chat_session_messages WHERE session_id = cs.id AND is_read = false AND sender_type = 'player') as unread_count
       FROM chat_sessions cs
       JOIN users u ON cs.user_id = u.id
       WHERE cs.assigned_agent_id = $1 AND cs.status = $2
       ORDER BY cs.updated_at DESC
       LIMIT $3 OFFSET $4`,
      [agentId, status, limit, offset]
    );

    res.json({
      success: true,
      data: {
        sessions: result.rows,
        total: result.rowCount,
      },
    });
  } catch (error) {
    console.error('Error fetching agent sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chat sessions',
    });
  }
};

// Get player's chat history
export const getPlayerChatHistory = async (req: Request, res: Response) => {
  try {
    const playerId = (req as any).user.userId;
    const { limit = 20, offset = 0 } = req.query;

    const result = await pool.query(
      `SELECT cs.id, cs.status, cs.priority, cs.subject, cs.started_at, cs.closed_at,
              cs.rating, cs.total_messages,
              u.username as agent_name
       FROM chat_sessions cs
       LEFT JOIN users u ON cs.assigned_agent_id = u.id
       WHERE cs.user_id = $1
       ORDER BY cs.started_at DESC
       LIMIT $2 OFFSET $3`,
      [playerId, limit, offset]
    );

    res.json({
      success: true,
      data: {
        sessions: result.rows,
        total: result.rowCount,
      },
    });
  } catch (error) {
    console.error('Error fetching player chat history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chat history',
    });
  }
};

// Get messages for a specific session
export const getSessionMessages = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = (req as any).user.userId;
    const { limit = 100, offset = 0 } = req.query;

    // Verify user has access to this session
    const sessionCheck = await pool.query(
      `SELECT user_id, assigned_agent_id FROM chat_sessions WHERE id = $1`,
      [sessionId]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    const session = sessionCheck.rows[0];
    if (session.user_id !== userId && session.assigned_agent_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const result = await pool.query(
      `SELECT m.id, m.sender_id, m.sender_type, m.content, m.message_type,
              m.attachments, m.is_read, m.read_at, m.created_at,
              u.username as sender_name
       FROM chat_session_messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.session_id = $1
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [sessionId, limit, offset]
    );

    res.json({
      success: true,
      data: {
        messages: result.rows.reverse(), // Return oldest first
        total: result.rowCount,
      },
    });
  } catch (error) {
    console.error('Error fetching session messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
    });
  }
};

// Get chat queue (for admins/agents)
export const getChatQueue = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT cs.id as session_id, cs.user_id, cs.priority, cs.subject, cs.started_at,
              cq.priority_score, cq.entered_queue_at,
              EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - cq.entered_queue_at))::INTEGER as wait_time,
              u.username, u.email, uvs.current_tier_id as vip_tier_id
       FROM chat_queue cq
       JOIN chat_sessions cs ON cq.session_id = cs.id
       JOIN users u ON cs.user_id = u.id
       LEFT JOIN user_vip_status uvs ON u.id = uvs.user_id
       WHERE cs.status = 'waiting'
       ORDER BY cq.priority_score DESC, cq.entered_queue_at ASC`
    );

    res.json({
      success: true,
      data: {
        queue: result.rows,
        total: result.rowCount,
      },
    });
  } catch (error) {
    console.error('Error fetching chat queue:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chat queue',
    });
  }
};

// Rate a completed chat session
export const rateChatSession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const playerId = (req as any).user.userId;
    const { rating, feedback } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5',
      });
    }

    // Verify session belongs to player and is closed
    const sessionCheck = await pool.query(
      `SELECT user_id, status, assigned_agent_id FROM chat_sessions WHERE id = $1`,
      [sessionId]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    const session = sessionCheck.rows[0];

    if (session.user_id !== playerId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    if (session.status !== 'closed') {
      return res.status(400).json({
        success: false,
        message: 'Can only rate closed sessions',
      });
    }

    // Update session rating
    await pool.query(
      `UPDATE chat_sessions SET rating = $1, feedback = $2 WHERE id = $3`,
      [rating, feedback || null, sessionId]
    );

    // Update agent's average rating
    if (session.assigned_agent_id) {
      await pool.query(
        `UPDATE chat_agents ca
         SET avg_rating = (
           SELECT AVG(rating)::DECIMAL(3,2)
           FROM chat_sessions
           WHERE assigned_agent_id = ca.user_id AND rating IS NOT NULL
         )
         WHERE user_id = $1`,
        [session.assigned_agent_id]
      );
    }

    res.json({
      success: true,
      message: 'Rating submitted successfully',
    });
  } catch (error) {
    console.error('Error rating chat session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit rating',
    });
  }
};

// Get canned responses (for agents)
export const getCannedResponses = async (req: Request, res: Response) => {
  try {
    const { category, language = 'en' } = req.query;

    let query = `
      SELECT id, title, shortcut, content, category, language, usage_count
      FROM chat_canned_responses
      WHERE is_active = true AND language = $1
    `;
    const params: any[] = [language];

    if (category) {
      query += ` AND category = $2`;
      params.push(category);
    }

    query += ` ORDER BY usage_count DESC, title ASC`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: {
        responses: result.rows,
      },
    });
  } catch (error) {
    console.error('Error fetching canned responses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch canned responses',
    });
  }
};

// Create/Update canned response (admin only)
export const saveCannedResponse = async (req: Request, res: Response) => {
  try {
    const { id, title, shortcut, content, category, language = 'en' } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required',
      });
    }

    let result;

    if (id) {
      // Update existing
      result = await pool.query(
        `UPDATE chat_canned_responses
         SET title = $1, shortcut = $2, content = $3, category = $4, language = $5, updated_at = CURRENT_TIMESTAMP
         WHERE id = $6
         RETURNING *`,
        [title, shortcut, content, category, language, id]
      );
    } else {
      // Create new
      const createdBy = (req as any).user.userId;
      result = await pool.query(
        `INSERT INTO chat_canned_responses (title, shortcut, content, category, language, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [title, shortcut, content, category, language, createdBy]
      );
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error saving canned response:', error);

    if (error.code === '23505') { // Unique violation
      return res.status(400).json({
        success: false,
        message: 'Shortcut already exists',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to save canned response',
    });
  }
};

// Get chat statistics (admin dashboard)
export const getChatStats = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = startDate && endDate
      ? `WHERE cs.started_at >= $1 AND cs.started_at <= $2`
      : '';
    const params = startDate && endDate ? [startDate, endDate] : [];

    const stats = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'active') as active_chats,
        COUNT(*) FILTER (WHERE status = 'waiting') as waiting_chats,
        COUNT(*) FILTER (WHERE status = 'closed') as closed_chats,
        COUNT(*) FILTER (WHERE status = 'closed' AND rating >= 4) as positive_ratings,
        AVG(rating) FILTER (WHERE rating IS NOT NULL)::DECIMAL(3,2) as avg_rating,
        AVG(wait_time) FILTER (WHERE wait_time IS NOT NULL)::INTEGER as avg_wait_time,
        AVG(first_response_time) FILTER (WHERE first_response_time IS NOT NULL)::INTEGER as avg_first_response,
        COUNT(DISTINCT assigned_agent_id) FILTER (WHERE status IN ('active', 'closed')) as active_agents
      FROM chat_sessions cs
      ${dateFilter}
    `, params);

    const agentStats = await pool.query(`
      SELECT * FROM chat_agent_stats
      WHERE status = 'online' OR current_chat_count > 0
      ORDER BY active_chats DESC, total_chats_handled DESC
    `);

    res.json({
      success: true,
      data: {
        overall: stats.rows[0],
        agents: agentStats.rows,
      },
    });
  } catch (error) {
    console.error('Error fetching chat stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chat statistics',
    });
  }
};

// Update agent settings
export const updateAgentSettings = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).user.userId;
    const { maxConcurrentChats, autoAccept, specializations, languages } = req.body;

    const result = await pool.query(
      `INSERT INTO chat_agents (user_id, max_concurrent_chats, auto_accept, specializations, languages)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id)
       DO UPDATE SET
         max_concurrent_chats = EXCLUDED.max_concurrent_chats,
         auto_accept = EXCLUDED.auto_accept,
         specializations = EXCLUDED.specializations,
         languages = EXCLUDED.languages,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [agentId, maxConcurrentChats || 5, autoAccept || false, specializations || [], languages || ['en']]
    );

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating agent settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update agent settings',
    });
  }
};

// Get agent settings
export const getAgentSettings = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).user.userId;

    const result = await pool.query(
      `SELECT * FROM chat_agents WHERE user_id = $1`,
      [agentId]
    );

    if (result.rows.length === 0) {
      // Create default settings
      const newSettings = await pool.query(
        `INSERT INTO chat_agents (user_id) VALUES ($1) RETURNING *`,
        [agentId]
      );
      return res.json({
        success: true,
        data: newSettings.rows[0],
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching agent settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch agent settings',
    });
  }
};
