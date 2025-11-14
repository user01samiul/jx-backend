-- Create admin_activities table for logging admin actions
CREATE TABLE IF NOT EXISTS admin_activities (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_activities_admin_id ON admin_activities(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activities_action ON admin_activities(action);
CREATE INDEX IF NOT EXISTS idx_admin_activities_created_at ON admin_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_activities_admin_action ON admin_activities(admin_id, action);

-- Add comments for documentation
COMMENT ON TABLE admin_activities IS 'Logs all admin activities for audit purposes';
COMMENT ON COLUMN admin_activities.admin_id IS 'ID of the admin user who performed the action';
COMMENT ON COLUMN admin_activities.action IS 'Type of action performed (e.g., user_created, module_updated)';
COMMENT ON COLUMN admin_activities.details IS 'JSON object containing action-specific details';
COMMENT ON COLUMN admin_activities.ip_address IS 'IP address of the admin when action was performed';
COMMENT ON COLUMN admin_activities.user_agent IS 'User agent string of the admin browser';
COMMENT ON COLUMN admin_activities.created_at IS 'Timestamp when the action was performed'; 