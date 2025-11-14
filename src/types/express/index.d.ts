import { Request } from "express";

declare module "express-serve-static-core" {
  interface Request {
    validated?: {
      body?: any;
      query?: any;
      params?: any;
    };
    user?: {
      userId: number;
      username: string;
      email: string;
      role?: string;
      [key: string]: any;
    };
  }
}