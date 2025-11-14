-- =====================================================
-- CMS SYSTEM (Content Management System)
-- =====================================================

DROP TABLE IF EXISTS cms_page_components CASCADE;
DROP TABLE IF EXISTS cms_components CASCADE;
DROP TABLE IF EXISTS cms_pages CASCADE;

-- =====================================================
-- CMS PAGES TABLE
-- =====================================================
CREATE TABLE cms_pages (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(255) UNIQUE NOT NULL, -- URL slug (about-us, terms-conditions, privacy-policy, etc.)
    title VARCHAR(255) NOT NULL,
    page_type VARCHAR(50) NOT NULL CHECK (page_type IN ('CONTACT', 'GRID', 'EXTERNAL', 'ACCORDION', 'SIMPLE', 'CUSTOM')),
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    content JSONB, -- Page-specific content structure
    -- SEO Meta tags
    meta_title VARCHAR(255),
    meta_description TEXT,
    meta_keywords TEXT,
    og_image_url TEXT, -- Open Graph image
    -- Scheduling
    published_at TIMESTAMP WITH TIME ZONE,
    scheduled_publish_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    -- Versioning
    version INTEGER DEFAULT 1,
    parent_version_id INTEGER REFERENCES cms_pages(id),
    -- Access control
    requires_auth BOOLEAN DEFAULT FALSE,
    allowed_roles TEXT[], -- Array of role IDs
    -- Multilanguage support
    language_code VARCHAR(10) DEFAULT 'en',
    translations JSONB, -- { "es": { "title": "...", "content": {...} }, ... }
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_cms_pages_slug ON cms_pages(slug);
CREATE INDEX idx_cms_pages_status ON cms_pages(status);
CREATE INDEX idx_cms_pages_page_type ON cms_pages(page_type);
CREATE INDEX idx_cms_pages_published_at ON cms_pages(published_at);
CREATE INDEX idx_cms_pages_language_code ON cms_pages(language_code);

-- =====================================================
-- CMS COMPONENTS TABLE (Reusable components)
-- =====================================================
CREATE TABLE cms_components (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    component_type VARCHAR(50) NOT NULL, -- 'HERO', 'CARD', 'FORM', 'TEXT_BLOCK', 'IMAGE', 'VIDEO', 'BUTTON', 'DIVIDER', etc.
    content JSONB NOT NULL, -- Component-specific content
    is_global BOOLEAN DEFAULT FALSE, -- Available globally across pages
    category VARCHAR(100), -- For organization (header, footer, promo, etc.)
    preview_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_cms_components_name ON cms_components(name);
CREATE INDEX idx_cms_components_type ON cms_components(component_type);
CREATE INDEX idx_cms_components_is_global ON cms_components(is_global);
CREATE INDEX idx_cms_components_category ON cms_components(category);

-- =====================================================
-- CMS PAGE COMPONENTS (M:N relationship)
-- =====================================================
CREATE TABLE cms_page_components (
    id SERIAL PRIMARY KEY,
    page_id INTEGER NOT NULL REFERENCES cms_pages(id) ON DELETE CASCADE,
    component_id INTEGER NOT NULL REFERENCES cms_components(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    section VARCHAR(100), -- 'header', 'body', 'sidebar', 'footer'
    is_visible BOOLEAN DEFAULT TRUE,
    custom_props JSONB, -- Override component props for this specific page
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cms_page_components_page_id ON cms_page_components(page_id);
CREATE INDEX idx_cms_page_components_component_id ON cms_page_components(component_id);
CREATE INDEX idx_cms_page_components_section ON cms_page_components(section);
CREATE INDEX idx_cms_page_components_sort_order ON cms_page_components(sort_order);

-- =====================================================
-- ENHANCE BANNERS TABLE (for Carousel)
-- =====================================================
ALTER TABLE banners
ADD COLUMN IF NOT EXISTS rotation_time_ms INTEGER DEFAULT 5000 CHECK (rotation_time_ms > 0),
ADD COLUMN IF NOT EXISTS visible_from TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS visible_to TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS visible_on_logout BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS delete_on_expiry BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS page_location VARCHAR(50) DEFAULT 'home', -- 'home', 'games', 'promotions', etc.
ADD COLUMN IF NOT EXISTS link_url TEXT,
ADD COLUMN IF NOT EXISTS link_target VARCHAR(20) DEFAULT '_self' CHECK (link_target IN ('_self', '_blank')),
ADD COLUMN IF NOT EXISTS alt_text TEXT,
ADD COLUMN IF NOT EXISTS translations JSONB, -- Multi-language title/description
ADD COLUMN IF NOT EXISTS cta_text VARCHAR(100), -- Call-to-action button text
ADD COLUMN IF NOT EXISTS cta_link TEXT; -- CTA button link

CREATE INDEX IF NOT EXISTS idx_banners_visible_from ON banners(visible_from);
CREATE INDEX IF NOT EXISTS idx_banners_visible_to ON banners(visible_to);
CREATE INDEX IF NOT EXISTS idx_banners_page_location ON banners(page_location);
CREATE INDEX IF NOT EXISTS idx_banners_visible_on_logout ON banners(visible_on_logout);

-- =====================================================
-- SAMPLE CMS PAGES
-- =====================================================
INSERT INTO cms_pages (slug, title, page_type, status, content, meta_title, meta_description, published_at) VALUES
(
    'about-us',
    'About Us',
    'SIMPLE',
    'PUBLISHED',
    '{
        "blocks": [
            {
                "type": "heading",
                "level": 1,
                "text": "About JackpotX"
            },
            {
                "type": "paragraph",
                "text": "Welcome to JackpotX, your premier destination for online gaming entertainment."
            },
            {
                "type": "image",
                "url": "/images/about-hero.jpg",
                "alt": "JackpotX Team",
                "width": "100%"
            },
            {
                "type": "heading",
                "level": 2,
                "text": "Our Mission"
            },
            {
                "type": "paragraph",
                "text": "To provide a safe, fair, and entertaining gaming experience for players worldwide."
            }
        ]
    }',
    'About Us - JackpotX',
    'Learn more about JackpotX, our mission, and our commitment to responsible gaming.',
    CURRENT_TIMESTAMP
),
(
    'terms-and-conditions',
    'Terms and Conditions',
    'ACCORDION',
    'PUBLISHED',
    '{
        "sections": [
            {
                "title": "1. Acceptance of Terms",
                "content": "By accessing and using this website, you accept and agree to be bound by the terms and provision of this agreement."
            },
            {
                "title": "2. Use License",
                "content": "Permission is granted to temporarily download one copy of the materials on JackpotX for personal, non-commercial transitory viewing only."
            },
            {
                "title": "3. Account Registration",
                "content": "Users must be 18 years or older to create an account. You are responsible for maintaining the confidentiality of your account credentials."
            },
            {
                "title": "4. Responsible Gaming",
                "content": "We are committed to responsible gaming. Players can set deposit limits, loss limits, and self-exclusion options."
            }
        ]
    }',
    'Terms and Conditions - JackpotX',
    'Read our terms and conditions before using JackpotX services.',
    CURRENT_TIMESTAMP
),
(
    'privacy-policy',
    'Privacy Policy',
    'SIMPLE',
    'PUBLISHED',
    '{
        "blocks": [
            {
                "type": "heading",
                "level": 1,
                "text": "Privacy Policy"
            },
            {
                "type": "paragraph",
                "text": "Your privacy is important to us. This policy explains how we collect, use, and protect your personal information."
            },
            {
                "type": "heading",
                "level": 2,
                "text": "Information We Collect"
            },
            {
                "type": "list",
                "items": [
                    "Personal identification information (Name, email address, phone number, etc.)",
                    "Financial information for deposits and withdrawals",
                    "Gameplay and betting history",
                    "IP addresses and device information",
                    "Cookies and tracking data"
                ]
            },
            {
                "type": "heading",
                "level": 2,
                "text": "How We Use Your Information"
            },
            {
                "type": "paragraph",
                "text": "We use the information we collect to provide and improve our services, process transactions, prevent fraud, and comply with legal obligations."
            }
        ]
    }',
    'Privacy Policy - JackpotX',
    'Learn how JackpotX collects, uses, and protects your personal information.',
    CURRENT_TIMESTAMP
),
(
    'responsible-gaming',
    'Responsible Gaming',
    'SIMPLE',
    'PUBLISHED',
    '{
        "blocks": [
            {
                "type": "heading",
                "level": 1,
                "text": "Responsible Gaming"
            },
            {
                "type": "paragraph",
                "text": "At JackpotX, we are committed to promoting responsible gaming and providing tools to help you stay in control."
            },
            {
                "type": "heading",
                "level": 2,
                "text": "Tools Available"
            },
            {
                "type": "list",
                "items": [
                    "Deposit Limits (Daily, Weekly, Monthly)",
                    "Loss Limits",
                    "Session Time Limits",
                    "Self-Exclusion Options (Temporary or Permanent)",
                    "Reality Checks"
                ]
            },
            {
                "type": "button",
                "text": "Set Your Limits",
                "url": "/account/responsible-gaming",
                "style": "primary"
            }
        ]
    }',
    'Responsible Gaming - JackpotX',
    'Learn about our responsible gaming tools and how to gamble safely.',
    CURRENT_TIMESTAMP
),
(
    'contact',
    'Contact Us',
    'CONTACT',
    'PUBLISHED',
    '{
        "form_fields": [
            {
                "name": "name",
                "type": "text",
                "label": "Your Name",
                "required": true,
                "placeholder": "John Doe"
            },
            {
                "name": "email",
                "type": "email",
                "label": "Email Address",
                "required": true,
                "placeholder": "john@example.com"
            },
            {
                "name": "subject",
                "type": "select",
                "label": "Subject",
                "required": true,
                "options": [
                    {"value": "general", "label": "General Inquiry"},
                    {"value": "support", "label": "Technical Support"},
                    {"value": "payments", "label": "Payment Issues"},
                    {"value": "account", "label": "Account Questions"},
                    {"value": "complaint", "label": "Complaint"}
                ]
            },
            {
                "name": "message",
                "type": "textarea",
                "label": "Message",
                "required": true,
                "placeholder": "How can we help you?",
                "rows": 5
            }
        ],
        "submit_button_text": "Send Message",
        "success_message": "Thank you for contacting us! We will respond within 24 hours.",
        "email_to": "support@jackpotx.com"
    }',
    'Contact Us - JackpotX',
    'Get in touch with the JackpotX support team.',
    CURRENT_TIMESTAMP
)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- TRIGGER: Auto-publish scheduled pages
-- =====================================================
CREATE OR REPLACE FUNCTION auto_publish_scheduled_pages()
RETURNS INTEGER AS $$
DECLARE
    affected_count INTEGER;
BEGIN
    UPDATE cms_pages
    SET status = 'PUBLISHED',
        published_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE status = 'DRAFT'
    AND scheduled_publish_at IS NOT NULL
    AND scheduled_publish_at <= CURRENT_TIMESTAMP;

    GET DIAGNOSTICS affected_count = ROW_COUNT;

    RETURN affected_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER: Auto-archive expired pages
-- =====================================================
CREATE OR REPLACE FUNCTION auto_archive_expired_pages()
RETURNS INTEGER AS $$
DECLARE
    affected_count INTEGER;
BEGIN
    UPDATE cms_pages
    SET status = 'ARCHIVED',
        updated_at = CURRENT_TIMESTAMP
    WHERE status = 'PUBLISHED'
    AND expires_at IS NOT NULL
    AND expires_at <= CURRENT_TIMESTAMP;

    GET DIAGNOSTICS affected_count = ROW_COUNT;

    RETURN affected_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER: Delete expired banners
-- =====================================================
CREATE OR REPLACE FUNCTION delete_expired_banners()
RETURNS INTEGER AS $$
DECLARE
    affected_count INTEGER;
BEGIN
    DELETE FROM banners
    WHERE delete_on_expiry = TRUE
    AND visible_to IS NOT NULL
    AND visible_to <= CURRENT_TIMESTAMP;

    GET DIAGNOSTICS affected_count = ROW_COUNT;

    RETURN affected_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE cms_pages IS 'Dynamic CMS pages (about, terms, privacy, etc.)';
COMMENT ON TABLE cms_components IS 'Reusable content components';
COMMENT ON TABLE cms_page_components IS 'Components used in pages (many-to-many)';

COMMENT ON COLUMN cms_pages.page_type IS 'Type of page: CONTACT (form), GRID (cards), EXTERNAL (redirect), ACCORDION (FAQ), SIMPLE (rich text)';
COMMENT ON COLUMN cms_pages.content IS 'JSONB content structure specific to page_type';
COMMENT ON COLUMN cms_pages.translations IS 'Multilanguage translations for title and content';
COMMENT ON COLUMN banners.rotation_time_ms IS 'Carousel rotation time in milliseconds';
COMMENT ON COLUMN banners.visible_on_logout IS 'Show banner only on logout page';
