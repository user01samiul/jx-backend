"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupportStatistics = exports.createNotification = exports.createSupportCategory = exports.getSupportCategories = exports.addTicketReply = exports.updateSupportTicket = exports.getSupportTicketById = exports.getSupportTickets = void 0;
const support_service_1 = require("../../services/admin/support.service");
// Get support tickets
const getSupportTickets = async (req, res) => {
    try {
        const filters = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20,
            search: req.query.search,
            status: req.query.status,
            priority: req.query.priority,
            category: req.query.category,
            user_id: req.query.user_id ? parseInt(req.query.user_id) : undefined,
            assigned_to: req.query.assigned_to ? parseInt(req.query.assigned_to) : undefined,
            start_date: req.query.start_date,
            end_date: req.query.end_date,
            unassigned_only: req.query.unassigned_only === 'true',
            urgent_only: req.query.urgent_only === 'true'
        };
        const result = await support_service_1.AdminSupportService.getSupportTickets(filters);
        res.status(200).json({
            success: true,
            data: result.tickets,
            pagination: result.pagination
        });
    }
    catch (error) {
        console.error("Error fetching support tickets:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch support tickets"
        });
    }
};
exports.getSupportTickets = getSupportTickets;
// Get support ticket by ID
const getSupportTicketById = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid ticket ID"
            });
        }
        const ticket = await support_service_1.AdminSupportService.getSupportTicketById(id);
        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: "Support ticket not found"
            });
        }
        res.status(200).json({
            success: true,
            data: ticket
        });
    }
    catch (error) {
        console.error("Error fetching support ticket:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch support ticket"
        });
    }
};
exports.getSupportTicketById = getSupportTicketById;
// Update support ticket
const updateSupportTicket = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid ticket ID"
            });
        }
        const data = { ...req.body, id };
        const ticket = await support_service_1.AdminSupportService.updateSupportTicket(id, data);
        res.status(200).json({
            success: true,
            message: "Support ticket updated successfully",
            data: ticket
        });
    }
    catch (error) {
        console.error("Error updating support ticket:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to update support ticket"
        });
    }
};
exports.updateSupportTicket = updateSupportTicket;
// Add reply to ticket
const addTicketReply = async (req, res) => {
    try {
        const data = {
            ticket_id: parseInt(req.params.id),
            message: req.body.message,
            is_internal: req.body.is_internal || false,
            attachments: req.body.attachments,
            notify_user: req.body.notify_user !== false
        };
        if (isNaN(data.ticket_id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid ticket ID"
            });
        }
        const reply = await support_service_1.AdminSupportService.addTicketReply(data);
        res.status(201).json({
            success: true,
            message: "Reply added successfully",
            data: reply
        });
    }
    catch (error) {
        console.error("Error adding ticket reply:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to add ticket reply"
        });
    }
};
exports.addTicketReply = addTicketReply;
// Get support categories
const getSupportCategories = async (req, res) => {
    try {
        const categories = await support_service_1.AdminSupportService.getSupportCategories();
        res.status(200).json({
            success: true,
            data: categories
        });
    }
    catch (error) {
        console.error("Error fetching support categories:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch support categories"
        });
    }
};
exports.getSupportCategories = getSupportCategories;
// Create support category
const createSupportCategory = async (req, res) => {
    try {
        const data = req.body;
        const category = await support_service_1.AdminSupportService.createSupportCategory(data);
        res.status(201).json({
            success: true,
            message: "Support category created successfully",
            data: category
        });
    }
    catch (error) {
        console.error("Error creating support category:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to create support category"
        });
    }
};
exports.createSupportCategory = createSupportCategory;
// Create notification
const createNotification = async (req, res) => {
    try {
        const data = req.body;
        const notification = await support_service_1.AdminSupportService.createNotification(data);
        res.status(201).json({
            success: true,
            message: "Notification created successfully",
            data: notification
        });
    }
    catch (error) {
        console.error("Error creating notification:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to create notification"
        });
    }
};
exports.createNotification = createNotification;
// Get support statistics
const getSupportStatistics = async (req, res) => {
    try {
        const filters = {
            start_date: req.query.start_date,
            end_date: req.query.end_date,
            group_by: req.query.group_by || 'day'
        };
        if (!filters.start_date || !filters.end_date) {
            return res.status(400).json({
                success: false,
                message: "Start date and end date are required"
            });
        }
        const statistics = await support_service_1.AdminSupportService.getSupportStatistics(filters);
        res.status(200).json({
            success: true,
            data: statistics
        });
    }
    catch (error) {
        console.error("Error fetching support statistics:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch support statistics"
        });
    }
};
exports.getSupportStatistics = getSupportStatistics;
