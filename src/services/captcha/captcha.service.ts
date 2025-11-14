import svgCaptcha from 'svg-captcha';
import { ApiError } from '../../utils/apiError';
import { ErrorMessages } from '../../constants/messages';

// In-memory storage for captcha sessions (in production, use Redis or database)
const captchaStore = new Map<string, { text: string; expiresAt: number }>();

export interface CaptchaResponse {
  id: string;
  svg: string;
}

export class CaptchaService {
  private static instance: CaptchaService;
  private readonly CAPTCHA_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes

  public static getInstance(): CaptchaService {
    if (!CaptchaService.instance) {
      CaptchaService.instance = new CaptchaService();
    }
    return CaptchaService.instance;
  }

  /**
   * Generate a new captcha
   */
  public generateCaptcha(): CaptchaResponse {
    const captcha = svgCaptcha.create({
      size: 4, // 4 characters
      noise: 2, // 2 noise lines
      color: true,
      background: '#f0f0f0',
      width: 150,
      height: 50,
      fontSize: 40,
      charPreset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    });

    const captchaId = this.generateCaptchaId();
    const expiresAt = Date.now() + this.CAPTCHA_EXPIRY_TIME;

    // Store captcha data
    captchaStore.set(captchaId, {
      text: captcha.text,
      expiresAt
    });

    return {
      id: captchaId,
      svg: captcha.data
    };
  }

  /**
   * Validate captcha
   */
  public validateCaptcha(captchaId: string, userInput: string): boolean {
    const captchaData = captchaStore.get(captchaId);
    
    if (!captchaData) {
      throw new ApiError(ErrorMessages.INVALID_CAPTCHA, 400);
    }

    // Check if captcha has expired
    if (Date.now() > captchaData.expiresAt) {
      captchaStore.delete(captchaId);
      throw new ApiError(ErrorMessages.CAPTCHA_EXPIRED, 400);
    }

    // Validate user input (case-insensitive)
    const isValid = captchaData.text.toLowerCase() === userInput.toLowerCase();
    
    // Remove captcha after validation (one-time use)
    captchaStore.delete(captchaId);
    
    return isValid;
  }

  /**
   * Clean up expired captchas
   */
  public cleanupExpiredCaptchas(): void {
    const now = Date.now();
    for (const [id, data] of captchaStore.entries()) {
      if (now > data.expiresAt) {
        captchaStore.delete(id);
      }
    }
  }

  /**
   * Generate unique captcha ID
   */
  private generateCaptchaId(): string {
    return `captcha_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const captchaService = CaptchaService.getInstance(); 