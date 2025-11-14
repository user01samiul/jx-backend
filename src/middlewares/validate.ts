import { Request, Response, NextFunction, RequestHandler } from "express";
import { AnyZodObject, ZodError, z } from "zod";

type ExtractShape<T extends AnyZodObject | undefined> = T extends AnyZodObject ? z.infer<T> : undefined;

interface ValidatorOptions<B = any, Q = any, P = any, H = any> {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
  headers?: AnyZodObject;
  errorMessage?: string;
}

export const validate = <
  B extends AnyZodObject | undefined = undefined,
  Q extends AnyZodObject | undefined = undefined,
  P extends AnyZodObject | undefined = undefined,
  H extends AnyZodObject | undefined = undefined
>(
  {
    body,
    query,
    params,
    headers,
    errorMessage = "Validation failed",
  }: ValidatorOptions<B, Q, P, H>
): RequestHandler => {
  const middleware: RequestHandler = (req, res, next) => {
    try {
      const validated: {
        body?: ExtractShape<B>;
        query?: ExtractShape<Q>;
        params?: ExtractShape<P>;
        headers?: ExtractShape<H>;
        token?: string;
      } = {};

      if (body) validated.body = body.parse(req.body) as ExtractShape<B>;
      if (query) validated.query = query.parse(req.query) as ExtractShape<Q>;
      if (params) validated.params = params.parse(req.params) as ExtractShape<P>;

      if (headers) {
        const normalizedHeaders: Record<string, any> = {};
        for (const key in req.headers) {
          normalizedHeaders[key.toLowerCase()] = req.headers[key];
        }

        validated.headers = headers.parse(normalizedHeaders) as ExtractShape<H>;

        const auth = normalizedHeaders["authorization"];
        if (typeof auth === "string" && auth.startsWith("Bearer ")) {
          validated.token = auth.replace("Bearer ", "").trim();
        }
      }

      (req as any).validated = validated;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: errorMessage,
          errors: err.errors,
        });
        return;
      }

      next(err);
    }
  };

  return middleware;
};