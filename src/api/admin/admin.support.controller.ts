import { Request, Response } from "express";
import { AdminSupportService } from "../../services/admin/support.service";
import { 
  UpdateSupportTicketInput,
  SupportTicketFiltersInput,
  AddTicketReplyInput,
  CreateSupportCategoryInput,
  CreateNotificationInput,
  SupportStatisticsFiltersInput
} from "./admin.support.schema";

// Get support tickets
export const getSupportTickets = async (req: Request, res: Response) => {
  try {
    const filters: SupportTicketFiltersInput = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      search: req.query.search as string,
      status: req.query.status as any,
      priority: req.query.priority as any,
      category: req.query.category as any,
      user_id: req.query.user_id ? parseInt(req.query.user_id as string) : undefined,
      assigned_to: req.query.assigned_to ? parseInt(req.query.assigned_to as string) : undefined,
      start_date: req.query.start_date as string,
      end_date: req.query.end_date as string,
      unassigned_only: req.query.unassigned_only === 'true',
      urgent_only: req.query.urgent_only === 'true'
    };
    
    const result = await AdminSupportService.getSupportTickets(filters);
    
    res.status(200).json({
      success: true,
      data: result.tickets,
      pagination: result.pagination
    });
  } catch (error: any) {
    console.error("Error fetching support tickets:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch support tickets"
    });
  }
};

// Get support ticket by ID
export const getSupportTicketById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket ID"
      });
    }
    
    const ticket = await AdminSupportService.getSupportTicketById(id);
    
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
  } catch (error: any) {
    console.error("Error fetching support ticket:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch support ticket"
    });
  }
};

// Update support ticket
export const updateSupportTicket = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket ID"
      });
    }
    
    const data: UpdateSupportTicketInput = { ...req.body, id };
    const ticket = await AdminSupportService.updateSupportTicket(id, data);
    
    res.status(200).json({
      success: true,
      message: "Support ticket updated successfully",
      data: ticket
    });
  } catch (error: any) {
    console.error("Error updating support ticket:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update support ticket"
    });
  }
};

// Add reply to ticket
export const addTicketReply = async (req: Request, res: Response) => {
  try {
    const data: AddTicketReplyInput = {
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
    
    const reply = await AdminSupportService.addTicketReply(data);
    
    res.status(201).json({
      success: true,
      message: "Reply added successfully",
      data: reply
    });
  } catch (error: any) {
    console.error("Error adding ticket reply:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to add ticket reply"
    });
  }
};

// Get support categories
export const getSupportCategories = async (req: Request, res: Response) => {
  try {
    const categories = await AdminSupportService.getSupportCategories();
    
    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error: any) {
    console.error("Error fetching support categories:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch support categories"
    });
  }
};

// Create support category
export const createSupportCategory = async (req: Request, res: Response) => {
  try {
    const data: CreateSupportCategoryInput = req.body;
    const category = await AdminSupportService.createSupportCategory(data);
    
    res.status(201).json({
      success: true,
      message: "Support category created successfully",
      data: category
    });
  } catch (error: any) {
    console.error("Error creating support category:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create support category"
    });
  }
};

// Create notification
export const createNotification = async (req: Request, res: Response) => {
  try {
    const data: CreateNotificationInput = req.body;
    const notification = await AdminSupportService.createNotification(data);
    
    res.status(201).json({
      success: true,
      message: "Notification created successfully",
      data: notification
    });
  } catch (error: any) {
    console.error("Error creating notification:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create notification"
    });
  }
};

// Get support statistics
export const getSupportStatistics = async (req: Request, res: Response) => {
  try {
    const filters: SupportStatisticsFiltersInput = {
      start_date: req.query.start_date as string,
      end_date: req.query.end_date as string,
      group_by: (req.query.group_by as any) || 'day'
    };
    
    if (!filters.start_date || !filters.end_date) {
      return res.status(400).json({
        success: false,
        message: "Start date and end date are required"
      });
    }
    
    const statistics = await AdminSupportService.getSupportStatistics(filters);
    
    res.status(200).json({
      success: true,
      data: statistics
    });
  } catch (error: any) {
    console.error("Error fetching support statistics:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch support statistics"
    });
  }
}; 