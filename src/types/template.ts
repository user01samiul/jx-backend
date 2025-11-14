export interface Template {
  id: number;
  name: string;
  description?: string;
  type: 'admin' | 'user' | 'premium';
  category: string;
  version: string;
  author?: string;
  is_active: boolean;
  is_default: boolean;
  is_premium: boolean;
  price: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface TemplateConfig {
  id: number;
  template_id: number;
  config_key: string;
  config_value: any;
  config_type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  is_required: boolean;
  created_at: string;
}

export interface TemplateFeature {
  id: number;
  template_id: number;
  feature_name: string;
  feature_key: string;
  feature_type: 'navigation' | 'color_scheme' | 'layout' | 'widget' | 'animation' | 'custom_css' | 'custom_js';
  feature_config: any;
  is_enabled: boolean;
  is_premium: boolean;
  price: number;
  sort_order: number;
  created_at: string;
}

export interface UserTemplate {
  id: number;
  user_id: number;
  template_id: number;
  is_active: boolean;
  custom_config: any;
  activated_at: string;
  created_at: string;
}

export interface UserTemplateFeature {
  id: number;
  user_id: number;
  template_id: number;
  feature_id: number;
  is_enabled: boolean;
  custom_config: any;
  purchased_at: string;
  created_at: string;
}

export interface DefaultTemplate {
  id: number;
  user_level_id: number;
  template_id: number;
  is_active: boolean;
  created_at: string;
}

export interface TemplateWithConfigs extends Template {
  configs: TemplateConfig[];
  features: TemplateFeature[];
}

export interface UserTemplateWithDetails extends UserTemplate {
  template: Template;
  features: (TemplateFeature & { user_feature?: UserTemplateFeature })[];
}

export interface TemplatePurchase {
  id: number;
  user_id: number;
  template_id?: number;
  feature_id?: number;
  purchase_type: 'template' | 'feature';
  amount: number;
  currency: string;
  payment_method?: string;
  transaction_id?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_data?: any;
  created_at: string;
}

// Template configuration interfaces
export interface NavigationConfig {
  menu_items: NavigationItem[];
  position?: 'top' | 'sidebar' | 'bottom';
  style?: 'horizontal' | 'vertical' | 'dropdown';
}

export interface NavigationItem {
  label: string;
  icon?: string;
  url?: string;
  action?: string;
  children?: NavigationItem[];
  is_external?: boolean;
  requires_auth?: boolean;
}

export interface ColorSchemeConfig {
  primary: string;
  secondary: string;
  accent?: string;
  background?: string;
  surface?: string;
  text_primary?: string;
  text_secondary?: string;
  error?: string;
  warning?: string;
  success?: string;
}

export interface LayoutConfig {
  grid_columns?: number;
  sidebar_width?: number;
  show_filters?: boolean;
  show_search?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  auto_switch?: boolean;
}

export interface WidgetConfig {
  widget_type: string;
  position?: string;
  size?: 'small' | 'medium' | 'large';
  refresh_interval?: number;
  max_items?: number;
  [key: string]: any;
}

export interface AnimationConfig {
  page_transitions?: boolean;
  hover_effects?: boolean;
  loading_animations?: boolean;
  particle_effects?: boolean;
  win_animations?: boolean;
  jackpot_effects?: boolean;
}

// API Request/Response interfaces
export interface CreateTemplateRequest {
  name: string;
  description?: string;
  type: 'admin' | 'user' | 'premium';
  category?: string;
  version?: string;
  author?: string;
  is_premium?: boolean;
  price?: number;
  currency?: string;
  configs?: Partial<TemplateConfig>[];
  features?: Partial<TemplateFeature>[];
}

export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  category?: string;
  version?: string;
  author?: string;
  is_active?: boolean;
  is_premium?: boolean;
  price?: number;
  currency?: string;
}

export interface AssignTemplateRequest {
  template_id: number;
  custom_config?: any;
}

export interface PurchaseTemplateRequest {
  template_id?: number;
  feature_id?: number;
  purchase_type: 'template' | 'feature';
  payment_method: string;
}

export interface TemplateResponse {
  success: boolean;
  data?: TemplateWithConfigs | UserTemplateWithDetails;
  message?: string;
}

export interface TemplatesResponse {
  success: boolean;
  data?: {
    templates: TemplateWithConfigs[];
    total: number;
    page: number;
    limit: number;
  };
  message?: string;
}

export interface UserTemplateResponse {
  success: boolean;
  data?: {
    current_template: UserTemplateWithDetails;
    available_templates: Template[];
    purchased_features: TemplateFeature[];
  };
  message?: string;
} 