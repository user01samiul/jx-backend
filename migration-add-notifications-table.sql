-- Migration: Add notifications table
-- Date: 2024-12-19
-- Description: Create notifications table for user notification system

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'info', -- info, success, warning, error, promotion
    category VARCHAR(50) NOT NULL DEFAULT 'general', -- general, game, payment, promotion, system
    is_read BOOLEAN NOT NULL DEFAULT false,
    is_important BOOLEAN NOT NULL DEFAULT false,
    action_url VARCHAR(500), -- URL for action button if applicable
    action_text VARCHAR(100), -- Text for action button if applicable
    expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration date
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER, -- Who created the notification (admin user ID or system)
    metadata JSONB, -- Additional data in JSON format
    
    -- Foreign key constraints
    CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT notifications_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Check constraints
    CONSTRAINT notifications_type_check CHECK (type IN ('info', 'success', 'warning', 'error', 'promotion')),
    CONSTRAINT notifications_category_check CHECK (category IN ('general', 'game', 'payment', 'promotion', 'system', 'security', 'bonus'))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications(expires_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_updated_at();

-- Insert some sample notifications for testing
INSERT INTO notifications (user_id, title, message, type, category, is_important, created_by) VALUES
(1, 'Welcome to JackpotX!', 'Thank you for joining our platform. Enjoy your gaming experience!', 'success', 'general', false, 1),
(1, 'New Game Available', 'Check out our latest slot game "Mega Fortune" with amazing jackpots!', 'info', 'game', false, 1),
(1, 'Security Alert', 'We detected a login from a new device. If this was not you, please change your password.', 'warning', 'security', true, 1),
(1, 'Bonus Available', 'You have a 100% deposit bonus waiting! Click here to claim it.', 'promotion', 'bonus', false, 1);

-- Add comment to table
COMMENT ON TABLE notifications IS 'User notifications table for storing all types of user notifications';
COMMENT ON COLUMN notifications.type IS 'Type of notification: info, success, warning, error, promotion';
COMMENT ON COLUMN notifications.category IS 'Category of notification: general, game, payment, promotion, system, security, bonus';
COMMENT ON COLUMN notifications.metadata IS 'Additional JSON data for notification-specific information'; 