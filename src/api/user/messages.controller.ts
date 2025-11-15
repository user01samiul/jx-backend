// src/api/user/messages.controller.ts
import { Request, Response, NextFunction } from "express";
import {
  getUserMessagesService,
  markMessageAsReadService,
  getUnreadCountService
} from "../../services/user/messages.service";

/**
 * Get user messages with filtering and pagination
 */
export const getUserMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const filters = {
      type: req.query.type as string,
      read: req.query.read === 'true' ? true : req.query.read === 'false' ? false : undefined,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20
    };

    const result = await getUserMessagesService(userId, filters);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Mark a message as read
 */
export const markMessageAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const messageId = parseInt(req.params.message_id);

    if (isNaN(messageId)) {
      res.status(400).json({ success: false, message: "Invalid message ID" });
      return;
    }

    const result = await markMessageAsReadService(userId, messageId);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err: any) {
    if (err.message === 'Message not found or does not belong to user') {
      res.status(404).json({ success: false, message: err.message });
      return;
    }
    next(err);
  }
};

/**
 * Get unread message count
 */
export const getUnreadCount = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const count = await getUnreadCountService(userId);

    res.status(200).json({
      success: true,
      data: {
        count
      }
    });
  } catch (err) {
    next(err);
  }
};
