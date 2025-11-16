"use strict";
/**
 * CRM Controller - Support Tickets
 * All data comes from PostgreSQL database - NO MOCKS
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupportTickets = getSupportTickets;
exports.getTicketDetails = getTicketDetails;
exports.createSupportTicket = createSupportTicket;
exports.updateTicketStatus = updateTicketStatus;
exports.addTicketMessage = addTicketMessage;
exports.assignTicket = assignTicket;
const postgres_1 = __importDefault(require("../db/postgres"));
/**
 * Get all support tickets with filters
 * GET /api/admin/crm/tickets
 */
async function getSupportTickets(req, res) {
    const { page = 1, per_page = 25, status, priority, department, assigned_to, search } = req.query;
    const offset = (Number(page) - 1) * Number(per_page);
    try {
        const whereConditions = [];
        const queryParams = [];
        let paramIndex = 1;
        if (status) {
            whereConditions.push(`st.status = $${paramIndex++}`);
            queryParams.push(status);
        }
        if (priority) {
            whereConditions.push(`st.priority = $${paramIndex++}`);
            queryParams.push(priority);
        }
        if (department) {
            whereConditions.push(`st.department = $${paramIndex++}`);
            queryParams.push(department);
        }
        if (assigned_to) {
            whereConditions.push(`st.assigned_to = $${paramIndex++}`);
            queryParams.push(assigned_to);
        }
        if (search) {
            whereConditions.push(`(
        st.ticket_number ILIKE $${paramIndex} OR
        st.subject ILIKE $${paramIndex} OR
        u.username ILIKE $${paramIndex}
      )`);
            queryParams.push(`%${search}%`);
            paramIndex++;
        }
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        // Get total count
        const countResult = await postgres_1.default.query(`SELECT COUNT(*) FROM support_tickets st
       JOIN users u ON st.user_id = u.id
       ${whereClause}`, queryParams);
        // Get tickets
        queryParams.push(Number(per_page), offset);
        const result = await postgres_1.default.query(`SELECT
        st.*,
        u.username,
        u.email as user_email,
        up.avatar_url as user_avatar,
        assigned.username as assigned_to_name,
        assigned_profile.avatar_url as assigned_to_avatar,
        (SELECT COUNT(*) FROM support_messages WHERE ticket_id = st.id) as messages_count,
        (SELECT MAX(created_at) FROM support_messages WHERE ticket_id = st.id) as last_message_at
       FROM support_tickets st
       JOIN users u ON st.user_id = u.id
       LEFT JOIN user_profiles up ON u.id = up.user_id
       LEFT JOIN users assigned ON st.assigned_to = assigned.id
       LEFT JOIN user_profiles assigned_profile ON assigned.id = assigned_profile.user_id
       ${whereClause}
       ORDER BY st.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`, queryParams);
        const total = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(total / Number(per_page));
        res.json({
            success: true,
            data: result.rows,
            pagination: {
                total,
                page: Number(page),
                per_page: Number(per_page),
                total_pages: totalPages,
            },
        });
    }
    catch (error) {
        console.error("Error fetching support tickets:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
}
/**
 * Get ticket details with messages
 * GET /api/admin/crm/tickets/:ticketId
 */
async function getTicketDetails(req, res) {
    const { ticketId } = req.params;
    try {
        // Get ticket details
        const ticketResult = await postgres_1.default.query(`SELECT
        st.*,
        u.username,
        u.email as user_email,
        up.avatar_url as user_avatar,
        assigned.username as assigned_to_name,
        assigned_profile.avatar_url as assigned_to_avatar
       FROM support_tickets st
       JOIN users u ON st.user_id = u.id
       LEFT JOIN user_profiles up ON u.id = up.user_id
       LEFT JOIN users assigned ON st.assigned_to = assigned.id
       LEFT JOIN user_profiles assigned_profile ON assigned.id = assigned_profile.user_id
       WHERE st.id = $1`, [ticketId]);
        if (ticketResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: "Ticket not found" });
        }
        // Get messages
        const messagesResult = await postgres_1.default.query(`SELECT
        sm.*,
        u.username as sender_name,
        up.avatar_url as sender_avatar
       FROM support_messages sm
       JOIN users u ON sm.sender_id = u.id
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE sm.ticket_id = $1
       ORDER BY sm.created_at ASC`, [ticketId]);
        res.json({
            success: true,
            data: {
                ticket: ticketResult.rows[0],
                messages: messagesResult.rows,
            },
        });
    }
    catch (error) {
        console.error("Error fetching ticket details:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
}
/**
 * Create new support ticket
 * POST /api/admin/crm/tickets
 */
async function createSupportTicket(req, res) {
    var _a;
    const { user_id, department, category, sub_category, priority, subject, description, source = 'portal', language = 'en', } = req.body;
    const agentId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    try {
        const result = await postgres_1.default.query(`INSERT INTO support_tickets
       (user_id, department, category, sub_category, priority, status, subject, description, source, language, created_by)
       VALUES ($1, $2, $3, $4, $5, 'new', $6, $7, $8, $9, $10)
       RETURNING *`, [user_id, department, category, sub_category, priority, subject, description, source, language, agentId]);
        // Add to timeline
        await postgres_1.default.query(`INSERT INTO customer_timeline
       (user_id, event_type, event_category, event_data, performed_by)
       VALUES ($1, 'support_ticket', 'support', $2, $3)`, [user_id, JSON.stringify({ ticket_id: result.rows[0].id, ticket_number: result.rows[0].ticket_number, subject }), agentId]);
        res.json({ success: true, data: result.rows[0] });
    }
    catch (error) {
        console.error("Error creating support ticket:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
}
/**
 * Update ticket status
 * PATCH /api/admin/crm/tickets/:ticketId/status
 */
async function updateTicketStatus(req, res) {
    var _a;
    const { ticketId } = req.params;
    const { status } = req.body;
    const agentId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    try {
        const updateFields = ['status = $1', 'updated_at = NOW()', 'updated_by = $2'];
        const params = [status, agentId];
        let paramIndex = 3;
        if (status === 'resolved' || status === 'closed') {
            updateFields.push(`resolved_at = NOW()`);
            if (status === 'closed') {
                updateFields.push(`closed_at = NOW()`);
            }
        }
        const result = await postgres_1.default.query(`UPDATE support_tickets
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`, [...params, ticketId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: "Ticket not found" });
        }
        res.json({ success: true, data: result.rows[0] });
    }
    catch (error) {
        console.error("Error updating ticket status:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
}
/**
 * Add message to ticket
 * POST /api/admin/crm/tickets/:ticketId/messages
 */
async function addTicketMessage(req, res) {
    var _a;
    const { ticketId } = req.params;
    const { message, is_internal = false, attachments } = req.body;
    const agentId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    try {
        const result = await postgres_1.default.query(`INSERT INTO support_messages
       (ticket_id, sender_id, sender_type, message, message_type, is_internal, attachments)
       VALUES ($1, $2, 'agent', $3, 'text', $4, $5)
       RETURNING *`, [ticketId, agentId, message, is_internal, attachments || null]);
        // Update ticket's last_agent_reply_at
        await postgres_1.default.query(`UPDATE support_tickets
       SET last_agent_reply_at = NOW(), updated_at = NOW()
       WHERE id = $1`, [ticketId]);
        res.json({ success: true, data: result.rows[0] });
    }
    catch (error) {
        console.error("Error adding ticket message:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
}
/**
 * Assign ticket to agent
 * PATCH /api/admin/crm/tickets/:ticketId/assign
 */
async function assignTicket(req, res) {
    var _a;
    const { ticketId } = req.params;
    const { agent_id } = req.body;
    const agentId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    try {
        const result = await postgres_1.default.query(`UPDATE support_tickets
       SET assigned_to = $1, updated_at = NOW(), updated_by = $2
       WHERE id = $3
       RETURNING *`, [agent_id, agentId, ticketId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: "Ticket not found" });
        }
        res.json({ success: true, data: result.rows[0] });
    }
    catch (error) {
        console.error("Error assigning ticket:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
}
