-- =====================================================
-- IP TRACKING & SECURITY SYSTEM
-- =====================================================

DROP TABLE IF EXISTS player_ip_history CASCADE;

-- =====================================================
-- PLAYER IP HISTORY TABLE
-- =====================================================
CREATE TABLE player_ip_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ip_address INET NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN (
        'LOGIN', 'REGISTER', 'LOGOUT', 'DEPOSIT', 'WITHDRAWAL', 
        'BET_PLACED', 'GAME_LAUNCHED', 'PASSWORD_CHANGE', 'PROFILE_UPDATE',
        'KYC_UPLOAD', 'BONUS_CLAIM', 'FAILED_LOGIN', 'SUSPICIOUS_ACTIVITY'
    )),
    user_agent TEXT,
    -- GeoIP data
    country_code VARCHAR(2),
    country_name VARCHAR(100),
    city VARCHAR(100),
    region VARCHAR(100),
    latitude NUMERIC(10, 6),
    longitude NUMERIC(10, 6),
    -- Security flags
    is_vpn BOOLEAN DEFAULT FALSE,
    is_proxy BOOLEAN DEFAULT FALSE,
    is_tor BOOLEAN DEFAULT FALSE,
    is_hosting BOOLEAN DEFAULT FALSE,
    -- Risk assessment
    risk_score INTEGER DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
    risk_level VARCHAR(20) CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    fraud_flags TEXT[], -- Array of fraud indicators
    -- Session tracking
    session_id TEXT,
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_player_ip_history_user_id ON player_ip_history(user_id);
CREATE INDEX idx_player_ip_history_ip_address ON player_ip_history(ip_address);
CREATE INDEX idx_player_ip_history_action ON player_ip_history(action);
CREATE INDEX idx_player_ip_history_created_at ON player_ip_history(created_at);
CREATE INDEX idx_player_ip_history_risk_level ON player_ip_history(risk_level);
CREATE INDEX idx_player_ip_history_is_vpn ON player_ip_history(is_vpn);
CREATE INDEX idx_player_ip_history_country_code ON player_ip_history(country_code);

-- =====================================================
-- SUSPICIOUS IP ADDRESSES
-- =====================================================
CREATE TABLE suspicious_ip_addresses (
    id SERIAL PRIMARY KEY,
    ip_address INET UNIQUE NOT NULL,
    reason TEXT NOT NULL,
    is_blocked BOOLEAN DEFAULT FALSE,
    first_flagged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    flagged_count INTEGER DEFAULT 1,
    flagged_by INTEGER REFERENCES users(id), -- Admin who flagged it
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_suspicious_ip_addresses_ip ON suspicious_ip_addresses(ip_address);
CREATE INDEX idx_suspicious_ip_addresses_is_blocked ON suspicious_ip_addresses(is_blocked);

-- =====================================================
-- IP WHITELIST (Trusted IPs)
-- =====================================================
CREATE TABLE ip_whitelist (
    id SERIAL PRIMARY KEY,
    ip_address INET UNIQUE NOT NULL,
    description TEXT,
    added_by INTEGER REFERENCES users(id),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ip_whitelist_ip ON ip_whitelist(ip_address);
CREATE INDEX idx_ip_whitelist_expires_at ON ip_whitelist(expires_at);

-- =====================================================
-- FUNCTION: Auto-calculate risk score
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_ip_risk_score(
    p_is_vpn BOOLEAN,
    p_is_proxy BOOLEAN,
    p_is_tor BOOLEAN,
    p_is_hosting BOOLEAN,
    p_failed_login_count INTEGER DEFAULT 0
) RETURNS INTEGER AS $$
DECLARE
    v_score INTEGER := 0;
BEGIN
    -- Base risk factors
    IF p_is_vpn THEN v_score := v_score + 30; END IF;
    IF p_is_proxy THEN v_score := v_score + 25; END IF;
    IF p_is_tor THEN v_score := v_score + 50; END IF;
    IF p_is_hosting THEN v_score := v_score + 40; END IF;
    
    -- Failed login attempts
    v_score := v_score + (p_failed_login_count * 10);
    
    -- Cap at 100
    IF v_score > 100 THEN v_score := 100; END IF;
    
    RETURN v_score;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- FUNCTION: Get risk level from score
-- =====================================================
CREATE OR REPLACE FUNCTION get_risk_level(p_score INTEGER)
RETURNS VARCHAR AS $$
BEGIN
    IF p_score >= 75 THEN RETURN 'CRITICAL';
    ELSIF p_score >= 50 THEN RETURN 'HIGH';
    ELSIF p_score >= 25 THEN RETURN 'MEDIUM';
    ELSE RETURN 'LOW';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- TRIGGER: Auto-flag suspicious IPs
-- =====================================================
CREATE OR REPLACE FUNCTION auto_flag_suspicious_ip()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.risk_score >= 75 OR NEW.action = 'SUSPICIOUS_ACTIVITY' THEN
        INSERT INTO suspicious_ip_addresses (ip_address, reason, flagged_count)
        VALUES (
            NEW.ip_address,
            CONCAT('Auto-flagged: ', NEW.action, ' with risk score ', NEW.risk_score),
            1
        )
        ON CONFLICT (ip_address) DO UPDATE
        SET flagged_count = suspicious_ip_addresses.flagged_count + 1,
            last_seen_at = CURRENT_TIMESTAMP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_flag_suspicious_ip
AFTER INSERT ON player_ip_history
FOR EACH ROW EXECUTE FUNCTION auto_flag_suspicious_ip();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE player_ip_history IS 'Complete IP address tracking for security and fraud detection';
COMMENT ON TABLE suspicious_ip_addresses IS 'Flagged suspicious IP addresses';
COMMENT ON TABLE ip_whitelist IS 'Trusted IP addresses (bypass security checks)';

COMMENT ON COLUMN player_ip_history.risk_score IS 'Calculated risk score (0-100)';
COMMENT ON COLUMN player_ip_history.fraud_flags IS 'Array of fraud indicators (e.g., ["multiple_accounts", "rapid_deposits"])';
