import { z } from 'zod';
import ApiResponse from '../utils/ApiResponser.js';

const validate = (schema) => {
    return async (req, res, next) => {
        try {
            const data = {
                body: req.body,
                params: req.params,
                query: req.query
            };

            await schema.parseAsync(data);
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                const errors = (error.issues || error.errors).map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }));
                return ApiResponse.validationError(res, 'Validation failed', errors);
            }
            return ApiResponse.serverError(res, error.message);
        }
    };
};

export default validate;
