export interface RegisterInput {
  username: string;
  email: string;
  password: string;
  type: string;
  captcha_id: string;
  captcha_text: string;
  referral_code?: string;
} 