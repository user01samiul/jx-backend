export interface RegisterInput {
  username: string;
  email: string;
  password: string;
  type: string;
  captcha_id: string;
  captcha_text: string;
  referral_code?: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  role?: {
    id: number;
    name: string;
    description: string | null;
  };
}

export interface RegisterResponse {
  message: string;
  user_id?: number;
  qr_code: string;
  auth_secret: string;
} 