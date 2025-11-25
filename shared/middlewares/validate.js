import { z } from 'zod';
import ApiResponse, { ApiError } from '../utils/ApiResponse.js';

const buildValidationMiddleware = (schema, { attachData = true } = {}) => {
    if (!schema || typeof schema.parse !== 'function') {
        throw new ApiError(500, 'A valid Zod schema is required for validation middleware');
    }

    return async (req, res, next) => {
        try {
            const parsed = await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params
            });

            if (attachData) {
                if (parsed.body) req.body = parsed.body;
                if (parsed.params) req.params = parsed.params;
                if (parsed.query) {
                    Object.assign(req.query, parsed.query);
                }
                req.validated = parsed;
            }

            return next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                const errors = (error.issues || error.errors || []).map(issue => ({
                    field: Array.isArray(issue.path) ? issue.path.join('.') : String(issue.path || ''),
                    message: issue.message
                }));
                return ApiResponse.validationError(res, 'Validation failed', errors);
            }

            console.error('Unexpected validation error:', error);
            return ApiResponse.serverError(res, 'Unexpected validation error');
        }
    };
};

const validate = (schema, options = {}) => buildValidationMiddleware(schema, options);

const validatePartial = (schema, options = {}) => {
    if (!schema?.deepPartial) {
        throw new ApiError(500, 'Partial validation requires a Zod object schema');
    }
    return buildValidationMiddleware(schema.deepPartial(), options);
};

export { validate, validatePartial };
export default validate;
