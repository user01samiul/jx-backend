-- Create KYC verifications table
CREATE TABLE IF NOT EXISTS kyc_verifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',
        'approved',
        'rejected',
        'under_review',
        'expired',
        'cancelled'
    )),
    reason TEXT,
    admin_notes TEXT,
    verification_date TIMESTAMP,
    expiry_date TIMESTAMP,
    risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    compliance_level VARCHAR(10) CHECK (compliance_level IN ('low', 'medium', 'high')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create KYC documents table
CREATE TABLE IF NOT EXISTS kyc_documents (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN (
        'passport',
        'national_id',
        'drivers_license',
        'utility_bill',
        'bank_statement',
        'selfie',
        'proof_of_address',
        'proof_of_income',
        'tax_document',
        'other'
    )),
    file_url VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',
        'approved',
        'rejected',
        'under_review',
        'expired',
        'cancelled'
    )),
    reason TEXT,
    admin_notes TEXT,
    verification_method VARCHAR(20) CHECK (verification_method IN ('manual', 'automated', 'third_party')),
    verified_by VARCHAR(100),
    verification_date TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create KYC risk assessments table
CREATE TABLE IF NOT EXISTS kyc_risk_assessments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    risk_factors TEXT[], -- Array of risk factors
    risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    assessment_notes TEXT,
    recommended_actions TEXT[], -- Array of recommended actions
    assessment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create KYC audit logs table
CREATE TABLE IF NOT EXISTS kyc_audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- 'verification', 'document', 'risk_assessment'
    entity_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_kyc_verifications_user_id ON kyc_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_verifications_status ON kyc_verifications(status);
CREATE INDEX IF NOT EXISTS idx_kyc_verifications_created_at ON kyc_verifications(created_at);
CREATE INDEX IF NOT EXISTS idx_kyc_verifications_risk_score ON kyc_verifications(risk_score);
CREATE INDEX IF NOT EXISTS idx_kyc_verifications_compliance_level ON kyc_verifications(compliance_level);

CREATE INDEX IF NOT EXISTS idx_kyc_documents_user_id ON kyc_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_type ON kyc_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_status ON kyc_documents(status);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_created_at ON kyc_documents(created_at);

CREATE INDEX IF NOT EXISTS idx_kyc_risk_assessments_user_id ON kyc_risk_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_risk_assessments_risk_level ON kyc_risk_assessments(risk_level);
CREATE INDEX IF NOT EXISTS idx_kyc_risk_assessments_created_at ON kyc_risk_assessments(created_at);

CREATE INDEX IF NOT EXISTS idx_kyc_audit_logs_user_id ON kyc_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_audit_logs_admin_id ON kyc_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_kyc_audit_logs_action ON kyc_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_kyc_audit_logs_created_at ON kyc_audit_logs(created_at);

-- Create unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_kyc_verification_user ON kyc_verifications(user_id);

-- Add comments for documentation
COMMENT ON TABLE kyc_verifications IS 'Stores KYC verification status and details for users';
COMMENT ON TABLE kyc_documents IS 'Stores uploaded KYC documents and their verification status';
COMMENT ON TABLE kyc_risk_assessments IS 'Stores risk assessments for KYC verification';
COMMENT ON TABLE kyc_audit_logs IS 'Stores audit trail for all KYC-related actions';

COMMENT ON COLUMN kyc_verifications.status IS 'Current status of KYC verification';
COMMENT ON COLUMN kyc_verifications.risk_score IS 'Risk score from 0-100 (0=low risk, 100=high risk)';
COMMENT ON COLUMN kyc_verifications.compliance_level IS 'Compliance level based on verification';
COMMENT ON COLUMN kyc_verifications.verification_date IS 'When the KYC was verified';
COMMENT ON COLUMN kyc_verifications.expiry_date IS 'When the KYC verification expires';

COMMENT ON COLUMN kyc_documents.document_type IS 'Type of document uploaded';
COMMENT ON COLUMN kyc_documents.file_url IS 'URL to the uploaded document file';
COMMENT ON COLUMN kyc_documents.file_size IS 'Size of the file in bytes';
COMMENT ON COLUMN kyc_documents.mime_type IS 'MIME type of the file';
COMMENT ON COLUMN kyc_documents.verification_method IS 'Method used to verify the document';
COMMENT ON COLUMN kyc_documents.verified_by IS 'Username of admin who verified the document';

COMMENT ON COLUMN kyc_risk_assessments.risk_factors IS 'Array of identified risk factors';
COMMENT ON COLUMN kyc_risk_assessments.risk_score IS 'Calculated risk score from 0-100';
COMMENT ON COLUMN kyc_risk_assessments.risk_level IS 'Risk level classification';
COMMENT ON COLUMN kyc_risk_assessments.recommended_actions IS 'Array of recommended actions to mitigate risk';

COMMENT ON COLUMN kyc_audit_logs.action IS 'Action performed (create, update, delete, approve, reject)';
COMMENT ON COLUMN kyc_audit_logs.entity_type IS 'Type of entity affected (verification, document, risk_assessment)';
COMMENT ON COLUMN kyc_audit_logs.entity_id IS 'ID of the affected entity';
COMMENT ON COLUMN kyc_audit_logs.old_values IS 'Previous values before the action';
COMMENT ON COLUMN kyc_audit_logs.new_values IS 'New values after the action';

-- Add KYC-related columns to users table if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'kyc_verified') THEN
        ALTER TABLE users ADD COLUMN kyc_verified BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'kyc_verified_at') THEN
        ALTER TABLE users ADD COLUMN kyc_verified_at TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'kyc_status') THEN
        ALTER TABLE users ADD COLUMN kyc_status VARCHAR(20) DEFAULT 'not_submitted' CHECK (kyc_status IN ('not_submitted', 'pending', 'approved', 'rejected', 'expired'));
    END IF;
END $$;

-- Create indexes for new user columns
CREATE INDEX IF NOT EXISTS idx_users_kyc_verified ON users(kyc_verified);
CREATE INDEX IF NOT EXISTS idx_users_kyc_status ON users(kyc_status);

-- Insert sample KYC verification for testing
INSERT INTO kyc_verifications (
    user_id,
    status,
    risk_score,
    compliance_level
) VALUES 
(1, 'pending', 25, 'low'),
(2, 'approved', 15, 'low'),
(3, 'under_review', 45, 'medium') ON CONFLICT DO NOTHING; 