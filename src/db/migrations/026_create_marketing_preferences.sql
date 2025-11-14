-- =====================================================
-- MARKETING PREFERENCES (GDPR Compliance)
-- =====================================================

DROP TABLE IF EXISTS marketing_preference_history CASCADE;
DROP TABLE IF EXISTS marketing_preferences CASCADE;

-- =====================================================
-- MARKETING PREFERENCES TABLE
-- =====================================================
CREATE TABLE marketing_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Communication channels
    email_marketing BOOLEAN DEFAULT FALSE,
    sms_marketing BOOLEAN DEFAULT FALSE,
    push_notifications BOOLEAN DEFAULT FALSE,
    phone_calls BOOLEAN DEFAULT FALSE,
    postal_mail BOOLEAN DEFAULT FALSE,
    -- Content categories
    promotional_offers BOOLEAN DEFAULT FALSE,
    newsletters BOOLEAN DEFAULT FALSE,
    product_updates BOOLEAN DEFAULT FALSE,
    tournaments_events BOOLEAN DEFAULT FALSE,
    vip_exclusive_offers BOOLEAN DEFAULT FALSE,
    -- Privacy
    third_party_sharing BOOLEAN DEFAULT FALSE,
    profiling_analytics BOOLEAN DEFAULT FALSE,
    -- Compliance tracking
    consent_date TIMESTAMP WITH TIME ZONE,
    consent_ip INET,
    consent_method VARCHAR(50), -- 'EXPLICIT', 'IMPLIED', 'OPT_IN', 'OPT_OUT'
    withdraw_consent_date TIMESTAMP WITH TIME ZONE,
    -- Metadata
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER, -- User ID or Admin ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_marketing_preferences_user_id ON marketing_preferences(user_id);
CREATE INDEX idx_marketing_preferences_email ON marketing_preferences(email_marketing);
CREATE INDEX idx_marketing_preferences_sms ON marketing_preferences(sms_marketing);

-- =====================================================
-- MARKETING PREFERENCE HISTORY (Audit trail)
-- =====================================================
CREATE TABLE marketing_preference_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preference_field VARCHAR(100) NOT NULL, -- Which field changed
    old_value BOOLEAN,
    new_value BOOLEAN,
    changed_by INTEGER, -- User or Admin
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_marketing_preference_history_user_id ON marketing_preference_history(user_id);
CREATE INDEX idx_marketing_preference_history_created_at ON marketing_preference_history(created_at);

-- =====================================================
-- TRIGGER: Log preference changes
-- =====================================================
CREATE OR REPLACE FUNCTION log_marketing_preference_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Log each field change
    IF OLD.email_marketing IS DISTINCT FROM NEW.email_marketing THEN
        INSERT INTO marketing_preference_history (user_id, preference_field, old_value, new_value, changed_by)
        VALUES (NEW.user_id, 'email_marketing', OLD.email_marketing, NEW.email_marketing, NEW.updated_by);
    END IF;
    
    IF OLD.sms_marketing IS DISTINCT FROM NEW.sms_marketing THEN
        INSERT INTO marketing_preference_history (user_id, preference_field, old_value, new_value, changed_by)
        VALUES (NEW.user_id, 'sms_marketing', OLD.sms_marketing, NEW.sms_marketing, NEW.updated_by);
    END IF;
    
    IF OLD.push_notifications IS DISTINCT FROM NEW.push_notifications THEN
        INSERT INTO marketing_preference_history (user_id, preference_field, old_value, new_value, changed_by)
        VALUES (NEW.user_id, 'push_notifications', OLD.push_notifications, NEW.push_notifications, NEW.updated_by);
    END IF;
    
    IF OLD.third_party_sharing IS DISTINCT FROM NEW.third_party_sharing THEN
        INSERT INTO marketing_preference_history (user_id, preference_field, old_value, new_value, changed_by)
        VALUES (NEW.user_id, 'third_party_sharing', OLD.third_party_sharing, NEW.third_party_sharing, NEW.updated_by);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_marketing_preference_change
AFTER UPDATE ON marketing_preferences
FOR EACH ROW EXECUTE FUNCTION log_marketing_preference_change();

-- =====================================================
-- FUNCTION: Create default preferences for new users
-- =====================================================
CREATE OR REPLACE FUNCTION create_default_marketing_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO marketing_preferences (user_id, consent_method)
    VALUES (NEW.id, 'IMPLIED')
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_create_default_marketing_preferences
AFTER INSERT ON users
FOR EACH ROW EXECUTE FUNCTION create_default_marketing_preferences();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE marketing_preferences IS 'GDPR-compliant marketing preferences for each user';
COMMENT ON TABLE marketing_preference_history IS 'Audit trail of all marketing preference changes';

COMMENT ON COLUMN marketing_preferences.consent_method IS 'How consent was obtained: EXPLICIT (checkbox), IMPLIED (registration), OPT_IN, OPT_OUT';
COMMENT ON COLUMN marketing_preferences.third_party_sharing IS 'Consent to share data with third-party partners';
