export interface LoginResponse {
    access_token: string,
    refresh_token: string
}

export interface RegisterResponse {
    message: string;
    user_id?: number;
    qr_code: string;
    auth_secret: string;
}