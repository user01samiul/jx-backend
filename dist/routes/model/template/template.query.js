"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateQuery = void 0;
exports.TemplateQuery = {
    // Template queries
    GET_ALL_TEMPLATES: `
    SELECT 
      t.*,
      COUNT(tc.id) as configs_count,
      COUNT(tf.id) as features_count
    FROM templates t
    LEFT JOIN template_configs tc ON t.id = tc.template_id
    LEFT JOIN template_features tf ON t.id = tf.template_id
    WHERE t.is_active = true
    GROUP BY t.id
    ORDER BY t.is_default DESC, t.name ASC
  `,
    GET_TEMPLATE_BY_ID: `
    SELECT * FROM templates WHERE id = $1 AND is_active = true
  `,
    GET_TEMPLATE_WITH_CONFIGS: `
    SELECT 
      t.*,
      tc.id as config_id,
      tc.config_key,
      tc.config_value,
      tc.config_type,
      tc.is_required
    FROM templates t
    LEFT JOIN template_configs tc ON t.id = tc.template_id
    WHERE t.id = $1 AND t.is_active = true
    ORDER BY tc.config_key
  `,
    GET_TEMPLATE_WITH_FEATURES: `
    SELECT 
      t.*,
      tf.id as feature_id,
      tf.feature_name,
      tf.feature_key,
      tf.feature_type,
      tf.feature_config,
      tf.is_enabled,
      tf.is_premium,
      tf.price,
      tf.sort_order
    FROM templates t
    LEFT JOIN template_features tf ON t.id = tf.template_id
    WHERE t.id = $1 AND t.is_active = true
    ORDER BY tf.sort_order, tf.feature_name
  `,
    GET_TEMPLATE_BY_TYPE: `
    SELECT * FROM templates 
    WHERE type = $1 AND is_active = true 
    ORDER BY is_default DESC, name ASC
  `,
    GET_DEFAULT_TEMPLATE_BY_TYPE: `
    SELECT * FROM templates 
    WHERE type = $1 AND is_default = true AND is_active = true 
    LIMIT 1
  `,
    CREATE_TEMPLATE: `
    INSERT INTO templates (name, description, type, category, version, author, is_premium, price, currency)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `,
    UPDATE_TEMPLATE: `
    UPDATE templates 
    SET name = COALESCE($2, name),
        description = COALESCE($3, description),
        category = COALESCE($4, category),
        version = COALESCE($5, version),
        author = COALESCE($6, author),
        is_active = COALESCE($7, is_active),
        is_premium = COALESCE($8, is_premium),
        price = COALESCE($9, price),
        currency = COALESCE($10, currency),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `,
    DELETE_TEMPLATE: `
    UPDATE templates SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1
  `,
    // Template configs queries
    GET_TEMPLATE_CONFIGS: `
    SELECT * FROM template_configs WHERE template_id = $1 ORDER BY config_key
  `,
    CREATE_TEMPLATE_CONFIG: `
    INSERT INTO template_configs (template_id, config_key, config_value, config_type, is_required)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `,
    UPDATE_TEMPLATE_CONFIG: `
    UPDATE template_configs 
    SET config_value = $3, config_type = $4, is_required = $5
    WHERE template_id = $1 AND config_key = $2
    RETURNING *
  `,
    DELETE_TEMPLATE_CONFIG: `
    DELETE FROM template_configs WHERE template_id = $1 AND config_key = $2
  `,
    // Template features queries
    GET_TEMPLATE_FEATURES: `
    SELECT * FROM template_features 
    WHERE template_id = $1 AND is_enabled = true 
    ORDER BY sort_order, feature_name
  `,
    GET_TEMPLATE_FEATURE_BY_KEY: `
    SELECT * FROM template_features 
    WHERE template_id = $1 AND feature_key = $2 AND is_enabled = true
  `,
    CREATE_TEMPLATE_FEATURE: `
    INSERT INTO template_features (template_id, feature_name, feature_key, feature_type, feature_config, is_enabled, is_premium, price, sort_order)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `,
    UPDATE_TEMPLATE_FEATURE: `
    UPDATE template_features 
    SET feature_name = COALESCE($3, feature_name),
        feature_config = COALESCE($4, feature_config),
        is_enabled = COALESCE($5, is_enabled),
        is_premium = COALESCE($6, is_premium),
        price = COALESCE($7, price),
        sort_order = COALESCE($8, sort_order)
    WHERE template_id = $1 AND feature_key = $2
    RETURNING *
  `,
    DELETE_TEMPLATE_FEATURE: `
    DELETE FROM template_features WHERE template_id = $1 AND feature_key = $2
  `,
    // User templates queries
    GET_USER_TEMPLATE: `
    SELECT 
      ut.*,
      t.name as template_name,
      t.description as template_description,
      t.type as template_type,
      t.category as template_category,
      t.is_premium as template_is_premium,
      t.price as template_price
    FROM user_templates ut
    JOIN templates t ON ut.template_id = t.id
    WHERE ut.user_id = $1 AND ut.is_active = true
    LIMIT 1
  `,
    GET_USER_TEMPLATE_WITH_FEATURES: `
    SELECT 
      ut.*,
      t.name as template_name,
      t.description as template_description,
      t.type as template_type,
      t.category as template_category,
      t.is_premium as template_is_premium,
      t.price as template_price,
      tf.id as feature_id,
      tf.feature_name,
      tf.feature_key,
      tf.feature_type,
      tf.feature_config,
      tf.is_enabled as feature_enabled,
      tf.is_premium as feature_is_premium,
      tf.price as feature_price,
      tf.sort_order,
      utf.is_enabled as user_feature_enabled,
      utf.custom_config as user_feature_config,
      utf.purchased_at
    FROM user_templates ut
    JOIN templates t ON ut.template_id = t.id
    LEFT JOIN template_features tf ON t.id = tf.template_id AND tf.is_enabled = true
    LEFT JOIN user_template_features utf ON ut.user_id = utf.user_id AND ut.template_id = utf.template_id AND tf.id = utf.feature_id
    WHERE ut.user_id = $1 AND ut.is_active = true
    ORDER BY tf.sort_order, tf.feature_name
  `,
    CREATE_USER_TEMPLATE: `
    INSERT INTO user_templates (user_id, template_id, is_active, custom_config)
    VALUES ($1, $2, true, $3)
    RETURNING *
  `,
    UPDATE_USER_TEMPLATE: `
    UPDATE user_templates 
    SET custom_config = COALESCE($3, custom_config),
        is_active = COALESCE($4, is_active)
    WHERE user_id = $1 AND template_id = $2
    RETURNING *
  `,
    DEACTIVATE_USER_TEMPLATE: `
    UPDATE user_templates SET is_active = false WHERE user_id = $1 AND template_id = $2
  `,
    // User template features queries
    GET_USER_TEMPLATE_FEATURES: `
    SELECT 
      utf.*,
      tf.feature_name,
      tf.feature_key,
      tf.feature_type,
      tf.feature_config,
      tf.is_premium,
      tf.price
    FROM user_template_features utf
    JOIN template_features tf ON utf.feature_id = tf.id
    WHERE utf.user_id = $1 AND utf.template_id = $2
    ORDER BY tf.sort_order
  `,
    CREATE_USER_TEMPLATE_FEATURE: `
    INSERT INTO user_template_features (user_id, template_id, feature_id, is_enabled, custom_config)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `,
    UPDATE_USER_TEMPLATE_FEATURE: `
    UPDATE user_template_features 
    SET is_enabled = COALESCE($4, is_enabled),
        custom_config = COALESCE($5, custom_config)
    WHERE user_id = $1 AND template_id = $2 AND feature_id = $3
    RETURNING *
  `,
    // Default templates queries
    GET_DEFAULT_TEMPLATE_BY_LEVEL: `
    SELECT 
      dt.*,
      t.name as template_name,
      t.description as template_description,
      t.type as template_type,
      t.category as template_category
    FROM default_templates dt
    JOIN templates t ON dt.template_id = t.id
    WHERE dt.user_level_id = $1 AND dt.is_active = true AND t.is_active = true
    LIMIT 1
  `,
    SET_DEFAULT_TEMPLATE_FOR_LEVEL: `
    INSERT INTO default_templates (user_level_id, template_id, is_active)
    VALUES ($1, $2, true)
    ON CONFLICT (user_level_id, template_id) 
    DO UPDATE SET is_active = true
    RETURNING *
  `,
    // Template purchase queries
    CREATE_TEMPLATE_PURCHASE: `
    INSERT INTO template_purchases (user_id, template_id, feature_id, purchase_type, amount, currency, payment_method, transaction_id, status, payment_data)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `,
    GET_USER_PURCHASES: `
    SELECT 
      tp.*,
      t.name as template_name,
      tf.feature_name
    FROM template_purchases tp
    LEFT JOIN templates t ON tp.template_id = t.id
    LEFT JOIN template_features tf ON tp.feature_id = tf.id
    WHERE tp.user_id = $1
    ORDER BY tp.created_at DESC
  `,
    // Available templates for user
    GET_AVAILABLE_TEMPLATES_FOR_USER: `
    SELECT 
      t.*,
      CASE WHEN ut.id IS NOT NULL THEN true ELSE false END as is_assigned,
      CASE WHEN ut.is_active = true THEN true ELSE false END as is_active_template
    FROM templates t
    LEFT JOIN user_templates ut ON t.id = ut.template_id AND ut.user_id = $1
    WHERE t.type = 'user' AND t.is_active = true
    ORDER BY t.is_default DESC, t.name ASC
  `,
    // User's purchased features
    GET_USER_PURCHASED_FEATURES: `
    SELECT 
      tf.*,
      t.name as template_name,
      utf.is_enabled as user_enabled,
      utf.custom_config as user_config
    FROM user_template_features utf
    JOIN template_features tf ON utf.feature_id = tf.id
    JOIN templates t ON utf.template_id = t.id
    WHERE utf.user_id = $1
    ORDER BY t.name, tf.sort_order
  `
};
