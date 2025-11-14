// src/middlewares/authenticate.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Config } from "../configs/config";

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  console.log("[AUTH] Authenticating request to:", req.path);
  console.log("[AUTH] Auth header:", authHeader ? "present" : "missing");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("[AUTH] Missing or invalid authorization header");
    res.status(401).json({ status: 401, message: "Missing or invalid token" });
    return;
  }

  const token = authHeader.split(" ")[1];
  console.log("[AUTH] Token extracted, length:", token?.length);
  console.log("[AUTH] Using secret (first 10 chars):", Config.jwt.accessSecret?.substring(0, 10));

  try {
    const decoded = jwt.verify(token, Config.jwt.accessSecret) as any;
    console.log("[AUTH] Token verified successfully for user:", decoded.username);
    (req as any).user = decoded;
    next();
  } catch (err: any) {
    console.error("[AUTH] JWT verification error:", err.message);
    console.error("[AUTH] Error name:", err.name);
    res.status(401).json({ status: 401, message: "Invalid or expired token" });
  }
};