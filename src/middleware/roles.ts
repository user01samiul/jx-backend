// Re-export role middleware
import { authorize } from '../middlewares/authorize';

// Admin role middleware
export const isAdmin = (req: any, res: any, next: any) => {
  authorize(["Admin"])(req, res, next);
};

// Support role middleware
export const isSupport = (req: any, res: any, next: any) => {
  authorize(["Support", "Admin"])(req, res, next);
};

// Manager role middleware
export const isManager = (req: any, res: any, next: any) => {
  authorize(["Manager", "Admin"])(req, res, next);
};
