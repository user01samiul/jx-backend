import pool from "../../db/postgres";
import {
  CreatePaymentGatewayInputType,
  UpdatePaymentGatewayInputType
} from "../../api/admin/admin.schema";

// Create payment gateway table if it doesn't exist
export const createPaymentGatewayTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS payment_gateways (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(100) UNIQUE NOT NULL,
      type VARCHAR(50) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'both')),
      description TEXT,
      logo_url TEXT,
      website_url TEXT,
      api_endpoint TEXT,
      api_key TEXT,
      api_secret TEXT,
      merchant_id VARCHAR(255),
      payout_api_key VARCHAR(255),
      webhook_url TEXT,
      webhook_secret TEXT,
      is_active BOOLEAN DEFAULT true,
      supported_currencies TEXT[],
      supported_countries TEXT[],
      min_amount DECIMAL(15,2),
      max_amount DECIMAL(15,2),
      processing_time VARCHAR(100),
      fees_percentage DECIMAL(5,2) DEFAULT 0,
      fees_fixed DECIMAL(15,2) DEFAULT 0,
      auto_approval BOOLEAN DEFAULT false,
      requires_kyc BOOLEAN DEFAULT false,
      config JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  await pool.query(query);
};

// Create payment gateway
export const createPaymentGatewayService = async (gatewayData: CreatePaymentGatewayInputType) => {
  await createPaymentGatewayTable();
  
  const query = `
    INSERT INTO payment_gateways (
      name, code, type, description, logo_url, website_url, api_endpoint,
      api_key, api_secret, merchant_id, payout_api_key, webhook_url, webhook_secret, is_active,
      supported_currencies, supported_countries, min_amount, max_amount,
      processing_time, fees_percentage, fees_fixed, auto_approval,
      requires_kyc, config
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
    RETURNING *
  `;
  
  const values = [
    gatewayData.name,
    gatewayData.code,
    gatewayData.type,
    gatewayData.description,
    gatewayData.logo_url,
    gatewayData.website_url,
    gatewayData.api_endpoint,
    gatewayData.api_key,
    gatewayData.api_secret,
    gatewayData.merchant_id,
    gatewayData.payout_api_key,
    gatewayData.webhook_url,
    gatewayData.webhook_secret,
    gatewayData.is_active !== undefined ? gatewayData.is_active : true,
    gatewayData.supported_currencies,
    gatewayData.supported_countries,
    gatewayData.min_amount,
    gatewayData.max_amount,
    gatewayData.processing_time,
    gatewayData.fees_percentage,
    gatewayData.fees_fixed,
    gatewayData.auto_approval,
    gatewayData.requires_kyc,
    gatewayData.config
  ];
  
  const result = await pool.query(query, values);
  return result.rows[0];
};

// Update payment gateway
export const updatePaymentGatewayService = async (gatewayId: number, gatewayData: UpdatePaymentGatewayInputType) => {
  const fields: string[] = [];
  const values: any[] = [];
  let paramCount = 1;
  
  Object.entries(gatewayData).forEach(([key, value]) => {
    if (value !== undefined) {
      fields.push(`${key} = $${paramCount}`);
      values.push(value);
      paramCount++;
    }
  });
  
  if (fields.length === 0) {
    throw new Error("No valid fields to update");
  }
  
  values.push(gatewayId);
  const query = `
    UPDATE payment_gateways 
    SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${paramCount}
    RETURNING *
  `;
  
  const result = await pool.query(query, values);
  return result.rows[0];
};

// Get all payment gateways
export const getPaymentGatewaysService = async (filters: any = {}) => {
  await createPaymentGatewayTable();
  
  let query = "SELECT * FROM payment_gateways";
  const conditions = [];
  const values = [];
  let paramCount = 1;
  
  if (filters.type) {
    conditions.push(`type = $${paramCount}`);
    values.push(filters.type);
    paramCount++;
  }
  
  if (filters.is_active !== undefined) {
    conditions.push(`is_active = $${paramCount}`);
    values.push(filters.is_active);
    paramCount++;
  }
  
  if (filters.supported_currency) {
    conditions.push(`$${paramCount} = ANY(supported_currencies)`);
    values.push(filters.supported_currency);
    paramCount++;
  }
  
  if (filters.search) {
    conditions.push(`(name ILIKE $${paramCount} OR code ILIKE $${paramCount})`);
    values.push(`%${filters.search}%`);
    paramCount++;
  }
  
  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(" AND ")}`;
  }
  
  query += " ORDER BY created_at DESC";
  
  if (filters.limit) {
    query += ` LIMIT $${paramCount}`;
    values.push(filters.limit);
  }
  
  const result = await pool.query(query, values);
  return result.rows;
};

// Get payment gateway by ID
export const getPaymentGatewayByIdService = async (gatewayId: number) => {
  await createPaymentGatewayTable();
  
  const query = "SELECT * FROM payment_gateways WHERE id = $1";
  const result = await pool.query(query, [gatewayId]);
  return result.rows[0];
};

// Get payment gateway by code
export const getPaymentGatewayByCodeService = async (gatewayCode: string) => {
  await createPaymentGatewayTable();
  
  const query = "SELECT * FROM payment_gateways WHERE code = $1";
  const result = await pool.query(query, [gatewayCode]);
  return result.rows[0];
};

// Delete payment gateway
export const deletePaymentGatewayService = async (gatewayId: number) => {
  const query = "DELETE FROM payment_gateways WHERE id = $1 RETURNING *";
  const result = await pool.query(query, [gatewayId]);
  return result.rows[0];
};

// Get active payment gateways for a specific type and currency
export const getActivePaymentGatewaysService = async (type: string, currency: string) => {
  await createPaymentGatewayTable();
  
  const query = `
    SELECT * FROM payment_gateways 
    WHERE is_active = true 
    AND (type = $1 OR type = 'both')
    AND ($2 = ANY(supported_currencies) OR supported_currencies IS NULL)
    ORDER BY name
  `;
  
  const result = await pool.query(query, [type, currency]);
  return result.rows;
};

// Test payment gateway connection
export const testPaymentGatewayConnectionService = async (gatewayId: number) => {
  const gateway = await getPaymentGatewayByIdService(gatewayId);
  
  if (!gateway) {
    throw new Error("Payment gateway not found");
  }
  
  try {
    const { PaymentIntegrationService } = require("../payment/payment-integration.service");
    const paymentService = PaymentIntegrationService.getInstance();
    
    const config = {
      api_key: gateway.api_key,
      api_secret: gateway.api_secret,
      api_endpoint: gateway.api_endpoint,
      webhook_url: gateway.webhook_url,
      webhook_secret: gateway.webhook_secret,
      config: gateway.config,
    };

    const result = await paymentService.testGatewayConnection(gateway.code, config);
    
    return {
      gateway_id: gatewayId,
      gateway_name: gateway.name,
      gateway_code: gateway.code,
      connection_status: result.success ? "success" : "failed",
      message: result.message,
      last_tested: new Date(),
      details: {
        api_endpoint: gateway.api_endpoint,
        is_active: gateway.is_active,
        supported_currencies: gateway.supported_currencies,
        test_result: result
      }
    };
  } catch (error) {
    return {
      gateway_id: gatewayId,
      gateway_name: gateway.name,
      gateway_code: gateway.code,
      connection_status: "failed",
      message: error instanceof Error ? error.message : "Connection test failed",
      last_tested: new Date(),
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
};

// Get payment gateway statistics
export const getPaymentGatewayStatsService = async (gatewayId: number, startDate?: string, endDate?: string) => {
  let query = `
    SELECT 
      pg.name as gateway_name,
      COUNT(t.id) as total_transactions,
      SUM(t.amount) as total_amount,
      COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_transactions,
      COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending_transactions,
      COUNT(CASE WHEN t.status = 'failed' THEN 1 END) as failed_transactions,
      AVG(t.amount) as avg_transaction_amount,
      MIN(t.created_at) as first_transaction,
      MAX(t.created_at) as last_transaction
    FROM payment_gateways pg
    LEFT JOIN transactions t ON t.payment_method = pg.code
  `;
  
  const conditions = [`pg.id = $1`];
  const values: (string | number)[] = [gatewayId];
  let paramCount = 2;
  
  if (startDate) {
    conditions.push(`t.created_at >= $${paramCount}`);
    values.push(startDate);
    paramCount++;
  }
  
  if (endDate) {
    conditions.push(`t.created_at <= $${paramCount}`);
    values.push(endDate);
    paramCount++;
  }
  
  query += ` WHERE ${conditions.join(" AND ")}`;
  query += " GROUP BY pg.id, pg.name";
  
  const result = await pool.query(query, values);
  return result.rows[0];
}; 