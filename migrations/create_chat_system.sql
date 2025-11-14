-- ============================================================================
-- LIVE CHAT SYSTEM - Database Schema
-- Created: 2025-11-06
-- Purpose: Real-time chat support between players and agents
-- ============================================================================

-- Chat Sessions (represents a conversation between player and agent)
CREATE TABLE IF NOT EXISTS chat_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_agent_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'waiting',
  -- Status: waiting, active, closed, missed
  priority VARCHAR(20) DEFAULT 'normal',
  -- Priority: low, normal, high, urgent
  subject VARCHAR(255),
  -- Optional subject/category
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP,
  -- When agent accepted the chat
  closed_at TIMESTAMP,
  closed_by INTEGER REFERENCES users(id),
  -- Who closed the chat (user or agent)
  close_reason VARCHAR(100),
  -- auto_timeout, resolved, user_left, agent_ended
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  -- Player rating after chat ends
  feedback TEXT,
  -- Player feedback text
  first_response_time INTEGER,
  -- Seconds until first agent response
  avg_response_time INTEGER,
  -- Average agent response time in seconds
  total_messages INTEGER DEFAULT 0,
  wait_time INTEGER,
  -- Time in queue before agent accepted (seconds)
  tags TEXT[],
  -- Array of tags for categorization
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) NOT NULL,
  -- 'player' or 'agent'
  message_type VARCHAR(20) DEFAULT 'text',
  -- text, file, image, system
  content TEXT,
  -- Message content
  attachments JSONB,
  -- [{url, name, size, type}]
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMP,
  parent_message_id INTEGER REFERENCES chat_messages(id),
  -- For threading/replies
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chat Agents (agent availability and settings)
CREATE TABLE IF NOT EXISTS chat_agents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'offline',
  -- online, away, busy, offline
  max_concurrent_chats INTEGER DEFAULT 5,
  current_chat_count INTEGER DEFAULT 0,
  auto_accept BOOLEAN DEFAULT FALSE,
  -- Auto-accept chats when available
  specializations TEXT[],
  -- ['vip', 'payments', 'technical', 'kyc']
  languages TEXT[] DEFAULT ARRAY['en'],
  last_active_at TIMESTAMP,
  total_chats_handled INTEGER DEFAULT 0,
  avg_rating DECIMAL(3, 2),
  -- Average player rating
  avg_response_time INTEGER,
  -- Average response time in seconds
  settings JSONB DEFAULT '{}',
  -- Agent preferences
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Canned Responses (quick replies for agents)
CREATE TABLE IF NOT EXISTS chat_canned_responses (
  id SERIAL PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  shortcut VARCHAR(50) UNIQUE,
  -- e.g., /welcome, /deposit
  content TEXT NOT NULL,
  category VARCHAR(50),
  -- welcome, payment, kyc, technical, vip
  language VARCHAR(10) DEFAULT 'en',
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chat Queue (tracks waiting players)
CREATE TABLE IF NOT EXISTS chat_queue (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL UNIQUE REFERENCES chat_sessions(id) ON DELETE CASCADE,
  priority_score INTEGER DEFAULT 0,
  -- Higher = more priority (VIP, long wait, etc)
  entered_queue_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  estimated_wait_time INTEGER,
  -- Estimated wait in seconds
  position INTEGER
);

-- Chat Typing Indicators (real-time typing status)
CREATE TABLE IF NOT EXISTS chat_typing_indicators (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_typing BOOLEAN DEFAULT TRUE,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP + INTERVAL '10 seconds'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_agent_id ON chat_sessions(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_started_at ON chat_sessions(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

CREATE INDEX IF NOT EXISTS idx_chat_agents_user_id ON chat_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_agents_status ON chat_agents(status);

CREATE INDEX IF NOT EXISTS idx_chat_queue_priority ON chat_queue(priority_score DESC, entered_queue_at ASC);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_chat_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_updated_at();

CREATE TRIGGER update_chat_agents_updated_at
  BEFORE UPDATE ON chat_agents
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_updated_at();

-- Views for analytics
CREATE OR REPLACE VIEW chat_agent_stats AS
SELECT
  ca.user_id,
  u.username,
  ca.status,
  ca.current_chat_count,
  ca.max_concurrent_chats,
  ca.total_chats_handled,
  ca.avg_rating,
  ca.avg_response_time,
  COUNT(cs.id) FILTER (WHERE cs.status = 'active') as active_chats,
  COUNT(cs.id) FILTER (WHERE cs.started_at > NOW() - INTERVAL '24 hours') as chats_today,
  AVG(cs.rating) FILTER (WHERE cs.started_at > NOW() - INTERVAL '7 days') as rating_last_7days
FROM chat_agents ca
JOIN users u ON ca.user_id = u.id
LEFT JOIN chat_sessions cs ON cs.assigned_agent_id = ca.user_id
GROUP BY ca.user_id, u.username, ca.status, ca.current_chat_count,
         ca.max_concurrent_chats, ca.total_chats_handled, ca.avg_rating, ca.avg_response_time;

-- Insert default canned responses
INSERT INTO chat_canned_responses (title, shortcut, content, category, language) VALUES
('Welcome Message', '/welcome', 'Hello! Thank you for contacting JackpotX support. How can I assist you today?', 'welcome', 'en'),
('Deposit Help', '/deposit', 'I can help you with your deposit. Which payment method would you like to use?', 'payment', 'en'),
('Withdrawal Status', '/withdrawal', 'Let me check the status of your withdrawal. One moment please...', 'payment', 'en'),
('KYC Verification', '/kyc', 'To verify your account, please upload a valid ID and proof of address in your account settings.', 'kyc', 'en'),
('VIP Info', '/vip', 'Our VIP program offers exclusive benefits including higher cashback, personal account manager, and special bonuses!', 'vip', 'en'),
('Technical Issue', '/tech', 'I understand you''re experiencing technical difficulties. Can you please describe the issue in detail?', 'technical', 'en'),
('Thank You', '/thanks', 'Thank you for contacting us! Is there anything else I can help you with today?', 'welcome', 'en'),
('Goodbye', '/bye', 'Thank you for chatting with us! Have a great day and good luck! 🎰', 'welcome', 'en')
ON CONFLICT (shortcut) DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Live Chat System database schema created successfully!';
  RAISE NOTICE '📊 Tables created: chat_sessions, chat_messages, chat_agents, chat_canned_responses, chat_queue, chat_typing_indicators';
  RAISE NOTICE '🚀 Ready to implement WebSocket server and APIs!';
END $$;
