import ApiResponse from '../utils/ApiResponser.js';

export const errorHandler = (err, req, res, next) => {
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(e => ({
            field: e.path,
            message: e.message
        }));
        return ApiResponse.validationError(res, 'Validation failed', errors);
    }

    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        return ApiResponse.conflict(res, `${field} already exists`);
    }

    if (err.name === 'CastError') {
        return ApiResponse.badRequest(res, 'Invalid ID format');
    }

    if (err.name === 'JsonWebTokenError') {
        return ApiResponse.unauthorized(res, 'Invalid token');
    }

    if (err.name === 'TokenExpiredError') {
        return ApiResponse.unauthorized(res, 'Token expired');
    }

    console.error('Unhandled error:', err);
    return ApiResponse.serverError(res, process.env.NODE_ENV === 'development' ? err.message : 'Internal server error');
};

export const notFoundHandler = (req, res) => {
    return ApiResponse.notFound(res, 'Route not found');
};

