-- Insert sample template data
BEGIN;

-- Insert sample templates
INSERT INTO templates (name, description, type, category, version, author, is_active, is_default, is_premium, price, currency) VALUES
('Admin Dashboard Pro', 'Professional admin dashboard with advanced analytics and user management', 'admin', 'dashboard', '1.0.0', 'System', true, true, false, 0.00, 'USD'),
('User Gaming Interface', 'Modern gaming interface optimized for user experience', 'user', 'gaming', '1.0.0', 'System', true, true, false, 0.00, 'USD'),
('Premium Dark Theme', 'Premium dark theme with advanced customization options', 'user', 'premium', '1.0.0', 'System', true, false, true, 29.99, 'USD'),
('Gaming Pro Theme', 'Professional gaming theme with animations and effects', 'user', 'premium', '1.0.0', 'System', true, false, true, 49.99, 'USD'),
('Mobile Gaming Interface', 'Optimized interface for mobile gaming experience', 'user', 'mobile', '1.0.0', 'System', true, false, false, 19.99, 'USD');

-- Insert template configs for Admin Dashboard Pro
INSERT INTO template_configs (template_id, config_key, config_value, config_type, is_required) VALUES
(1, 'primary_color', '"#3B82F6"', 'string', true),
(1, 'secondary_color', '"#6B7280"', 'string', true),
(1, 'sidebar_width', '280', 'number', false),
(1, 'show_analytics', 'true', 'boolean', false),
(1, 'enable_dark_mode', 'true', 'boolean', false),
(1, 'refresh_interval', '30000', 'number', false);

-- Insert template configs for User Gaming Interface
INSERT INTO template_configs (template_id, config_key, config_value, config_type, is_required) VALUES
(2, 'primary_color', '"#10B981"', 'string', true),
(2, 'secondary_color', '"#F59E0B"', 'string', true),
(2, 'game_grid_columns', '4', 'number', false),
(2, 'show_game_animations', 'true', 'boolean', false),
(2, 'enable_sound_effects', 'true', 'boolean', false),
(2, 'auto_refresh_balance', 'true', 'boolean', false);

-- Insert template configs for Premium Dark Theme
INSERT INTO template_configs (template_id, config_key, config_value, config_type, is_required) VALUES
(3, 'primary_color', '"#6366F1"', 'string', true),
(3, 'secondary_color', '"#8B5CF6"', 'string', true),
(3, 'background_color', '"#1F2937"', 'string', true),
(3, 'surface_color', '"#374151"', 'string', true),
(3, 'text_primary', '"#F9FAFB"', 'string', true),
(3, 'text_secondary', '"#D1D5DB"', 'string', true);

-- Insert template features for Admin Dashboard Pro
INSERT INTO template_features (template_id, feature_name, feature_key, feature_type, feature_config, is_enabled, is_premium, price, sort_order) VALUES
(1, 'Advanced Analytics Dashboard', 'analytics_dashboard', 'widget', '{"widget_type": "analytics", "refresh_interval": 30000, "charts": ["revenue", "users", "games"]}', true, false, 0.00, 1),
(1, 'User Management Panel', 'user_management', 'widget', '{"widget_type": "user_management", "show_actions": true, "bulk_operations": true}', true, false, 0.00, 2),
(1, 'Real-time Notifications', 'real_time_notifications', 'widget', '{"widget_type": "notifications", "sound_enabled": true, "position": "top-right"}', true, false, 0.00, 3),
(1, 'Dark Mode Toggle', 'dark_mode', 'layout', '{"theme": "dark", "auto_switch": false, "persist_preference": true}', true, false, 0.00, 4),
(1, 'Custom Navigation Menu', 'custom_nav', 'navigation', '{"menu_items": [{"label": "Dashboard", "icon": "home", "url": "/dashboard"}, {"label": "Users", "icon": "users", "url": "/users"}, {"label": "Games", "icon": "gamepad", "url": "/games"}, {"label": "Analytics", "icon": "chart", "url": "/analytics"}]}', true, false, 0.00, 5);

-- Insert template features for User Gaming Interface
INSERT INTO template_features (template_id, feature_name, feature_key, feature_type, feature_config, is_enabled, is_premium, price, sort_order) VALUES
(2, 'Game Grid Layout', 'game_grid', 'layout', '{"grid_columns": 4, "show_filters": true, "show_search": true, "show_categories": true}', true, false, 0.00, 1),
(2, 'Favorite Games Widget', 'favorite_games', 'widget', '{"widget_type": "favorites", "max_items": 10, "show_quick_play": true}', true, false, 0.00, 2),
(2, 'Recent Games History', 'recent_games', 'widget', '{"widget_type": "history", "max_items": 5, "show_play_time": true}', true, false, 0.00, 3),
(2, 'Balance Display', 'balance_display', 'widget', '{"widget_type": "balance", "show_currency": true, "show_bonus": true, "refresh_interval": 10000}', true, false, 0.00, 4),
(2, 'Quick Actions Menu', 'quick_actions', 'navigation', '{"menu_items": [{"label": "Deposit", "icon": "plus", "action": "deposit"}, {"label": "Withdraw", "icon": "minus", "action": "withdraw"}, {"label": "Profile", "icon": "user", "action": "profile"}, {"label": "Support", "icon": "help", "action": "support"}]}', true, false, 0.00, 5);

-- Insert template features for Premium Dark Theme
INSERT INTO template_features (template_id, feature_name, feature_key, feature_type, feature_config, is_enabled, is_premium, price, sort_order) VALUES
(3, 'Advanced Color Customization', 'advanced_colors', 'color_scheme', '{"primary": "#6366F1", "secondary": "#8B5CF6", "accent": "#EC4899", "background": "#1F2937", "surface": "#374151", "text_primary": "#F9FAFB", "text_secondary": "#D1D5DB"}', true, true, 9.99, 1),
(3, 'Custom Animations', 'custom_animations', 'animation', '{"page_transitions": true, "hover_effects": true, "loading_animations": true, "smooth_scroll": true}', true, true, 14.99, 2),
(3, 'Premium Navigation', 'premium_nav', 'navigation', '{"menu_items": [{"label": "Home", "icon": "home", "url": "/"}, {"label": "Games", "icon": "gamepad", "url": "/games"}, {"label": "Tournaments", "icon": "trophy", "url": "/tournaments"}, {"label": "VIP", "icon": "crown", "url": "/vip"}, {"label": "Support", "icon": "help-circle", "url": "/support"}], "style": "modern", "show_badges": true}', true, true, 19.99, 3);

-- Insert template features for Gaming Pro Theme
INSERT INTO template_features (template_id, feature_name, feature_key, feature_type, feature_config, is_enabled, is_premium, price, sort_order) VALUES
(4, 'Gaming Animations', 'gaming_animations', 'animation', '{"particle_effects": true, "win_animations": true, "jackpot_effects": true, "confetti_on_win": true}', true, true, 24.99, 1),
(4, 'Live Chat Widget', 'live_chat', 'widget', '{"widget_type": "chat", "position": "bottom-right", "auto_open": false, "show_online_status": true}', true, true, 19.99, 2),
(4, 'Advanced Game Filters', 'advanced_filters', 'widget', '{"widget_type": "filters", "filter_types": ["provider", "category", "volatility", "rtp", "theme"], "show_advanced_options": true}', true, true, 14.99, 3);

-- Insert default template assignments for user levels
INSERT INTO default_templates (user_level_id, template_id, is_active) VALUES
(1, 2, true), -- Bronze level gets default user template
(2, 2, true), -- Silver level gets default user template
(3, 2, true), -- Gold level gets default user template
(4, 2, true), -- Platinum level gets default user template
(5, 2, true); -- Diamond level gets default user template

COMMIT; 