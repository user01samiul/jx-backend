-- =====================================================
-- ENHANCED PLAYER STATUS WITH GRANULAR PERMISSIONS
-- =====================================================

-- Add granular permission columns to statuses table
ALTER TABLE statuses
ADD COLUMN IF NOT EXISTS can_login BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS can_deposit BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS can_withdraw BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS can_play BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS can_receive_marketing BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS reason TEXT,
ADD COLUMN IF NOT EXISTS auto_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_permanent BOOLEAN DEFAULT FALSE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_statuses_permissions ON statuses(can_login, can_deposit, can_withdraw, can_play);

-- Update existing statuses with appropriate permissions
-- Registered: Can login, cannot deposit/play (pending email verification)
UPDATE statuses SET
    can_login = TRUE,
    can_deposit = FALSE,
    can_withdraw = FALSE,
    can_play = FALSE,
    can_receive_marketing = TRUE
WHERE LOWER(status) = 'registered' OR id = 1;

-- Active/Activated: Full access
UPDATE statuses SET
    can_login = TRUE,
    can_deposit = TRUE,
    can_withdraw = TRUE,
    can_play = TRUE,
    can_receive_marketing = TRUE
WHERE LOWER(status) IN ('active', 'activated') OR id = 2;

-- Verified: Full access
UPDATE statuses SET
    can_login = TRUE,
    can_deposit = TRUE,
    can_withdraw = TRUE,
    can_play = TRUE,
    can_receive_marketing = TRUE
WHERE LOWER(status) = 'verified' OR id = 3;

-- Suspended: Login only, no deposit/play
UPDATE statuses SET
    can_login = TRUE,
    can_deposit = FALSE,
    can_withdraw = TRUE,
    can_play = FALSE,
    can_receive_marketing = FALSE,
    reason = 'Account under investigation'
WHERE LOWER(status) = 'suspended';

-- Frozen: No access at all
UPDATE statuses SET
    can_login = FALSE,
    can_deposit = FALSE,
    can_withdraw = FALSE,
    can_play = FALSE,
    can_receive_marketing = FALSE,
    is_permanent = FALSE,
    reason = 'Account frozen pending review'
WHERE LOWER(status) = 'frozen';

-- Closed: Permanently closed
UPDATE statuses SET
    can_login = FALSE,
    can_deposit = FALSE,
    can_withdraw = FALSE,
    can_play = FALSE,
    can_receive_marketing = FALSE,
    is_permanent = TRUE,
    reason = 'Account permanently closed'
WHERE LOWER(status) = 'closed';

-- Banned: Permanently banned
UPDATE statuses SET
    can_login = FALSE,
    can_deposit = FALSE,
    can_withdraw = FALSE,
    can_play = FALSE,
    can_receive_marketing = FALSE,
    is_permanent = TRUE,
    reason = 'Account banned for terms violation'
WHERE LOWER(status) = 'banned';

-- Insert missing standard statuses if they don't exist
INSERT INTO statuses (status, can_login, can_deposit, can_withdraw, can_play, can_receive_marketing, reason)
SELECT 'Registered', TRUE, FALSE, FALSE, FALSE, TRUE, 'Email verification pending'
WHERE NOT EXISTS (SELECT 1 FROM statuses WHERE LOWER(status) = 'registered');

INSERT INTO statuses (status, can_login, can_deposit, can_withdraw, can_play, can_receive_marketing, reason)
SELECT 'Active', TRUE, TRUE, TRUE, TRUE, TRUE, 'Account active and verified'
WHERE NOT EXISTS (SELECT 1 FROM statuses WHERE LOWER(status) = 'active');

INSERT INTO statuses (status, can_login, can_deposit, can_withdraw, can_play, can_receive_marketing, reason)
SELECT 'Verified', TRUE, TRUE, TRUE, TRUE, TRUE, 'KYC verified'
WHERE NOT EXISTS (SELECT 1 FROM statuses WHERE LOWER(status) = 'verified');

INSERT INTO statuses (status, can_login, can_deposit, can_withdraw, can_play, can_receive_marketing, is_permanent, reason)
SELECT 'Suspended', TRUE, FALSE, TRUE, FALSE, FALSE, FALSE, 'Account temporarily suspended'
WHERE NOT EXISTS (SELECT 1 FROM statuses WHERE LOWER(status) = 'suspended');

INSERT INTO statuses (status, can_login, can_deposit, can_withdraw, can_play, can_receive_marketing, is_permanent, reason)
SELECT 'Frozen', FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, 'Account frozen'
WHERE NOT EXISTS (SELECT 1 FROM statuses WHERE LOWER(status) = 'frozen');

INSERT INTO statuses (status, can_login, can_deposit, can_withdraw, can_play, can_receive_marketing, is_permanent, reason)
SELECT 'Closed', FALSE, FALSE, FALSE, FALSE, FALSE, TRUE, 'Account closed'
WHERE NOT EXISTS (SELECT 1 FROM statuses WHERE LOWER(status) = 'closed');

INSERT INTO statuses (status, can_login, can_deposit, can_withdraw, can_play, can_receive_marketing, is_permanent, reason)
SELECT 'Banned', FALSE, FALSE, FALSE, FALSE, FALSE, TRUE, 'Account banned'
WHERE NOT EXISTS (SELECT 1 FROM statuses WHERE LOWER(status) = 'banned');

-- =====================================================
-- PLAYER STATUS HISTORY
-- =====================================================
CREATE TABLE IF NOT EXISTS player_status_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    old_status_id INTEGER REFERENCES statuses(id),
    new_status_id INTEGER NOT NULL REFERENCES statuses(id),
    reason TEXT,
    changed_by INTEGER REFERENCES users(id), -- Admin or system
    auto_expires_at TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_player_status_history_user_id ON player_status_history(user_id);
CREATE INDEX idx_player_status_history_created_at ON player_status_history(created_at);
CREATE INDEX idx_player_status_history_auto_expires ON player_status_history(auto_expires_at) WHERE auto_expires_at IS NOT NULL;

-- =====================================================
-- TRIGGER: Auto-log status changes
-- =====================================================
CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status_id IS DISTINCT FROM NEW.status_id THEN
        INSERT INTO player_status_history (user_id, old_status_id, new_status_id, reason)
        VALUES (NEW.id, OLD.status_id, NEW.status_id, 'Status changed');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trg_log_status_change ON users;
CREATE TRIGGER trg_log_status_change
AFTER UPDATE OF status_id ON users
FOR EACH ROW EXECUTE FUNCTION log_status_change();

-- =====================================================
-- FUNCTION: Auto-restore expired status changes
-- =====================================================
CREATE OR REPLACE FUNCTION restore_expired_statuses()
RETURNS INTEGER AS $$
DECLARE
    affected_count INTEGER;
BEGIN
    -- Find users with expired temporary status changes
    WITH expired_statuses AS (
        SELECT DISTINCT ON (user_id)
            user_id,
            old_status_id
        FROM player_status_history
        WHERE auto_expires_at IS NOT NULL
        AND auto_expires_at <= CURRENT_TIMESTAMP
        ORDER BY user_id, created_at DESC
    )
    UPDATE users u
    SET status_id = es.old_status_id,
        updated_at = CURRENT_TIMESTAMP
    FROM expired_statuses es
    WHERE u.id = es.user_id;

    GET DIAGNOSTICS affected_count = ROW_COUNT;

    RETURN affected_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON COLUMN statuses.can_login IS 'Whether user can login to the platform';
COMMENT ON COLUMN statuses.can_deposit IS 'Whether user can make deposits';
COMMENT ON COLUMN statuses.can_withdraw IS 'Whether user can request withdrawals';
COMMENT ON COLUMN statuses.can_play IS 'Whether user can play games';
COMMENT ON COLUMN statuses.can_receive_marketing IS 'Whether user can receive marketing communications';
COMMENT ON COLUMN statuses.auto_expires_at IS 'When this status automatically expires (for temporary suspensions)';
COMMENT ON COLUMN statuses.is_permanent IS 'Whether this status is permanent (cannot be changed)';

COMMENT ON TABLE player_status_history IS 'Audit trail of all player status changes';
