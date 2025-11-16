import ApiResponse from '../utils/ApiResponser.js';

export const validate = (validationFn) => {
    return (req, res, next) => {
        try {
            const result = validationFn(req.body);
            if (!result.success) {
                const issues = (result.error && (result.error.issues || result.error.errors)) || [];
                const errors = issues.map((issue) => {
                    const field = Array.isArray(issue.path) ? issue.path.join('.') : (issue.path || 'unknown');
                    const value = field.split('.').reduce((acc, key) => (acc != null ? acc[key] : undefined), req.body);
                    if (value === undefined) {
                        return { field, message: `${field} is required` };
                    }

                    if (issue.code === 'invalid_type' && issue.received === 'undefined') {
                        return { field, message: `${field} is required` };
                    }

                    return { field, message: issue.message || 'Invalid value' };
                });

                return ApiResponse.validationError(res, 'Validation failed', errors);
            }

            req.validatedData = result.data;
            next();
        } catch (error) {
            console.error('Validation middleware error:', error);
            return ApiResponse.serverError(res, 'Validation error: ' + (error?.message || 'Unknown error'));
        }
    };
};

export default validate;
