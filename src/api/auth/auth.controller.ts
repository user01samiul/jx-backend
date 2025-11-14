import { Request, Response, NextFunction } from "express";
import { loginService, registerService, refreshToken as refreshTokenService } from "../../services/auth/auth.service";
import { getUserRolesService, getUserByUsernameService, getUserByEmailService } from "../../services/user/user.service";
import { LoginInput, RegisterInput } from "./auth.schema";
import { SuccessMessages } from "../../constants/messages";
import { captchaService } from "../../services/captcha/captcha.service";

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const reqBody = req.validated?.body as LoginInput;
    const identifier = reqBody.username;
    if (!identifier) {
      res.status(400).json({ success: false, message: 'Username or email is required' });
      return;
    }

    // Determine if identifier is an email or username
    const isEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(identifier);
    let user;
    if (isEmail) {
      user = await getUserByEmailService(identifier);
    } else {
      user = await getUserByUsernameService(identifier);
    }
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    // If 2FA is enabled, require only auth_code
    if (user.is_2fa_enabled && user.auth_secret) {
      if (!reqBody.auth_code) {
        res.status(400).json({
          success: false,
          message: '2FA code is required for this user',
          errors: [{ path: ['auth_code'], message: '2FA code required' }]
        });
        return;
      }
    } else {
      // If 2FA is not enabled, require password
      if (!reqBody.password) {
        res.status(400).json({
          success: false,
          message: 'Password is required for this user',
          errors: [{ path: ['password'], message: 'Password required' }]
        });
        return;
      }
    }

    // Pass identifier as username or email, password, and auth_code as appropriate
    const response = await loginService(identifier, reqBody.password, reqBody.auth_code, reqBody.role_id, req);
    res.json({ success: true, message: SuccessMessages.LOGIN_SUCCESS , token: response });
  } catch (err: any) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message || 'Internal Server Error' });
  }
};

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const reqBody = req.validated?.body as RegisterInput;
    const response = await registerService(reqBody);
    res.json({ 
      success: true, 
      message: response.message,
      data: {
        qr_code: response.qr_code,
        auth_secret: response.auth_secret
      }
    });
  } catch (err) {
    next(err);
  }
};

// ✅ This was missing
export const refreshToken = refreshTokenService;

export const getUserRoles = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { username } = req.query;
    
    if (!username || typeof username !== 'string') {
      res.status(400).json({ success: false, message: "Username is required" });
      return;
    }

    const roles = await getUserRolesService(username);
    res.json({ success: true, data: roles });
  } catch (err) {
    next(err);
  }
};

export const getCaptcha = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const captcha = captchaService.generateCaptcha();
    res.json({
      success: true,
      data: captcha
    });
  } catch (err) {
    next(err);
  }
};

export const refreshCaptcha = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const captcha = captchaService.generateCaptcha();
    res.json({
      success: true,
      data: captcha
    });
  } catch (err) {
    next(err);
  }
};