"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const zod_1 = require("zod");
const validate = ({ body, query, params, headers, errorMessage = "Validation failed", }) => {
    const middleware = (req, res, next) => {
        try {
            const validated = {};
            if (body)
                validated.body = body.parse(req.body);
            if (query)
                validated.query = query.parse(req.query);
            if (params)
                validated.params = params.parse(req.params);
            if (headers) {
                const normalizedHeaders = {};
                for (const key in req.headers) {
                    normalizedHeaders[key.toLowerCase()] = req.headers[key];
                }
                validated.headers = headers.parse(normalizedHeaders);
                const auth = normalizedHeaders["authorization"];
                if (typeof auth === "string" && auth.startsWith("Bearer ")) {
                    validated.token = auth.replace("Bearer ", "").trim();
                }
            }
            req.validated = validated;
            next();
        }
        catch (err) {
            if (err instanceof zod_1.ZodError) {
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
exports.validate = validate;
