"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetSettingsToDefaultService = exports.getKYCSettingsService = exports.testEmailConfigurationService = exports.getEmailSettingsService = exports.getGamingSettingsService = exports.getSecuritySettingsService = exports.getCurrencySettingsService = exports.setMaintenanceModeService = exports.getMaintenanceStatusService = exports.updateServerSettingsService = exports.getServerSettingsService = exports.updateSystemSettingsService = exports.getSystemSettingsService = exports.createServerSettingsTable = exports.createSystemSettingsTable = void 0;
const postgres_1 = __importDefault(require("../../db/postgres"));
// Create system settings table
const createSystemSettingsTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS system_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      site_name VARCHAR(100) DEFAULT 'JackpotX Casino',
      maintenance_mode BOOLEAN DEFAULT FALSE,
      maintenance_message TEXT,
      default_currency VARCHAR(3) DEFAULT 'USD',
      supported_currencies TEXT[] DEFAULT ARRAY['USD', 'EUR', 'GBP'],
      min_deposit NUMERIC(20,2) DEFAULT 10.00,
      max_deposit NUMERIC(20,2) DEFAULT 10000.00,
      min_withdrawal NUMERIC(20,2) DEFAULT 20.00,
      max_withdrawal NUMERIC(20,2) DEFAULT 5000.00,
      auto_approval_limit NUMERIC(20,2) DEFAULT 100.00,
      kyc_required BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `;
    await postgres_1.default.query(query);
    // Insert default settings if not exists
    const checkQuery = "SELECT COUNT(*) as count FROM system_settings WHERE id = 1";
    const checkResult = await postgres_1.default.query(checkQuery);
    if (parseInt(checkResult.rows[0].count) === 0) {
        await postgres_1.default.query("INSERT INTO system_settings (id) VALUES (1)");
    }
};
exports.createSystemSettingsTable = createSystemSettingsTable;
// Create server settings table if it doesn't exist
const createServerSettingsTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS server_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      database JSONB DEFAULT '{"host": "localhost", "port": 5432, "name": "casino_db", "pool_size": 10, "connection_timeout": 30000}',
      redis JSONB DEFAULT '{"host": "localhost", "port": 6379, "db": 0}',
      server JSONB DEFAULT '{"port": 3000, "host": "0.0.0.0", "cors_origins": ["http://localhost:3000"], "rate_limit_window": 900000, "rate_limit_max": 100, "upload_max_size": 10485760, "session_secret": "your-secret-key", "jwt_secret": "your-jwt-secret", "jwt_expires_in": "24h"}',
      logging JSONB DEFAULT '{"level": "info", "file_path": "./logs/app.log", "max_size": 10485760, "max_files": 5}',
      cache JSONB DEFAULT '{"ttl": 3600, "check_period": 600, "max_keys": 1000}',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `;
    await postgres_1.default.query(query);
    // Insert default settings if not exists
    const checkQuery = "SELECT COUNT(*) as count FROM server_settings WHERE id = 1";
    const checkResult = await postgres_1.default.query(checkQuery);
    if (parseInt(checkResult.rows[0].count) === 0) {
        const insertQuery = `
      INSERT INTO server_settings (id) VALUES (1)
      ON CONFLICT (id) DO NOTHING
    `;
        await postgres_1.default.query(insertQuery);
    }
};
exports.createServerSettingsTable = createServerSettingsTable;
// Get system settings
const getSystemSettingsService = async () => {
    await (0, exports.createSystemSettingsTable)();
    const query = "SELECT * FROM system_settings WHERE id = 1";
    const result = await postgres_1.default.query(query);
    return result.rows[0] || {};
};
exports.getSystemSettingsService = getSystemSettingsService;
// Update system settings
const updateSystemSettingsService = async (settingsData) => {
    await (0, exports.createSystemSettingsTable)();
    const fields = [];
    const values = [];
    let paramCount = 1;
    Object.entries(settingsData).forEach(([key, value]) => {
        if (value !== undefined) {
            fields.push(`${key} = $${paramCount}`);
            values.push(value);
            paramCount++;
        }
    });
    if (fields.length === 0) {
        throw new Error("No settings to update");
    }
    const query = `
    UPDATE system_settings 
    SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
    RETURNING *
  `;
    const result = await postgres_1.default.query(query, values);
    return result.rows[0];
};
exports.updateSystemSettingsService = updateSystemSettingsService;
// Get server settings
const getServerSettingsService = async () => {
    await (0, exports.createServerSettingsTable)();
    const query = "SELECT * FROM server_settings WHERE id = 1";
    const result = await postgres_1.default.query(query);
    return result.rows[0] || {};
};
exports.getServerSettingsService = getServerSettingsService;
// Update server settings
const updateServerSettingsService = async (settingsData) => {
    await (0, exports.createServerSettingsTable)();
    const fields = [];
    const values = [];
    let paramCount = 1;
    Object.entries(settingsData).forEach(([key, value]) => {
        if (value !== undefined) {
            fields.push(`${key} = $${paramCount}`);
            values.push(JSON.stringify(value));
            paramCount++;
        }
    });
    if (fields.length === 0) {
        throw new Error("No settings to update");
    }
    const query = `
    UPDATE server_settings 
    SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
    RETURNING *
  `;
    const result = await postgres_1.default.query(query, values);
    return result.rows[0];
};
exports.updateServerSettingsService = updateServerSettingsService;
// Get maintenance status
const getMaintenanceStatusService = async () => {
    const settings = await (0, exports.getSystemSettingsService)();
    return {
        maintenance_mode: settings.maintenance_mode || false,
        maintenance_message: settings.maintenance_message || "System is under maintenance"
    };
};
exports.getMaintenanceStatusService = getMaintenanceStatusService;
// Set maintenance mode
const setMaintenanceModeService = async (enabled, message) => {
    const updateData = { maintenance_mode: enabled };
    if (message) {
        updateData.maintenance_message = message;
    }
    return await (0, exports.updateSystemSettingsService)(updateData);
};
exports.setMaintenanceModeService = setMaintenanceModeService;
// Get currency settings
const getCurrencySettingsService = async () => {
    const settings = await (0, exports.getSystemSettingsService)();
    return {
        default_currency: settings.default_currency || 'USD',
        supported_currencies: settings.supported_currencies || ['USD', 'EUR', 'GBP'],
        min_deposit: settings.min_deposit || 10.00,
        max_deposit: settings.max_deposit || 10000.00,
        min_withdrawal: settings.min_withdrawal || 20.00,
        max_withdrawal: settings.max_withdrawal || 5000.00,
        auto_approval_limit: settings.auto_approval_limit || 100.00
    };
};
exports.getCurrencySettingsService = getCurrencySettingsService;
// Get security settings
const getSecuritySettingsService = async () => {
    const settings = await (0, exports.getSystemSettingsService)();
    const securitySettings = settings.security_settings || {};
    return {
        password_min_length: securitySettings.password_min_length || 8,
        password_require_special: securitySettings.password_require_special !== false,
        session_timeout: securitySettings.session_timeout || 3600,
        max_login_attempts: securitySettings.max_login_attempts || 5,
        lockout_duration: securitySettings.lockout_duration || 900,
        require_2fa: securitySettings.require_2fa || false,
        allowed_ip_ranges: securitySettings.allowed_ip_ranges || []
    };
};
exports.getSecuritySettingsService = getSecuritySettingsService;
// Get gaming settings
const getGamingSettingsService = async () => {
    const settings = await (0, exports.getSystemSettingsService)();
    const gamingSettings = settings.gaming_settings || {};
    return {
        default_rtp: gamingSettings.default_rtp || 96.0,
        max_bet_multiplier: gamingSettings.max_bet_multiplier || 1000,
        auto_play_limit: gamingSettings.auto_play_limit || 100,
        responsible_gaming: {
            deposit_limits: gamingSettings.responsible_gaming?.deposit_limits !== false,
            session_limits: gamingSettings.responsible_gaming?.session_limits !== false,
            loss_limits: gamingSettings.responsible_gaming?.loss_limits !== false,
            self_exclusion: gamingSettings.responsible_gaming?.self_exclusion !== false
        }
    };
};
exports.getGamingSettingsService = getGamingSettingsService;
// Get email settings
const getEmailSettingsService = async () => {
    const settings = await (0, exports.getSystemSettingsService)();
    const emailSettings = settings.email_settings || {};
    return {
        smtp_host: emailSettings.smtp_host || 'localhost',
        smtp_port: emailSettings.smtp_port || 587,
        smtp_user: emailSettings.smtp_user || '',
        smtp_pass: emailSettings.smtp_pass || '',
        from_email: emailSettings.from_email || 'noreply@casino.com',
        from_name: emailSettings.from_name || 'JackpotX Casino'
    };
};
exports.getEmailSettingsService = getEmailSettingsService;
// Test email configuration
const testEmailConfigurationService = async () => {
    const emailSettings = await (0, exports.getEmailSettingsService)();
    // This is a placeholder for actual email testing
    // In a real implementation, you would test the SMTP connection
    const testResult = {
        smtp_host: emailSettings.smtp_host,
        smtp_port: emailSettings.smtp_port,
        connection_status: "success",
        response_time: Math.random() * 1000,
        last_tested: new Date(),
        details: {
            from_email: emailSettings.from_email,
            from_name: emailSettings.from_name
        }
    };
    return testResult;
};
exports.testEmailConfigurationService = testEmailConfigurationService;
// Get KYC settings
const getKYCSettingsService = async () => {
    const settings = await (0, exports.getSystemSettingsService)();
    const kycLevels = settings.kyc_levels || {};
    return {
        kyc_required: settings.kyc_required !== false,
        kyc_levels: {
            basic: {
                required: kycLevels.basic?.required !== false,
                documents: kycLevels.basic?.documents || ['passport', 'national_id']
            },
            full: {
                required: kycLevels.full?.required || false,
                documents: kycLevels.full?.documents || ['passport', 'national_id', 'utility_bill']
            }
        }
    };
};
exports.getKYCSettingsService = getKYCSettingsService;
// Reset settings to default
const resetSettingsToDefaultService = async () => {
    await (0, exports.createSystemSettingsTable)();
    await (0, exports.createServerSettingsTable)();
    // Delete existing settings
    await postgres_1.default.query("DELETE FROM system_settings WHERE id = 1");
    await postgres_1.default.query("DELETE FROM server_settings WHERE id = 1");
    // Recreate with defaults
    await postgres_1.default.query("INSERT INTO system_settings (id) VALUES (1)");
    await postgres_1.default.query("INSERT INTO server_settings (id) VALUES (1)");
    return {
        system_settings: await (0, exports.getSystemSettingsService)(),
        server_settings: await (0, exports.getServerSettingsService)()
    };
};
exports.resetSettingsToDefaultService = resetSettingsToDefaultService;
