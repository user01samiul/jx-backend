import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import pool from '../../db/postgres';
import { createClient } from 'redis';
import { Config } from '../../configs/config';

interface AuthenticatedSocket extends Socket {
  userId?: number;
  username?: string;
  role?: string;
}

interface JWTPayload {
  userId: number;
  username: string;
  role: string;
}

export class ChatSocketService {
  private io: Server;
  private redisClient: any;
  private connectedUsers: Map<number, string> = new Map(); // userId -> socketId

  constructor(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: [
          'https://admin.jackpotx.net',
          'https://jackpotx.net',
          'http://localhost:3000',
          'http://localhost:3002'
        ],
        credentials: true,
      },
      path: '/socket.io',
    });

    this.initializeRedis();
    this.initializeSocketHandlers();
  }

  private async initializeRedis() {
    try {
      this.redisClient = createClient({
        socket: {
          host: 'localhost',
          port: 6379,
        },
      });

      this.redisClient.on('error', (err: any) => {
        console.error('Redis Client Error:', err);
      });

      await this.redisClient.connect();
      console.log('✅ Redis connected for chat system');
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
    }
  }

  private initializeSocketHandlers() {
    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, Config.jwt.accessSecret) as JWTPayload;
        socket.userId = decoded.userId;
        socket.username = decoded.username;
        socket.role = decoded.role;

        next();
      } catch (error) {
        next(new Error('Authentication error: Invalid token'));
      }
    });

    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`✅ User connected: ${socket.username} (ID: ${socket.userId})`);

      if (socket.userId) {
        this.connectedUsers.set(socket.userId, socket.id);
      }

      // Join user's personal room
      socket.join(`user:${socket.userId}`);

      // If user is Admin or Support, join agents room
      if (socket.role === 'Admin' || socket.role === 'Support') {
        socket.join('agents');
        console.log(`Agent ${socket.username} joined agents room`);
      }

      // Handle agent going online
      socket.on('agent:online', async () => {
        await this.handleAgentStatusChange(socket, 'online');
      });

      // Handle agent going offline
      socket.on('agent:offline', async () => {
        await this.handleAgentStatusChange(socket, 'offline');
      });

      // Handle agent going away
      socket.on('agent:away', async () => {
        await this.handleAgentStatusChange(socket, 'away');
      });

      // Start new chat session (player initiates)
      socket.on('chat:start', async (data: { subject?: string; priority?: string }) => {
        await this.handleStartChat(socket, data);
      });

      // Rejoin existing session after F5 refresh
      socket.on('chat:rejoin', async (data: { sessionId: number }) => {
        await this.handleRejoinSession(socket, data.sessionId);
      });

      // Agent accepts chat from queue
      socket.on('chat:accept', async (data: { sessionId: number }) => {
        await this.handleAcceptChat(socket, data.sessionId);
      });

      // Send message
      socket.on('chat:message', async (data: { sessionId: number; content: string; messageType?: string }) => {
        await this.handleSendMessage(socket, data);
      });

      // Typing indicator
      socket.on('chat:typing', async (data: { sessionId: number; isTyping: boolean }) => {
        await this.handleTypingIndicator(socket, data);
      });

      // Mark messages as read
      socket.on('chat:read', async (data: { sessionId: number; messageIds: number[] }) => {
        await this.handleMarkAsRead(socket, data);
      });

      // Close chat session
      socket.on('chat:close', async (data: { sessionId: number; closeReason?: string }) => {
        await this.handleCloseChat(socket, data);
      });

      // Get chat history
      socket.on('chat:history', async (data: { sessionId: number; limit?: number; offset?: number }) => {
        await this.handleGetHistory(socket, data);
      });

      // Get active sessions (for agents)
      socket.on('chat:get_active_sessions', async () => {
        await this.handleGetActiveSessions(socket);
      });

      // Get queue status (for players)
      socket.on('chat:queue_status', async () => {
        await this.handleGetQueueStatus(socket);
      });

      // Disconnect
      socket.on('disconnect', () => {
        console.log(`❌ User disconnected: ${socket.username} (ID: ${socket.userId})`);
        if (socket.userId) {
          this.connectedUsers.delete(socket.userId);
        }
      });
    });
  }

  private async handleAgentStatusChange(socket: AuthenticatedSocket, status: string) {
    try {
      console.log(`[AGENT STATUS] User ${socket.username} (${socket.role}) changing status to: ${status}`);

      if (socket.role !== 'Admin' && socket.role !== 'Support') {
        console.log(`[AGENT STATUS] Access denied for role: ${socket.role}`);
        socket.emit('error', { message: 'Only agents can change status' });
        return;
      }

      // Ensure agent record exists
      await pool.query(
        `INSERT INTO chat_agents (user_id, status, last_active_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id)
         DO UPDATE SET status = $2, last_active_at = CURRENT_TIMESTAMP`,
        [socket.userId, status]
      );

      console.log(`[AGENT STATUS] Status updated in DB for user ${socket.userId}`);

      // Broadcast to all admins
      this.io.to('agents').emit('agent:status_changed', {
        userId: socket.userId,
        username: socket.username,
        status,
      });

      socket.emit('agent:status_updated', { status });
      console.log(`[AGENT STATUS] Status change confirmed to client`);
    } catch (error) {
      console.error('[AGENT STATUS] Error updating agent status:', error);
      socket.emit('error', { message: 'Failed to update status' });
    }
  }

  private async handleStartChat(socket: AuthenticatedSocket, data: { subject?: string; priority?: string }) {
    try {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Create chat session
        const sessionResult = await client.query(
          `INSERT INTO chat_sessions (user_id, status, priority, subject)
           VALUES ($1, 'waiting', $2, $3)
           RETURNING id, started_at`,
          [socket.userId, data.priority || 'normal', data.subject || null]
        );

        const sessionId = sessionResult.rows[0].id;

        // Calculate priority score (VIP users get higher priority)
        const userResult = await client.query(
          `SELECT uvs.current_tier_id
           FROM users u
           LEFT JOIN user_vip_status uvs ON u.id = uvs.user_id
           WHERE u.id = $1`,
          [socket.userId]
        );
        const vipTierId = userResult.rows[0]?.current_tier_id;
        const priorityScore = vipTierId ? 100 + vipTierId * 10 : 50;

        // Add to queue
        await client.query(
          `INSERT INTO chat_queue (session_id, priority_score)
           VALUES ($1, $2)`,
          [sessionId, priorityScore]
        );

        await client.query('COMMIT');

        // Join session room
        socket.join(`session:${sessionId}`);
        console.log(`[CHAT START] Player ${socket.username} (ID: ${socket.userId}, Socket: ${socket.id}) joined room session:${sessionId}`);

        // Notify player
        socket.emit('chat:started', {
          sessionId,
          status: 'waiting',
          startedAt: sessionResult.rows[0].started_at,
        });

        // Notify all available agents
        this.io.to('agents').emit('chat:new_session', {
          sessionId,
          userId: socket.userId,
          username: socket.username,
          subject: data.subject,
          priority: data.priority || 'normal',
          priorityScore,
        });

        console.log(`📞 New chat session started: ${sessionId} by user ${socket.username}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      socket.emit('error', { message: 'Failed to start chat session' });
    }
  }

  private async handleRejoinSession(socket: AuthenticatedSocket, sessionId: number) {
    try {
      console.log(`[CHAT REJOIN] User ${socket.username} (ID: ${socket.userId}) rejoining session ${sessionId}`);

      // Verify session exists and user is part of it
      const sessionCheck = await pool.query(
        `SELECT id, user_id, assigned_agent_id, status
         FROM chat_sessions
         WHERE id = $1 AND (user_id = $2 OR assigned_agent_id = $2)`,
        [sessionId, socket.userId]
      );

      if (sessionCheck.rows.length === 0) {
        socket.emit('error', { message: 'Session not found or you are not part of this session' });
        return;
      }

      const session = sessionCheck.rows[0];

      // Don't rejoin closed sessions
      if (session.status === 'closed') {
        console.log(`[CHAT REJOIN] Session ${sessionId} is closed, clearing localStorage`);
        socket.emit('chat:session_expired', { sessionId });
        return;
      }

      // Rejoin the session room
      socket.join(`session:${sessionId}`);
      console.log(`[CHAT REJOIN] User ${socket.username} rejoined room session:${sessionId}`);

      // Notify user they've rejoined
      socket.emit('chat:rejoined', {
        sessionId,
        status: session.status,
      });

      console.log(`✅ Session ${sessionId} rejoined by user ${socket.username}`);
    } catch (error) {
      console.error('Error rejoining session:', error);
      socket.emit('error', { message: 'Failed to rejoin session' });
    }
  }

  private async handleAcceptChat(socket: AuthenticatedSocket, sessionId: number) {
    try {
      if (socket.role !== 'Admin' && socket.role !== 'Support') {
        socket.emit('error', { message: 'Only agents can accept chats' });
        return;
      }

      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Check if session is still waiting
        const sessionCheck = await client.query(
          `SELECT status, user_id FROM chat_sessions WHERE id = $1`,
          [sessionId]
        );

        if (sessionCheck.rows.length === 0) {
          throw new Error('Session not found');
        }

        if (sessionCheck.rows[0].status !== 'waiting') {
          throw new Error('Session already accepted or closed');
        }

        const playerId = sessionCheck.rows[0].user_id;

        // Update session
        const waitTime = await client.query(
          `UPDATE chat_sessions
           SET assigned_agent_id = $1,
               status = 'active',
               accepted_at = CURRENT_TIMESTAMP,
               wait_time = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at))::INTEGER
           WHERE id = $2
           RETURNING wait_time`,
          [socket.userId, sessionId]
        );

        // Remove from queue
        await client.query(`DELETE FROM chat_queue WHERE session_id = $1`, [sessionId]);

        // Update agent's current chat count
        await client.query(
          `UPDATE chat_agents
           SET current_chat_count = current_chat_count + 1
           WHERE user_id = $1`,
          [socket.userId]
        );

        await client.query('COMMIT');

        // Join session room
        socket.join(`session:${sessionId}`);
        console.log(`[CHAT ACCEPT] Agent ${socket.username} (ID: ${socket.userId}, Socket: ${socket.id}) joined room session:${sessionId}`);

        // Notify agent
        socket.emit('chat:accepted', {
          sessionId,
          playerId,
          waitTime: waitTime.rows[0].wait_time,
        });

        // Notify player
        this.io.to(`user:${playerId}`).emit('chat:agent_joined', {
          sessionId,
          agentId: socket.userId,
          agentName: socket.username,
        });

        // Notify other agents (remove from queue)
        this.io.to('agents').emit('chat:session_accepted', {
          sessionId,
          agentId: socket.userId,
        });

        console.log(`✅ Chat ${sessionId} accepted by agent ${socket.username}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('Error accepting chat:', error);
      socket.emit('error', { message: error.message || 'Failed to accept chat' });
    }
  }

  private async handleSendMessage(
    socket: AuthenticatedSocket,
    data: { sessionId: number; content: string; messageType?: string }
  ) {
    try {
      // Verify user is part of this session
      const sessionCheck = await pool.query(
        `SELECT user_id, assigned_agent_id, status FROM chat_sessions WHERE id = $1`,
        [data.sessionId]
      );

      if (sessionCheck.rows.length === 0) {
        socket.emit('error', { message: 'Session not found' });
        return;
      }

      const session = sessionCheck.rows[0];

      if (session.status !== 'active') {
        socket.emit('error', { message: 'Session is not active' });
        return;
      }

      const isPlayer = session.user_id === socket.userId;
      const isAgent = session.assigned_agent_id === socket.userId;

      if (!isPlayer && !isAgent) {
        socket.emit('error', { message: 'You are not part of this session' });
        return;
      }

      const senderType = isAgent ? 'agent' : 'player';

      // Insert message
      const messageResult = await pool.query(
        `INSERT INTO chat_session_messages (session_id, sender_id, sender_type, content, message_type)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, created_at`,
        [data.sessionId, socket.userId, senderType, data.content, data.messageType || 'text']
      );

      const message = {
        id: messageResult.rows[0].id,
        sessionId: data.sessionId,
        senderId: socket.userId,
        senderType,
        senderName: socket.username,
        content: data.content,
        messageType: data.messageType || 'text',
        createdAt: new Date(messageResult.rows[0].created_at).toISOString(),
      };

      // Update session message count
      await pool.query(
        `UPDATE chat_sessions SET total_messages = total_messages + 1 WHERE id = $1`,
        [data.sessionId]
      );

      // If this is first agent response, record first_response_time
      if (isAgent) {
        await pool.query(
          `UPDATE chat_sessions
           SET first_response_time = COALESCE(first_response_time, EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at))::INTEGER)
           WHERE id = $1`,
          [data.sessionId]
        );
      }

      // Get room info for debugging
      const roomName = `session:${data.sessionId}`;
      const roomSockets = this.io.sockets.adapter.rooms.get(roomName);
      const socketsInRoom = roomSockets ? Array.from(roomSockets) : [];

      console.log(`[CHAT MESSAGE] Broadcasting message:`, {
        sessionId: data.sessionId,
        roomName,
        sender: socket.username,
        senderId: socket.userId,
        senderType,
        content: data.content,
        socketsInRoom: socketsInRoom.length,
        socketIds: socketsInRoom,
        currentSocketId: socket.id,
        messageId: message.id,
        createdAt: message.createdAt
      });

      // Broadcast to session room
      this.io.to(roomName).emit('chat:message', message);

      console.log(`💬 Message sent in session ${data.sessionId} by ${socket.username} to ${socketsInRoom.length} sockets`);
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  private async handleTypingIndicator(socket: AuthenticatedSocket, data: { sessionId: number; isTyping: boolean }) {
    try {
      if (data.isTyping) {
        await pool.query(
          `INSERT INTO chat_typing_indicators (session_id, user_id, is_typing)
           VALUES ($1, $2, true)
           ON CONFLICT (session_id, user_id)
           DO UPDATE SET is_typing = true, started_at = CURRENT_TIMESTAMP, expires_at = CURRENT_TIMESTAMP + INTERVAL '10 seconds'`,
          [data.sessionId, socket.userId]
        );
      } else {
        await pool.query(
          `DELETE FROM chat_typing_indicators WHERE session_id = $1 AND user_id = $2`,
          [data.sessionId, socket.userId]
        );
      }

      // Broadcast to session (except sender)
      socket.to(`session:${data.sessionId}`).emit('chat:typing', {
        sessionId: data.sessionId,
        userId: socket.userId,
        username: socket.username,
        isTyping: data.isTyping,
      });
    } catch (error) {
      console.error('Error handling typing indicator:', error);
    }
  }

  private async handleMarkAsRead(socket: AuthenticatedSocket, data: { sessionId: number; messageIds: number[] }) {
    try {
      await pool.query(
        `UPDATE chat_session_messages
         SET is_read = true, read_at = CURRENT_TIMESTAMP
         WHERE id = ANY($1) AND session_id = $2`,
        [data.messageIds, data.sessionId]
      );

      // Notify other participants
      socket.to(`session:${data.sessionId}`).emit('chat:messages_read', {
        sessionId: data.sessionId,
        messageIds: data.messageIds,
        readBy: socket.userId,
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }

  private async handleCloseChat(socket: AuthenticatedSocket, data: { sessionId: number; closeReason?: string }) {
    try {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Update session
        await client.query(
          `UPDATE chat_sessions
           SET status = 'closed',
               closed_at = CURRENT_TIMESTAMP,
               closed_by = $1,
               close_reason = $2
           WHERE id = $3`,
          [socket.userId, data.closeReason || 'user_ended', data.sessionId]
        );

        // If closed by agent, decrease their chat count
        if (socket.role === 'Admin' || socket.role === 'Agent') {
          await client.query(
            `UPDATE chat_agents
             SET current_chat_count = GREATEST(current_chat_count - 1, 0),
                 total_chats_handled = total_chats_handled + 1
             WHERE user_id = $1`,
            [socket.userId]
          );
        }

        await client.query('COMMIT');

        // Notify all participants
        this.io.to(`session:${data.sessionId}`).emit('chat:closed', {
          sessionId: data.sessionId,
          closedBy: socket.userId,
          closeReason: data.closeReason,
        });

        console.log(`🔒 Chat ${data.sessionId} closed by ${socket.username}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error closing chat:', error);
      socket.emit('error', { message: 'Failed to close chat' });
    }
  }

  private async handleGetHistory(
    socket: AuthenticatedSocket,
    data: { sessionId: number; limit?: number; offset?: number }
  ) {
    try {
      const messagesResult = await pool.query(
        `SELECT m.id, m.sender_id, m.sender_type, m.content, m.message_type, m.is_read, m.created_at,
                u.username as sender_name
         FROM chat_session_messages m
         JOIN users u ON m.sender_id = u.id
         WHERE m.session_id = $1
         ORDER BY m.created_at ASC
         LIMIT $2 OFFSET $3`,
        [data.sessionId, data.limit || 100, data.offset || 0]
      );

      socket.emit('chat:history', {
        sessionId: data.sessionId,
        messages: messagesResult.rows,
      });
    } catch (error) {
      console.error('Error fetching chat history:', error);
      socket.emit('error', { message: 'Failed to fetch chat history' });
    }
  }

  private async handleGetActiveSessions(socket: AuthenticatedSocket) {
    try {
      if (socket.role !== 'Admin' && socket.role !== 'Agent') {
        socket.emit('error', { message: 'Only agents can view active sessions' });
        return;
      }

      const sessionsResult = await pool.query(
        `SELECT cs.id, cs.user_id, cs.status, cs.priority, cs.subject, cs.started_at, cs.total_messages,
                u.username as player_name, u.avatar_url
         FROM chat_sessions cs
         JOIN users u ON cs.user_id = u.id
         WHERE cs.assigned_agent_id = $1 AND cs.status = 'active'
         ORDER BY cs.started_at DESC`,
        [socket.userId]
      );

      socket.emit('chat:active_sessions', {
        sessions: sessionsResult.rows,
      });
    } catch (error) {
      console.error('Error fetching active sessions:', error);
      socket.emit('error', { message: 'Failed to fetch active sessions' });
    }
  }

  private async handleGetQueueStatus(socket: AuthenticatedSocket) {
    try {
      const queueResult = await pool.query(
        `SELECT COUNT(*) as total_waiting,
                AVG(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - cq.entered_queue_at))) as avg_wait_time
         FROM chat_queue cq
         JOIN chat_sessions cs ON cq.session_id = cs.id
         WHERE cs.status = 'waiting'`
      );

      const userQueueResult = await pool.query(
        `SELECT cq.position, cq.estimated_wait_time
         FROM chat_queue cq
         JOIN chat_sessions cs ON cq.session_id = cs.id
         WHERE cs.user_id = $1 AND cs.status = 'waiting'
         LIMIT 1`,
        [socket.userId]
      );

      socket.emit('chat:queue_status', {
        totalWaiting: parseInt(queueResult.rows[0].total_waiting) || 0,
        avgWaitTime: parseInt(queueResult.rows[0].avg_wait_time) || 0,
        yourPosition: userQueueResult.rows[0]?.position || null,
        estimatedWaitTime: userQueueResult.rows[0]?.estimated_wait_time || null,
      });
    } catch (error) {
      console.error('Error fetching queue status:', error);
      socket.emit('error', { message: 'Failed to fetch queue status' });
    }
  }

  public async shutdown() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
    this.io.close();
  }
}
