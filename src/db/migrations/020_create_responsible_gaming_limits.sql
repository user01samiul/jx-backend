-- =====================================================
-- RESPONSIBLE GAMING - DEPOSIT LIMITS SYSTEM
-- Compliance: UKGC, MGA, Curacao, and other jurisdictions
-- =====================================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS deposit_limit_history CASCADE;
DROP TABLE IF EXISTS deposit_limits CASCADE;
DROP TABLE IF EXISTS loss_limits CASCADE;
DROP TABLE IF EXISTS session_limits CASCADE;
DROP TABLE IF EXISTS wager_limits CASCADE;
DROP TABLE IF EXISTS self_exclusions CASCADE;

-- =====================================================
-- DEPOSIT LIMITS TABLE
-- =====================================================
CREATE TABLE deposit_limits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    limit_type VARCHAR(20) NOT NULL CHECK (limit_type IN ('DAILY', 'WEEKLY', 'MONTHLY')),
    amount NUMERIC(20, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    spent_amount NUMERIC(20, 2) NOT NULL DEFAULT 0,
    remaining_amount NUMERIC(20, 2) GENERATED ALWAYS AS (amount - spent_amount) STORED,
    percentage_used NUMERIC(5, 2) GENERATED ALWAYS AS (
        CASE
            WHEN amount > 0 THEN (spent_amount / amount * 100)
            ELSE 0
        END
    ) STORED,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PENDING', 'EXPIRED', 'CANCELLED')),
    -- Immediate decrease, delayed increase (compliance requirement)
    is_increase BOOLEAN NOT NULL DEFAULT FALSE,
    pending_amount NUMERIC(20, 2),
    pending_effective_date TIMESTAMP WITH TIME ZONE,
    -- Period tracking
    period_start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    next_reset_date TIMESTAMP WITH TIME ZONE NOT NULL,
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER DEFAULT 1,
    -- Ensure one active limit per type per user
    UNIQUE (user_id, limit_type, status) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_deposit_limits_user_id ON deposit_limits(user_id);
CREATE INDEX idx_deposit_limits_status ON deposit_limits(status);
CREATE INDEX idx_deposit_limits_type ON deposit_limits(limit_type);
CREATE INDEX idx_deposit_limits_next_reset ON deposit_limits(next_reset_date);
CREATE INDEX idx_deposit_limits_pending ON deposit_limits(pending_effective_date) WHERE pending_effective_date IS NOT NULL;

-- =====================================================
-- DEPOSIT LIMIT HISTORY
-- =====================================================
CREATE TABLE deposit_limit_history (
    id SERIAL PRIMARY KEY,
    deposit_limit_id INTEGER NOT NULL REFERENCES deposit_limits(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL CHECK (action IN ('CREATED', 'INCREASED', 'DECREASED', 'RESET', 'EXPIRED', 'CANCELLED', 'SPENT')),
    old_amount NUMERIC(20, 2),
    new_amount NUMERIC(20, 2),
    spent_amount NUMERIC(20, 2),
    currency VARCHAR(3) NOT NULL,
    reason TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER DEFAULT 1
);

CREATE INDEX idx_deposit_limit_history_user_id ON deposit_limit_history(user_id);
CREATE INDEX idx_deposit_limit_history_limit_id ON deposit_limit_history(deposit_limit_id);
CREATE INDEX idx_deposit_limit_history_action ON deposit_limit_history(action);
CREATE INDEX idx_deposit_limit_history_created_at ON deposit_limit_history(created_at);

-- =====================================================
-- LOSS LIMITS TABLE
-- =====================================================
CREATE TABLE loss_limits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    limit_type VARCHAR(20) NOT NULL CHECK (limit_type IN ('DAILY', 'WEEKLY', 'MONTHLY')),
    amount NUMERIC(20, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    current_loss NUMERIC(20, 2) NOT NULL DEFAULT 0,
    remaining_amount NUMERIC(20, 2) GENERATED ALWAYS AS (amount - current_loss) STORED,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PENDING', 'EXPIRED', 'CANCELLED')),
    is_increase BOOLEAN NOT NULL DEFAULT FALSE,
    pending_amount NUMERIC(20, 2),
    pending_effective_date TIMESTAMP WITH TIME ZONE,
    period_start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    next_reset_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER DEFAULT 1,
    UNIQUE (user_id, limit_type, status) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_loss_limits_user_id ON loss_limits(user_id);
CREATE INDEX idx_loss_limits_status ON loss_limits(status);
CREATE INDEX idx_loss_limits_next_reset ON loss_limits(next_reset_date);

-- =====================================================
-- SESSION LIMITS TABLE (Time & Loss based)
-- =====================================================
CREATE TABLE session_limits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Session duration limit (in minutes)
    max_session_duration INTEGER CHECK (max_session_duration > 0),
    -- Session loss limit
    max_session_loss NUMERIC(20, 2) CHECK (max_session_loss > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    -- Alert thresholds (percentage)
    alert_at_percentage INTEGER DEFAULT 80 CHECK (alert_at_percentage BETWEEN 0 AND 100),
    -- Current session tracking
    current_session_id INTEGER,
    session_start_time TIMESTAMP WITH TIME ZONE,
    session_duration_minutes INTEGER DEFAULT 0,
    session_loss_amount NUMERIC(20, 2) DEFAULT 0,
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER DEFAULT 1,
    UNIQUE (user_id)
);

CREATE INDEX idx_session_limits_user_id ON session_limits(user_id);
CREATE INDEX idx_session_limits_status ON session_limits(status);

-- =====================================================
-- WAGER LIMITS TABLE
-- =====================================================
CREATE TABLE wager_limits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    limit_type VARCHAR(20) NOT NULL CHECK (limit_type IN ('DAILY', 'WEEKLY', 'MONTHLY')),
    amount NUMERIC(20, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    wagered_amount NUMERIC(20, 2) NOT NULL DEFAULT 0,
    remaining_amount NUMERIC(20, 2) GENERATED ALWAYS AS (amount - wagered_amount) STORED,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PENDING', 'EXPIRED', 'CANCELLED')),
    period_start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    next_reset_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER DEFAULT 1,
    UNIQUE (user_id, limit_type, status) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_wager_limits_user_id ON wager_limits(user_id);
CREATE INDEX idx_wager_limits_status ON wager_limits(status);
CREATE INDEX idx_wager_limits_next_reset ON wager_limits(next_reset_date);

-- =====================================================
-- SELF EXCLUSIONS TABLE
-- =====================================================
CREATE TABLE self_exclusions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exclusion_type VARCHAR(50) NOT NULL CHECK (exclusion_type IN (
        'TEMPORARY', 'PERMANENT', 'TIMEOUT', 'COOLING_OFF'
    )),
    -- Duration options: 1d, 3d, 7d, 14d, 30d, 60d, 90d, 180d, 365d, PERMANENT
    duration VARCHAR(20) NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP WITH TIME ZONE,
    -- Restrictions
    can_login BOOLEAN NOT NULL DEFAULT FALSE,
    can_deposit BOOLEAN NOT NULL DEFAULT FALSE,
    can_withdraw BOOLEAN NOT NULL DEFAULT TRUE, -- Usually can still withdraw
    can_play BOOLEAN NOT NULL DEFAULT FALSE,
    can_receive_marketing BOOLEAN NOT NULL DEFAULT FALSE,
    -- Reason and notes
    reason TEXT NOT NULL,
    notes TEXT,
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'REVOKED')),
    -- Revocation (only for certain types and with cooling period)
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by INTEGER REFERENCES users(id),
    revocation_reason TEXT,
    -- Early end prevention (compliance - cannot end before agreed period)
    earliest_revocation_date TIMESTAMP WITH TIME ZONE,
    -- IP and user agent for audit
    ip_address INET,
    user_agent TEXT,
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER DEFAULT 1
);

CREATE INDEX idx_self_exclusions_user_id ON self_exclusions(user_id);
CREATE INDEX idx_self_exclusions_status ON self_exclusions(status);
CREATE INDEX idx_self_exclusions_end_date ON self_exclusions(end_date);
CREATE INDEX idx_self_exclusions_type ON self_exclusions(exclusion_type);

-- =====================================================
-- REALITY CHECK TABLE (Session reminders)
-- =====================================================
CREATE TABLE reality_checks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Check interval in minutes
    check_interval_minutes INTEGER NOT NULL DEFAULT 60 CHECK (check_interval_minutes > 0),
    -- Last check
    last_check_time TIMESTAMP WITH TIME ZONE,
    -- Statistics shown in reality check
    session_start_time TIMESTAMP WITH TIME ZONE,
    session_duration_minutes INTEGER DEFAULT 0,
    session_wagered_amount NUMERIC(20, 2) DEFAULT 0,
    session_win_amount NUMERIC(20, 2) DEFAULT 0,
    session_loss_amount NUMERIC(20, 2) DEFAULT 0,
    -- Status
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER DEFAULT 1,
    UNIQUE (user_id)
);

CREATE INDEX idx_reality_checks_user_id ON reality_checks(user_id);
CREATE INDEX idx_reality_checks_enabled ON reality_checks(is_enabled);

-- =====================================================
-- TRIGGER FUNCTIONS
-- =====================================================

-- Function to auto-expire limits
CREATE OR REPLACE FUNCTION expire_old_limits()
RETURNS TRIGGER AS $$
BEGIN
    -- Expire deposit limits
    UPDATE deposit_limits
    SET status = 'EXPIRED',
        updated_at = CURRENT_TIMESTAMP
    WHERE status = 'ACTIVE'
    AND next_reset_date <= CURRENT_TIMESTAMP;

    -- Expire loss limits
    UPDATE loss_limits
    SET status = 'EXPIRED',
        updated_at = CURRENT_TIMESTAMP
    WHERE status = 'ACTIVE'
    AND next_reset_date <= CURRENT_TIMESTAMP;

    -- Expire wager limits
    UPDATE wager_limits
    SET status = 'EXPIRED',
        updated_at = CURRENT_TIMESTAMP
    WHERE status = 'ACTIVE'
    AND next_reset_date <= CURRENT_TIMESTAMP;

    -- Expire self-exclusions
    UPDATE self_exclusions
    SET status = 'EXPIRED',
        updated_at = CURRENT_TIMESTAMP
    WHERE status = 'ACTIVE'
    AND end_date IS NOT NULL
    AND end_date <= CURRENT_TIMESTAMP;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to activate pending limit increases
CREATE OR REPLACE FUNCTION activate_pending_limits()
RETURNS TRIGGER AS $$
BEGIN
    -- Activate pending deposit limit increases
    UPDATE deposit_limits
    SET amount = pending_amount,
        pending_amount = NULL,
        pending_effective_date = NULL,
        is_increase = FALSE,
        status = 'ACTIVE',
        updated_at = CURRENT_TIMESTAMP
    WHERE status = 'PENDING'
    AND is_increase = TRUE
    AND pending_effective_date <= CURRENT_TIMESTAMP;

    -- Activate pending loss limit increases
    UPDATE loss_limits
    SET amount = pending_amount,
        pending_amount = NULL,
        pending_effective_date = NULL,
        is_increase = FALSE,
        status = 'ACTIVE',
        updated_at = CURRENT_TIMESTAMP
    WHERE status = 'PENDING'
    AND is_increase = TRUE
    AND pending_effective_date <= CURRENT_TIMESTAMP;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to log limit changes
CREATE OR REPLACE FUNCTION log_deposit_limit_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO deposit_limit_history (
            deposit_limit_id, user_id, action, new_amount, currency, reason
        ) VALUES (
            NEW.id, NEW.user_id, 'CREATED', NEW.amount, NEW.currency, 'Limit created'
        );
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.amount != NEW.amount THEN
            INSERT INTO deposit_limit_history (
                deposit_limit_id, user_id, action, old_amount, new_amount, currency, reason
            ) VALUES (
                NEW.id, NEW.user_id,
                CASE WHEN NEW.amount > OLD.amount THEN 'INCREASED' ELSE 'DECREASED' END,
                OLD.amount, NEW.amount, NEW.currency,
                CASE WHEN NEW.amount > OLD.amount THEN 'Limit increased' ELSE 'Limit decreased' END
            );
        END IF;

        IF OLD.spent_amount != NEW.spent_amount THEN
            INSERT INTO deposit_limit_history (
                deposit_limit_id, user_id, action, spent_amount, currency, reason
            ) VALUES (
                NEW.id, NEW.user_id, 'SPENT', NEW.spent_amount, NEW.currency, 'Deposit made'
            );
        END IF;

        IF OLD.status = 'ACTIVE' AND NEW.status = 'EXPIRED' THEN
            INSERT INTO deposit_limit_history (
                deposit_limit_id, user_id, action, old_amount, currency, reason
            ) VALUES (
                NEW.id, NEW.user_id, 'RESET', OLD.amount, NEW.currency, 'Limit period expired and reset'
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trg_log_deposit_limit_changes
AFTER INSERT OR UPDATE ON deposit_limits
FOR EACH ROW EXECUTE FUNCTION log_deposit_limit_change();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE deposit_limits IS 'Player self-imposed deposit limits for responsible gaming compliance';
COMMENT ON TABLE loss_limits IS 'Player self-imposed loss limits for responsible gaming';
COMMENT ON TABLE session_limits IS 'Player session duration and loss limits';
COMMENT ON TABLE wager_limits IS 'Player wagering limits';
COMMENT ON TABLE self_exclusions IS 'Player self-exclusion records for responsible gaming';
COMMENT ON TABLE reality_checks IS 'Player session reality check reminders';
COMMENT ON TABLE deposit_limit_history IS 'Audit trail for all deposit limit changes';

COMMENT ON COLUMN deposit_limits.is_increase IS 'TRUE if this is a limit increase (delayed activation), FALSE for decrease (immediate)';
COMMENT ON COLUMN deposit_limits.pending_effective_date IS 'For increases: date when new limit becomes active (usually next day)';
COMMENT ON COLUMN self_exclusions.earliest_revocation_date IS 'Compliance: cannot revoke self-exclusion before this date';
