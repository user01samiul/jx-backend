import { Request, Response, NextFunction } from "express";
import { Role } from "../constants/roles";

export const authorize =
  (allowedRoles: Role[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;

    if (!user || !user.role) {
      console.log('[AUTHORIZE] No user or role found');
      res.status(401).json({
        success: false,
        message: "Unauthorized: No user found",
      });
      return;
    }

    // Case-insensitive role comparison (Admin === admin)
    const userRoleLower = user.role.toLowerCase();
    const hasPermission = allowedRoles.some(role => role.toLowerCase() === userRoleLower);

    console.log(`[AUTHORIZE] User role: ${user.role}, Allowed: [${allowedRoles.join(', ')}], Has permission: ${hasPermission}`);

    if (!hasPermission) {
      res.status(403).json({
        success: false,
        message: "Forbidden: Insufficient permissions",
      });
      return;
    }

    next();
  };
