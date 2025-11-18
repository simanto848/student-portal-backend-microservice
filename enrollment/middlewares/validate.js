import { z } from 'zod';
import ApiResponse from '../utils/ApiResponser.js';

export const validate = (schema) => {
    return async (req, res, next) => {
        try {
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                const errors = error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                return ApiResponse.validationError(res, 'Validation failed', errors);
            }
            return ApiResponse.badRequest(res, 'Invalid request data');
        }
    };
};
