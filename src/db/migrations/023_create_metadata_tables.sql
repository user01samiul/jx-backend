-- =====================================================
-- METADATA TABLES (Currencies, Countries, Mobile Prefixes)
-- =====================================================

DROP TABLE IF EXISTS mobile_prefixes CASCADE;
DROP TABLE IF EXISTS countries CASCADE;
DROP TABLE IF EXISTS currencies CASCADE;

-- =====================================================
-- CURRENCIES TABLE
-- =====================================================
CREATE TABLE currencies (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL, -- ISO 4217 (USD, EUR, GBP, BTC, ETH, USDT, etc.)
    name VARCHAR(100) NOT NULL, -- Dollar, Euro, Pound, Bitcoin
    symbol VARCHAR(10), -- $, €, £, ₿
    type VARCHAR(20) NOT NULL DEFAULT 'FIAT' CHECK (type IN ('FIAT', 'CRYPTO')),
    country VARCHAR(100), -- Primary country (or blockchain for crypto)
    icon_url TEXT, -- SVG/PNG icon URL
    decimal_places INTEGER DEFAULT 2 CHECK (decimal_places >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    exchange_rate_to_usd NUMERIC(20, 6) DEFAULT 1.0, -- Exchange rate to USD
    last_rate_update TIMESTAMP WITH TIME ZONE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER DEFAULT 1
);

CREATE INDEX idx_currencies_code ON currencies(code);
CREATE INDEX idx_currencies_is_active ON currencies(is_active);
CREATE INDEX idx_currencies_type ON currencies(type);

-- =====================================================
-- COUNTRIES TABLE
-- =====================================================
CREATE TABLE countries (
    id SERIAL PRIMARY KEY,
    code VARCHAR(2) UNIQUE NOT NULL, -- ISO 3166-1 alpha-2 (US, GB, RO, etc.)
    code3 VARCHAR(3) UNIQUE, -- ISO 3166-1 alpha-3 (USA, GBR, ROU, etc.)
    name VARCHAR(100) NOT NULL,
    native_name VARCHAR(100),
    phone_code VARCHAR(10) NOT NULL, -- +1, +44, +40, etc.
    currency_code VARCHAR(10) REFERENCES currencies(code),
    flag_icon_url TEXT,
    latitude NUMERIC(10, 6),
    longitude NUMERIC(10, 6),
    continent VARCHAR(50),
    region VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    is_restricted BOOLEAN DEFAULT FALSE, -- Geo-blocking
    restriction_reason TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER DEFAULT 1
);

CREATE INDEX idx_countries_code ON countries(code);
CREATE INDEX idx_countries_is_active ON countries(is_active);
CREATE INDEX idx_countries_is_restricted ON countries(is_restricted);
CREATE INDEX idx_countries_phone_code ON countries(phone_code);

-- =====================================================
-- MOBILE PREFIXES TABLE
-- =====================================================
CREATE TABLE mobile_prefixes (
    id SERIAL PRIMARY KEY,
    prefix VARCHAR(10) NOT NULL, -- +1, +44, +40, etc.
    country_code VARCHAR(2) NOT NULL REFERENCES countries(code),
    country_name VARCHAR(100) NOT NULL,
    carrier VARCHAR(100), -- Optional carrier name
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER DEFAULT 1,
    UNIQUE (prefix, country_code)
);

CREATE INDEX idx_mobile_prefixes_prefix ON mobile_prefixes(prefix);
CREATE INDEX idx_mobile_prefixes_country_code ON mobile_prefixes(country_code);
CREATE INDEX idx_mobile_prefixes_is_active ON mobile_prefixes(is_active);

-- =====================================================
-- INSERT POPULAR CURRENCIES
-- =====================================================
INSERT INTO currencies (code, name, symbol, type, country, decimal_places, exchange_rate_to_usd, is_active) VALUES
-- Fiat Currencies
('USD', 'US Dollar', '$', 'FIAT', 'United States', 2, 1.0, TRUE),
('EUR', 'Euro', '€', 'FIAT', 'European Union', 2, 1.09, TRUE),
('GBP', 'British Pound', '£', 'FIAT', 'United Kingdom', 2, 1.27, TRUE),
('RON', 'Romanian Leu', 'lei', 'FIAT', 'Romania', 2, 0.22, TRUE),
('CAD', 'Canadian Dollar', 'C$', 'FIAT', 'Canada', 2, 0.74, TRUE),
('AUD', 'Australian Dollar', 'A$', 'FIAT', 'Australia', 2, 0.66, TRUE),
('JPY', 'Japanese Yen', '¥', 'FIAT', 'Japan', 0, 0.0067, TRUE),
('CNY', 'Chinese Yuan', '¥', 'FIAT', 'China', 2, 0.14, TRUE),
('INR', 'Indian Rupee', '₹', 'FIAT', 'India', 2, 0.012, TRUE),
('BRL', 'Brazilian Real', 'R$', 'FIAT', 'Brazil', 2, 0.20, TRUE),
('MXN', 'Mexican Peso', '$', 'FIAT', 'Mexico', 2, 0.059, TRUE),
('ZAR', 'South African Rand', 'R', 'FIAT', 'South Africa', 2, 0.055, TRUE),
('TRY', 'Turkish Lira', '₺', 'FIAT', 'Turkey', 2, 0.034, TRUE),
('RUB', 'Russian Ruble', '₽', 'FIAT', 'Russia', 2, 0.011, TRUE),
('PLN', 'Polish Zloty', 'zł', 'FIAT', 'Poland', 2, 0.25, TRUE),
-- Cryptocurrencies
('BTC', 'Bitcoin', '₿', 'CRYPTO', 'Blockchain', 8, 45000.0, TRUE),
('ETH', 'Ethereum', 'Ξ', 'CRYPTO', 'Blockchain', 8, 2400.0, TRUE),
('USDT', 'Tether', '₮', 'CRYPTO', 'Blockchain', 2, 1.0, TRUE),
('USDC', 'USD Coin', '$', 'CRYPTO', 'Blockchain', 2, 1.0, TRUE),
('LTC', 'Litecoin', 'Ł', 'CRYPTO', 'Blockchain', 8, 85.0, TRUE),
('DOGE', 'Dogecoin', 'Ð', 'CRYPTO', 'Blockchain', 8, 0.08, TRUE)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- INSERT POPULAR COUNTRIES
-- =====================================================
INSERT INTO countries (code, code3, name, native_name, phone_code, currency_code, continent, region, is_active) VALUES
('US', 'USA', 'United States', 'United States', '+1', 'USD', 'North America', 'Northern America', TRUE),
('GB', 'GBR', 'United Kingdom', 'United Kingdom', '+44', 'GBP', 'Europe', 'Northern Europe', TRUE),
('RO', 'ROU', 'Romania', 'România', '+40', 'RON', 'Europe', 'Eastern Europe', TRUE),
('CA', 'CAN', 'Canada', 'Canada', '+1', 'CAD', 'North America', 'Northern America', TRUE),
('AU', 'AUS', 'Australia', 'Australia', '+61', 'AUD', 'Oceania', 'Australia and New Zealand', TRUE),
('DE', 'DEU', 'Germany', 'Deutschland', '+49', 'EUR', 'Europe', 'Western Europe', TRUE),
('FR', 'FRA', 'France', 'France', '+33', 'EUR', 'Europe', 'Western Europe', TRUE),
('ES', 'ESP', 'Spain', 'España', '+34', 'EUR', 'Europe', 'Southern Europe', TRUE),
('IT', 'ITA', 'Italy', 'Italia', '+39', 'EUR', 'Europe', 'Southern Europe', TRUE),
('PT', 'PRT', 'Portugal', 'Portugal', '+351', 'EUR', 'Europe', 'Southern Europe', TRUE),
('BR', 'BRA', 'Brazil', 'Brasil', '+55', 'BRL', 'South America', 'South America', TRUE),
('MX', 'MEX', 'Mexico', 'México', '+52', 'MXN', 'North America', 'Central America', TRUE),
('IN', 'IND', 'India', 'भारत', '+91', 'INR', 'Asia', 'Southern Asia', TRUE),
('CN', 'CHN', 'China', '中国', '+86', 'CNY', 'Asia', 'Eastern Asia', TRUE),
('JP', 'JPN', 'Japan', '日本', '+81', 'JPY', 'Asia', 'Eastern Asia', TRUE),
('ZA', 'ZAF', 'South Africa', 'South Africa', '+27', 'ZAR', 'Africa', 'Southern Africa', TRUE),
('TR', 'TUR', 'Turkey', 'Türkiye', '+90', 'TRY', 'Asia', 'Western Asia', TRUE),
('RU', 'RUS', 'Russia', 'Россия', '+7', 'RUB', 'Europe', 'Eastern Europe', TRUE),
('PL', 'POL', 'Poland', 'Polska', '+48', 'PLN', 'Europe', 'Eastern Europe', TRUE),
('NL', 'NLD', 'Netherlands', 'Nederland', '+31', 'EUR', 'Europe', 'Western Europe', TRUE),
('BE', 'BEL', 'Belgium', 'België', '+32', 'EUR', 'Europe', 'Western Europe', TRUE),
('SE', 'SWE', 'Sweden', 'Sverige', '+46', 'EUR', 'Europe', 'Northern Europe', TRUE),
('NO', 'NOR', 'Norway', 'Norge', '+47', 'EUR', 'Europe', 'Northern Europe', TRUE),
('DK', 'DNK', 'Denmark', 'Danmark', '+45', 'EUR', 'Europe', 'Northern Europe', TRUE),
('FI', 'FIN', 'Finland', 'Suomi', '+358', 'EUR', 'Europe', 'Northern Europe', TRUE),
('GR', 'GRC', 'Greece', 'Ελλάδα', '+30', 'EUR', 'Europe', 'Southern Europe', TRUE),
('AT', 'AUT', 'Austria', 'Österreich', '+43', 'EUR', 'Europe', 'Western Europe', TRUE),
('CH', 'CHE', 'Switzerland', 'Schweiz', '+41', 'EUR', 'Europe', 'Western Europe', TRUE),
('IE', 'IRL', 'Ireland', 'Éire', '+353', 'EUR', 'Europe', 'Northern Europe', TRUE),
('NZ', 'NZL', 'New Zealand', 'New Zealand', '+64', 'AUD', 'Oceania', 'Australia and New Zealand', TRUE)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- INSERT MOBILE PREFIXES
-- =====================================================
INSERT INTO mobile_prefixes (prefix, country_code, country_name, is_active) VALUES
('+1', 'US', 'United States', TRUE),
('+1', 'CA', 'Canada', TRUE),
('+44', 'GB', 'United Kingdom', TRUE),
('+40', 'RO', 'Romania', TRUE),
('+61', 'AU', 'Australia', TRUE),
('+49', 'DE', 'Germany', TRUE),
('+33', 'FR', 'France', TRUE),
('+34', 'ES', 'Spain', TRUE),
('+39', 'IT', 'Italy', TRUE),
('+351', 'PT', 'Portugal', TRUE),
('+55', 'BR', 'Brazil', TRUE),
('+52', 'MX', 'Mexico', TRUE),
('+91', 'IN', 'India', TRUE),
('+86', 'CN', 'China', TRUE),
('+81', 'JP', 'Japan', TRUE),
('+27', 'ZA', 'South Africa', TRUE),
('+90', 'TR', 'Turkey', TRUE),
('+7', 'RU', 'Russia', TRUE),
('+48', 'PL', 'Poland', TRUE),
('+31', 'NL', 'Netherlands', TRUE),
('+32', 'BE', 'Belgium', TRUE),
('+46', 'SE', 'Sweden', TRUE),
('+47', 'NO', 'Norway', TRUE),
('+45', 'DK', 'Denmark', TRUE),
('+358', 'FI', 'Finland', TRUE),
('+30', 'GR', 'Greece', TRUE),
('+43', 'AT', 'Austria', TRUE),
('+41', 'CH', 'Switzerland', TRUE),
('+353', 'IE', 'Ireland', TRUE),
('+64', 'NZ', 'New Zealand', TRUE)
ON CONFLICT (prefix, country_code) DO NOTHING;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE currencies IS 'Supported currencies (fiat and crypto) for the platform';
COMMENT ON TABLE countries IS 'Countries with phone codes, flags, and geo-restriction support';
COMMENT ON TABLE mobile_prefixes IS 'Mobile phone prefixes by country';

COMMENT ON COLUMN currencies.exchange_rate_to_usd IS 'Exchange rate to USD (updated periodically)';
COMMENT ON COLUMN countries.is_restricted IS 'TRUE if country is geo-blocked';
COMMENT ON COLUMN countries.restriction_reason IS 'Reason for geo-blocking (licensing, regulations, etc.)';
