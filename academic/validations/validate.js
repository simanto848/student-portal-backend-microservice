import { z } from 'zod';
import ApiResponse from '../utils/ApiResponser.js';

export const validate = (schema) => {
    return (req, res, next) => {
        try {
            const parsed = schema.parse({
                body: req.body,
                query: req.query,
                params: req.params,
            });

            req.body = parsed.body || req.body;
            req.params = parsed.params || req.params;
            if (parsed.query) {
                Object.keys(parsed.query).forEach(key => {
                    req.query[key] = parsed.query[key];
                });
            }

            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                const errors = error.errors.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));

                return ApiResponse.validationError(res, 'Validation failed', errors);
            }

            return ApiResponse.serverError(res, 'Internal server error during validation');
        }
    };
};

export const validatePartial = (schema) => {
    return (req, res, next) => {
        try {
            const partialSchema = schema.deepPartial();
            const parsed = partialSchema.parse({
                body: req.body,
                query: req.query,
                params: req.params,
            });

            req.body = parsed.body || req.body;
            req.params = parsed.params || req.params;
            if (parsed.query) {
                Object.keys(parsed.query).forEach(key => {
                    req.query[key] = parsed.query[key];
                });
            }

            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                const errors = error.errors.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));

                return ApiResponse.validationError(res, 'Validation failed', errors);
            }

            return ApiResponse.serverError(res, 'Internal server error during validation');
        }
    };
};

export default validate;
