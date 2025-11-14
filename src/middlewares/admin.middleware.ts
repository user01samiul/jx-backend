import { Request, Response, NextFunction } from 'express';

export const adminMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const user = (req as any).user;

  if (!user || !user.role) {
    res.status(401).json({
      success: false,
      message: 'Unauthorized: No user found'
    });
    return;
  }

  // Case-insensitive role check (Admin === admin)
  if (user.role.toLowerCase() !== 'admin') {
    res.status(403).json({
      success: false,
      message: 'Forbidden: Admin access required'
    });
    return;
  }

  next();
}; 