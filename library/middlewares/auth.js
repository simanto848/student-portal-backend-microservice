import jwt from 'jsonwebtoken';
import ApiResponse from '../utils/ApiResponser.js';

export const authenticate = (req, res, next) => {
    const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];
    if (!token) {
        return ApiResponse.unauthorized(res, 'Authentication credentials were not provided');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return ApiResponse.unauthorized(res, 'Invalid or expired token');
    }
};

export const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return ApiResponse.forbidden(res, 'You do not have permission to perform this action');
        }
        next();
    };
};

// Optional authentication - doesn't fail if no token is provided
export const optionalAuth = (req, res, next) => {
    const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
        } catch (error) {
            // Invalid token, but we don't fail since it's optional
            req.user = null;
        }
    }
    next();
};
