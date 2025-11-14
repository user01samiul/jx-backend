-- =====================================================
-- MULTILANGUAGE SYSTEM
-- Support for multiple languages and translations
-- =====================================================

DROP TABLE IF EXISTS translation_values CASCADE;
DROP TABLE IF EXISTS translation_keys CASCADE;
DROP TABLE IF EXISTS languages CASCADE;

-- =====================================================
-- LANGUAGES TABLE
-- =====================================================
CREATE TABLE languages (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE, -- ISO 639-1 code (en, es, pt, it, de, fr, etc.)
    name VARCHAR(100) NOT NULL, -- English name
    native_name VARCHAR(100) NOT NULL, -- Native name (Español, Português, etc.)
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    direction VARCHAR(3) NOT NULL DEFAULT 'ltr' CHECK (direction IN ('ltr', 'rtl')),
    flag_icon_url TEXT, -- URL to flag SVG/PNG
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER DEFAULT 1
);

CREATE INDEX idx_languages_code ON languages(code);
CREATE INDEX idx_languages_is_active ON languages(is_active);
CREATE INDEX idx_languages_is_default ON languages(is_default);

-- =====================================================
-- TRANSLATION KEYS TABLE
-- =====================================================
CREATE TABLE translation_keys (
    id SERIAL PRIMARY KEY,
    key_name VARCHAR(255) NOT NULL UNIQUE, -- Unique key identifier (e.g., 'login.button', 'error.invalid_credentials')
    category VARCHAR(100), -- Category for organization (auth, errors, buttons, labels, etc.)
    description TEXT, -- Description of what this key is for
    is_system BOOLEAN NOT NULL DEFAULT FALSE, -- System keys cannot be deleted
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER DEFAULT 1
);

CREATE INDEX idx_translation_keys_key_name ON translation_keys(key_name);
CREATE INDEX idx_translation_keys_category ON translation_keys(category);
CREATE INDEX idx_translation_keys_is_system ON translation_keys(is_system);

-- =====================================================
-- TRANSLATION VALUES TABLE
-- =====================================================
CREATE TABLE translation_values (
    id SERIAL PRIMARY KEY,
    translation_key_id INTEGER NOT NULL REFERENCES translation_keys(id) ON DELETE CASCADE,
    language_id INTEGER NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
    value TEXT NOT NULL, -- The translated text
    is_verified BOOLEAN NOT NULL DEFAULT FALSE, -- Professional translation verification
    verified_by INTEGER REFERENCES users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER DEFAULT 1,
    UNIQUE (translation_key_id, language_id)
);

CREATE INDEX idx_translation_values_key_id ON translation_values(translation_key_id);
CREATE INDEX idx_translation_values_language_id ON translation_values(language_id);
CREATE INDEX idx_translation_values_is_verified ON translation_values(is_verified);

-- =====================================================
-- ADD PREFERRED LANGUAGE TO USER PROFILES
-- =====================================================
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS preferred_language_id INTEGER REFERENCES languages(id),
ADD COLUMN IF NOT EXISTS language_updated_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_user_profiles_language ON user_profiles(preferred_language_id);

-- =====================================================
-- INSERT DEFAULT LANGUAGES
-- =====================================================
INSERT INTO languages (code, name, native_name, is_default, is_active, sort_order) VALUES
('en', 'English', 'English', TRUE, TRUE, 1),
('es', 'Spanish', 'Español', FALSE, TRUE, 2),
('pt', 'Portuguese', 'Português', FALSE, TRUE, 3),
('it', 'Italian', 'Italiano', FALSE, TRUE, 4),
('de', 'German', 'Deutsch', FALSE, TRUE, 5),
('fr', 'French', 'Français', FALSE, TRUE, 6),
('ro', 'Romanian', 'Română', FALSE, TRUE, 7),
('pl', 'Polish', 'Polski', FALSE, TRUE, 8),
('tr', 'Turkish', 'Türkçe', FALSE, TRUE, 9),
('ru', 'Russian', 'Русский', FALSE, TRUE, 10)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- INSERT COMMON TRANSLATION KEYS
-- =====================================================

-- Helper function to insert translation key and values
CREATE OR REPLACE FUNCTION insert_translation(
    p_key_name VARCHAR(255),
    p_category VARCHAR(100),
    p_description TEXT,
    p_en TEXT,
    p_es TEXT DEFAULT NULL,
    p_pt TEXT DEFAULT NULL,
    p_it TEXT DEFAULT NULL,
    p_de TEXT DEFAULT NULL,
    p_fr TEXT DEFAULT NULL,
    p_ro TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_key_id INTEGER;
BEGIN
    -- Insert translation key
    INSERT INTO translation_keys (key_name, category, description, is_system)
    VALUES (p_key_name, p_category, p_description, TRUE)
    ON CONFLICT (key_name) DO NOTHING
    RETURNING id INTO v_key_id;

    IF v_key_id IS NULL THEN
        SELECT id INTO v_key_id FROM translation_keys WHERE key_name = p_key_name;
    END IF;

    -- Insert English (always required)
    INSERT INTO translation_values (translation_key_id, language_id, value, is_verified)
    SELECT v_key_id, id, p_en, TRUE FROM languages WHERE code = 'en'
    ON CONFLICT (translation_key_id, language_id) DO NOTHING;

    -- Insert other languages if provided
    IF p_es IS NOT NULL THEN
        INSERT INTO translation_values (translation_key_id, language_id, value, is_verified)
        SELECT v_key_id, id, p_es, TRUE FROM languages WHERE code = 'es'
        ON CONFLICT (translation_key_id, language_id) DO NOTHING;
    END IF;

    IF p_pt IS NOT NULL THEN
        INSERT INTO translation_values (translation_key_id, language_id, value, is_verified)
        SELECT v_key_id, id, p_pt, TRUE FROM languages WHERE code = 'pt'
        ON CONFLICT (translation_key_id, language_id) DO NOTHING;
    END IF;

    IF p_it IS NOT NULL THEN
        INSERT INTO translation_values (translation_key_id, language_id, value, is_verified)
        SELECT v_key_id, id, p_it, TRUE FROM languages WHERE code = 'it'
        ON CONFLICT (translation_key_id, language_id) DO NOTHING;
    END IF;

    IF p_de IS NOT NULL THEN
        INSERT INTO translation_values (translation_key_id, language_id, value, is_verified)
        SELECT v_key_id, id, p_de, TRUE FROM languages WHERE code = 'de'
        ON CONFLICT (translation_key_id, language_id) DO NOTHING;
    END IF;

    IF p_fr IS NOT NULL THEN
        INSERT INTO translation_values (translation_key_id, language_id, value, is_verified)
        SELECT v_key_id, id, p_fr, TRUE FROM languages WHERE code = 'fr'
        ON CONFLICT (translation_key_id, language_id) DO NOTHING;
    END IF;

    IF p_ro IS NOT NULL THEN
        INSERT INTO translation_values (translation_key_id, language_id, value, is_verified)
        SELECT v_key_id, id, p_ro, TRUE FROM languages WHERE code = 'ro'
        ON CONFLICT (translation_key_id, language_id) DO NOTHING;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Common translations
SELECT insert_translation('common.welcome', 'common', 'Welcome message', 'Welcome', 'Bienvenido', 'Bem-vindo', 'Benvenuto', 'Willkommen', 'Bienvenue', 'Bun venit');
SELECT insert_translation('common.login', 'common', 'Login button', 'Login', 'Iniciar sesión', 'Entrar', 'Accedi', 'Anmelden', 'Connexion', 'Autentificare');
SELECT insert_translation('common.logout', 'common', 'Logout button', 'Logout', 'Cerrar sesión', 'Sair', 'Esci', 'Abmelden', 'Déconnexion', 'Deconectare');
SELECT insert_translation('common.register', 'common', 'Register button', 'Register', 'Registrarse', 'Registrar', 'Registrati', 'Registrieren', 'S''inscrire', 'Înregistrare');
SELECT insert_translation('common.submit', 'common', 'Submit button', 'Submit', 'Enviar', 'Enviar', 'Invia', 'Absenden', 'Soumettre', 'Trimite');
SELECT insert_translation('common.cancel', 'common', 'Cancel button', 'Cancel', 'Cancelar', 'Cancelar', 'Annulla', 'Abbrechen', 'Annuler', 'Anulare');
SELECT insert_translation('common.save', 'common', 'Save button', 'Save', 'Guardar', 'Salvar', 'Salva', 'Speichern', 'Sauvegarder', 'Salvare');
SELECT insert_translation('common.delete', 'common', 'Delete button', 'Delete', 'Eliminar', 'Excluir', 'Elimina', 'Löschen', 'Supprimer', 'Ștergere');
SELECT insert_translation('common.edit', 'common', 'Edit button', 'Edit', 'Editar', 'Editar', 'Modifica', 'Bearbeiten', 'Modifier', 'Editare');
SELECT insert_translation('common.close', 'common', 'Close button', 'Close', 'Cerrar', 'Fechar', 'Chiudi', 'Schließen', 'Fermer', 'Închide');
SELECT insert_translation('common.yes', 'common', 'Yes', 'Yes', 'Sí', 'Sim', 'Sì', 'Ja', 'Oui', 'Da');
SELECT insert_translation('common.no', 'common', 'No', 'No', 'No', 'Não', 'No', 'Nein', 'Non', 'Nu');
SELECT insert_translation('common.search', 'common', 'Search', 'Search', 'Buscar', 'Pesquisar', 'Cerca', 'Suchen', 'Rechercher', 'Căutare');
SELECT insert_translation('common.loading', 'common', 'Loading message', 'Loading...', 'Cargando...', 'Carregando...', 'Caricamento...', 'Laden...', 'Chargement...', 'Se încarcă...');

-- Authentication translations
SELECT insert_translation('auth.username', 'auth', 'Username label', 'Username', 'Nombre de usuario', 'Nome de usuário', 'Nome utente', 'Benutzername', 'Nom d''utilisateur', 'Nume utilizator');
SELECT insert_translation('auth.email', 'auth', 'Email label', 'Email', 'Correo electrónico', 'E-mail', 'Email', 'E-Mail', 'E-mail', 'Email');
SELECT insert_translation('auth.password', 'auth', 'Password label', 'Password', 'Contraseña', 'Senha', 'Password', 'Passwort', 'Mot de passe', 'Parolă');
SELECT insert_translation('auth.confirm_password', 'auth', 'Confirm password', 'Confirm Password', 'Confirmar contraseña', 'Confirmar senha', 'Conferma password', 'Passwort bestätigen', 'Confirmer le mot de passe', 'Confirmă parola');
SELECT insert_translation('auth.forgot_password', 'auth', 'Forgot password link', 'Forgot Password?', '¿Olvidaste tu contraseña?', 'Esqueceu a senha?', 'Password dimenticata?', 'Passwort vergessen?', 'Mot de passe oublié?', 'Ai uitat parola?');
SELECT insert_translation('auth.remember_me', 'auth', 'Remember me checkbox', 'Remember Me', 'Recuérdame', 'Lembrar-me', 'Ricordami', 'Angemeldet bleiben', 'Se souvenir de moi', 'Ține-mă minte');

-- Error messages
SELECT insert_translation('error.invalid_credentials', 'errors', 'Invalid login credentials', 'Invalid username or password', 'Usuario o contraseña inválidos', 'Usuário ou senha inválidos', 'Nome utente o password non validi', 'Ungültiger Benutzername oder Passwort', 'Nom d''utilisateur ou mot de passe invalide', 'Nume utilizator sau parolă invalidă');
SELECT insert_translation('error.required_field', 'errors', 'Required field error', 'This field is required', 'Este campo es obligatorio', 'Este campo é obrigatório', 'Questo campo è obbligatorio', 'Dieses Feld ist erforderlich', 'Ce champ est obligatoire', 'Acest câmp este obligatoriu');
SELECT insert_translation('error.invalid_email', 'errors', 'Invalid email format', 'Invalid email format', 'Formato de correo inválido', 'Formato de e-mail inválido', 'Formato email non valido', 'Ungültiges E-Mail-Format', 'Format d''e-mail invalide', 'Format email invalid');
SELECT insert_translation('error.password_mismatch', 'errors', 'Passwords don''t match', 'Passwords do not match', 'Las contraseñas no coinciden', 'As senhas não coincidem', 'Le password non corrispondono', 'Passwörter stimmen nicht überein', 'Les mots de passe ne correspondent pas', 'Parolele nu coincid');

-- Responsible Gaming
SELECT insert_translation('rg.deposit_limit', 'responsible_gaming', 'Deposit limit', 'Deposit Limit', 'Límite de depósito', 'Limite de depósito', 'Limite di deposito', 'Einzahlungslimit', 'Limite de dépôt', 'Limită depunere');
SELECT insert_translation('rg.daily_limit', 'responsible_gaming', 'Daily limit', 'Daily Limit', 'Límite diario', 'Limite diário', 'Limite giornaliero', 'Tägliches Limit', 'Limite quotidienne', 'Limită zilnică');
SELECT insert_translation('rg.weekly_limit', 'responsible_gaming', 'Weekly limit', 'Weekly Limit', 'Límite semanal', 'Limite semanal', 'Limite settimanale', 'Wöchentliches Limit', 'Limite hebdomadaire', 'Limită săptămânală');
SELECT insert_translation('rg.monthly_limit', 'responsible_gaming', 'Monthly limit', 'Monthly Limit', 'Límite mensual', 'Limite mensal', 'Limite mensile', 'Monatliches Limit', 'Limite mensuelle', 'Limită lunară');
SELECT insert_translation('rg.self_exclusion', 'responsible_gaming', 'Self exclusion', 'Self-Exclusion', 'Autoexclusión', 'Autoexclusão', 'Autoesclusione', 'Selbstausschluss', 'Auto-exclusion', 'Auto-excludere');
SELECT insert_translation('rg.gamble_aware', 'responsible_gaming', 'Gamble responsibly', 'Gamble Responsibly', 'Juega responsablemente', 'Jogue com responsabilidade', 'Gioca responsabilmente', 'Verantwortungsvoll spielen', 'Jouez de manière responsable', 'Joacă responsabil');

-- Cleanup helper function
DROP FUNCTION insert_translation(VARCHAR, VARCHAR, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

-- =====================================================
-- TRIGGER FUNCTIONS
-- =====================================================

-- Auto-update user's preferred language timestamp
CREATE OR REPLACE FUNCTION update_language_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.preferred_language_id IS DISTINCT FROM OLD.preferred_language_id THEN
        NEW.language_updated_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_language_timestamp
BEFORE UPDATE ON user_profiles
FOR EACH ROW EXECUTE FUNCTION update_language_timestamp();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE languages IS 'Supported languages for the platform';
COMMENT ON TABLE translation_keys IS 'Unique keys for translatable strings';
COMMENT ON TABLE translation_values IS 'Translations for each key in different languages';

COMMENT ON COLUMN languages.is_default IS 'Default language when user has no preference';
COMMENT ON COLUMN languages.direction IS 'Text direction: ltr (left-to-right) or rtl (right-to-left) for Arabic, Hebrew, etc.';
COMMENT ON COLUMN translation_values.is_verified IS 'TRUE if translation is professionally verified';
