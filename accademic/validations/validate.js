import { z } from 'zod';

export const validate = (schema) => {
    return (req, res, next) => {
        try {
            const validated = schema.parse({
                body: req.body,
                query: req.query,
                params: req.params,
            });

            req.body = validated.body || req.body;
            req.query = validated.query || req.query;
            req.params = validated.params || req.params;

            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                const errors = error.errors.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));

                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors,
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Internal server error during validation',
                error: error.message,
            });
        }
    };
};

export const validatePartial = (schema) => {
    return (req, res, next) => {
        try {
            const partialSchema = schema.deepPartial();
            const validated = partialSchema.parse({
                body: req.body,
                query: req.query,
                params: req.params,
            });

            req.body = validated.body || req.body;
            req.query = validated.query || req.query;
            req.params = validated.params || req.params;

            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                const errors = error.errors.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));

                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors,
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Internal server error during validation',
                error: error.message,
            });
        }
    };
};

export default validate;

