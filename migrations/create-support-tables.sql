-- Create support categories table
CREATE TABLE IF NOT EXISTS support_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    auto_assign_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    response_template TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create support tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_for_user', 'waiting_for_admin', 'resolved', 'closed')),
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    admin_notes TEXT,
    resolution TEXT,
    tags TEXT[],
    attachments TEXT[], -- Array of file URLs
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create support ticket replies table
CREATE TABLE IF NOT EXISTS support_ticket_replies (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false,
    attachments TEXT[], -- Array of file URLs
    created_by VARCHAR(50) NOT NULL, -- 'user' or 'admin'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create admin notifications table
CREATE TABLE IF NOT EXISTS admin_notifications (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'announcement')),
    target_users VARCHAR(20) NOT NULL DEFAULT 'all' CHECK (target_users IN ('all', 'specific', 'group')),
    user_ids INTEGER[], -- Array of user IDs for specific targeting
    user_group VARCHAR(100), -- User group for group targeting
    scheduled_at TIMESTAMP,
    expires_at TIMESTAMP,
    is_push BOOLEAN DEFAULT false,
    is_email BOOLEAN DEFAULT false,
    is_in_app BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create support ticket audit logs table
CREATE TABLE IF NOT EXISTS support_ticket_audit_logs (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_support_categories_slug ON support_categories(slug);
CREATE INDEX IF NOT EXISTS idx_support_categories_active ON support_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_support_categories_sort_order ON support_categories(sort_order);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON support_tickets(category);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_support_tickets_updated_at ON support_tickets(updated_at);

CREATE INDEX IF NOT EXISTS idx_support_ticket_replies_ticket_id ON support_ticket_replies(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_replies_created_at ON support_ticket_replies(created_at);
CREATE INDEX IF NOT EXISTS idx_support_ticket_replies_created_by ON support_ticket_replies(created_by);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON admin_notifications(type);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_target_users ON admin_notifications(target_users);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_scheduled_at ON admin_notifications(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications(created_at);

CREATE INDEX IF NOT EXISTS idx_support_ticket_audit_logs_ticket_id ON support_ticket_audit_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_audit_logs_action ON support_ticket_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_support_ticket_audit_logs_created_at ON support_ticket_audit_logs(created_at);

-- Add comments for documentation
COMMENT ON TABLE support_categories IS 'Stores support ticket categories and their configuration';
COMMENT ON TABLE support_tickets IS 'Stores support tickets submitted by users';
COMMENT ON TABLE support_ticket_replies IS 'Stores replies to support tickets';
COMMENT ON TABLE admin_notifications IS 'Stores notifications created by admins';
COMMENT ON TABLE support_ticket_audit_logs IS 'Stores audit trail for support ticket changes';

COMMENT ON COLUMN support_categories.slug IS 'URL-friendly identifier for the category';
COMMENT ON COLUMN support_categories.auto_assign_to IS 'Admin user ID to automatically assign tickets to';
COMMENT ON COLUMN support_categories.response_template IS 'Template response for common issues in this category';

COMMENT ON COLUMN support_tickets.priority IS 'Ticket priority level (low, medium, high, urgent)';
COMMENT ON COLUMN support_tickets.status IS 'Current status of the ticket';
COMMENT ON COLUMN support_tickets.assigned_to IS 'Admin user assigned to handle this ticket';
COMMENT ON COLUMN support_tickets.admin_notes IS 'Internal notes visible only to admins';
COMMENT ON COLUMN support_tickets.resolution IS 'Final resolution of the ticket';
COMMENT ON COLUMN support_tickets.tags IS 'Array of tags for categorizing tickets';
COMMENT ON COLUMN support_tickets.attachments IS 'Array of file URLs attached to the ticket';

COMMENT ON COLUMN support_ticket_replies.is_internal IS 'Whether this reply is internal (not visible to user)';
COMMENT ON COLUMN support_ticket_replies.created_by IS 'Who created the reply (user or admin)';
COMMENT ON COLUMN support_ticket_replies.attachments IS 'Array of file URLs attached to the reply';

COMMENT ON COLUMN admin_notifications.target_users IS 'Target audience for the notification';
COMMENT ON COLUMN admin_notifications.user_ids IS 'Array of specific user IDs to target';
COMMENT ON COLUMN admin_notifications.user_group IS 'User group to target';
COMMENT ON COLUMN admin_notifications.scheduled_at IS 'When to send the notification (null for immediate)';
COMMENT ON COLUMN admin_notifications.expires_at IS 'When the notification expires';
COMMENT ON COLUMN admin_notifications.is_push IS 'Whether to send as push notification';
COMMENT ON COLUMN admin_notifications.is_email IS 'Whether to send as email';
COMMENT ON COLUMN admin_notifications.is_in_app IS 'Whether to show in-app notification';

COMMENT ON COLUMN support_ticket_audit_logs.action IS 'Action performed (create, update, assign, close, etc.)';
COMMENT ON COLUMN support_ticket_audit_logs.old_values IS 'Previous values before the action';
COMMENT ON COLUMN support_ticket_audit_logs.new_values IS 'New values after the action';

-- Insert default support categories
INSERT INTO support_categories (
    name, 
    description, 
    slug, 
    sort_order
) VALUES 
('Account Issues', 'Problems with account access, login, or registration', 'account_issues', 1),
('Payment Problems', 'Issues with deposits, withdrawals, or payment methods', 'payment_problems', 2),
('Game Issues', 'Problems with games, gameplay, or game features', 'game_issues', 3),
('Technical Support', 'Technical problems, bugs, or system issues', 'technical_support', 4),
('Bonus Questions', 'Questions about bonuses, promotions, or rewards', 'bonus_questions', 5),
('KYC Verification', 'Identity verification and document submission', 'kyc_verification', 6),
('General Inquiry', 'General questions and information requests', 'general_inquiry', 7),
('Complaints', 'Complaints and feedback', 'complaint', 8),
('Feature Request', 'Suggestions for new features or improvements', 'feature_request', 9),
('Other', 'Other issues not covered by other categories', 'other', 10) ON CONFLICT DO NOTHING;

-- Insert sample support tickets for testing
INSERT INTO support_tickets (
    user_id,
    category,
    subject,
    description,
    priority,
    status
) VALUES 
(1, 'account_issues', 'Cannot login to my account', 'I forgot my password and cannot reset it', 'medium', 'open'),
(2, 'payment_problems', 'Deposit not credited', 'I made a deposit but it has not been credited to my account', 'high', 'in_progress'),
(3, 'game_issues', 'Game keeps crashing', 'The slot game keeps crashing when I try to play', 'medium', 'waiting_for_user') ON CONFLICT DO NOTHING; 