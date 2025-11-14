import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      validated?: {
        body?: any;
        query?: any;
        params?: any;
        headers?: any;
        token?: string;
      };
    }
  }
}