-- GGR Filter Settings Table
CREATE TABLE IF NOT EXISTS ggr_filter_settings (
    id SERIAL PRIMARY KEY,
    filter_percent FLOAT NOT NULL DEFAULT 0.5,
    tolerance FLOAT NOT NULL DEFAULT 0.05,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- GGR Audit Log Table
CREATE TABLE IF NOT EXISTS ggr_audit_log (
    id SERIAL PRIMARY KEY,
    real_ggr NUMERIC(20,2) NOT NULL,
    reported_ggr NUMERIC(20,2) NOT NULL,
    filter_percent FLOAT NOT NULL,
    tolerance FLOAT NOT NULL,
    report_data JSONB,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings if not exists
INSERT INTO ggr_filter_settings (filter_percent, tolerance)
SELECT 0.5, 0.05
WHERE NOT EXISTS (SELECT 1 FROM ggr_filter_settings); 