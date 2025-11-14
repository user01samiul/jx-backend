-- Template System Migration
BEGIN;

-- Templates table
CREATE TABLE IF NOT EXISTS templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  type VARCHAR(20) NOT NULL CHECK (type IN ('admin', 'user', 'premium')),
  category VARCHAR(50) DEFAULT 'default',
  version VARCHAR(20) DEFAULT '1.0.0',
  author VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  is_premium BOOLEAN DEFAULT FALSE,
  price DECIMAL(10,2) DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Template configs table
CREATE TABLE IF NOT EXISTS template_configs (
  id SERIAL PRIMARY KEY,
  template_id INTEGER REFERENCES templates(id) ON DELETE CASCADE,
  config_key VARCHAR(100) NOT NULL,
  config_value JSONB NOT NULL,
  config_type VARCHAR(20) DEFAULT 'string',
  is_required BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(template_id, config_key)
);

-- Template features table
CREATE TABLE IF NOT EXISTS template_features (
  id SERIAL PRIMARY KEY,
  template_id INTEGER REFERENCES templates(id) ON DELETE CASCADE,
  feature_name VARCHAR(100) NOT NULL,
  feature_key VARCHAR(100) NOT NULL,
  feature_type VARCHAR(50) NOT NULL,
  feature_config JSONB NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  is_premium BOOLEAN DEFAULT FALSE,
  price DECIMAL(10,2) DEFAULT 0.00,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- User templates table
CREATE TABLE IF NOT EXISTS user_templates (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  template_id INTEGER REFERENCES templates(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  custom_config JSONB DEFAULT '{}',
  activated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, template_id)
);

-- User template features table
CREATE TABLE IF NOT EXISTS user_template_features (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  template_id INTEGER REFERENCES templates(id) ON DELETE CASCADE,
  feature_id INTEGER REFERENCES template_features(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT TRUE,
  custom_config JSONB DEFAULT '{}',
  purchased_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, template_id, feature_id)
);

-- Default templates table
CREATE TABLE IF NOT EXISTS default_templates (
  id SERIAL PRIMARY KEY,
  user_level_id INTEGER REFERENCES user_levels(id) ON DELETE CASCADE,
  template_id INTEGER REFERENCES templates(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_level_id, template_id)
);

-- Insert default templates
INSERT INTO templates (name, description, type, category, author, is_default, is_premium, price) VALUES
('Admin Dashboard Pro', 'Professional admin dashboard template', 'admin', 'dashboard', 'System', TRUE, FALSE, 0.00),
('User Gaming Interface', 'Modern gaming interface for users', 'user', 'gaming', 'System', TRUE, FALSE, 0.00),
('Premium Dark Theme', 'Premium dark theme with customization', 'user', 'premium', 'System', FALSE, TRUE, 29.99);

COMMIT; 