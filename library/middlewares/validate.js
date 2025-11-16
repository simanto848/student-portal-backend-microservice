export const validate = (schema) => {
    return (req, res, next) => {
        try {
            const validatedData = schema.parse(req.body);
            req.validatedData = validatedData;
            next();
        } catch (error) {
            if (error.errors) {
                const errors = error.errors.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message
                }));
                return res.status(422).json({
                    success: false,
                    message: 'Validation failed',
                    statusCode: 422,
                    errors
                });
            }
            return res.status(422).json({
                success: false,
                message: 'Validation failed',
                statusCode: 422,
                errors: [{ field: 'unknown', message: error.message }]
            });
        }
    };
};