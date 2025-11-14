export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  is_read: boolean;
  is_important: boolean;
  action_url?: string;
  action_text?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: number;
  metadata?: Record<string, any>;
}

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'promotion';
export type NotificationCategory = 'general' | 'game' | 'payment' | 'promotion' | 'system' | 'security' | 'bonus';

export interface CreateNotificationInput {
  user_id: number;
  title: string;
  message: string;
  type?: NotificationType;
  category?: NotificationCategory;
  is_important?: boolean;
  action_url?: string;
  action_text?: string;
  expires_at?: string;
  created_by?: number;
  metadata?: Record<string, any>;
}

export interface UpdateNotificationInput {
  title?: string;
  message?: string;
  type?: NotificationType;
  category?: NotificationCategory;
  is_important?: boolean;
  action_url?: string;
  action_text?: string;
  expires_at?: string;
  metadata?: Record<string, any>;
}

export interface NotificationFilters {
  type?: NotificationType;
  category?: NotificationCategory;
  is_read?: boolean;
  is_important?: boolean;
  limit?: number;
  offset?: number;
}

export interface NotificationStats {
  total: number;
  unread: number;
  important: number;
  by_type: Record<NotificationType, number>;
  by_category: Record<NotificationCategory, number>;
}

export interface BulkCreateNotificationInput {
  user_ids: number[];
  title: string;
  message: string;
  type?: NotificationType;
  category?: NotificationCategory;
  is_important?: boolean;
  action_url?: string;
  action_text?: string;
  expires_at?: string;
  created_by?: number;
  metadata?: Record<string, any>;
} 