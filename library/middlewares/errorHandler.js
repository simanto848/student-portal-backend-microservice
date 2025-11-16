import ApiResponse from '../utils/ApiResponser.js';

export const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    const errors = err.errors || [];

    return ApiResponse.error(res, message, statusCode, errors);
};

export const notFoundHandler = (req, res, next) => {
    return ApiResponse.notFound(res, `Route ${req.originalUrl} not found`);
};
