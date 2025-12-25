import { ApiError } from 'shared';

export const requireRole = (allowedRoles, options = {}) => {
    return (req, res, next) => {
        try {
            const user = req.user;

            if (!user) {
                throw new ApiError(401, 'Authentication required');
            }

            const userRole = user.role || user.userType;

            if (!userRole) {
                throw new ApiError(403, 'User role not found');
            }

            if (!allowedRoles.includes(userRole)) {
                throw new ApiError(
                    403,
                    `Access denied. Required roles: ${allowedRoles.join(', ')}`
                );
            }

            if (user.isBlocked) {
                throw new ApiError(403, 'Your account has been blocked. Please contact support.');
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

export const requireSuperAdmin = requireRole(['super_admin']);

export const requireAdmin = requireRole(['super_admin', 'admin']);

export const requireAnyAdmin = requireRole(['super_admin', 'admin', 'moderator']);

export const canManageAdmin = (req, res, next) => {
    try {
        const user = req.user;
        const targetRole = req.body.role || req.query.role;

        if (!user) {
            throw new ApiError(401, 'Authentication required');
        }

        const userRole = user.role || user.userType;
        if (userRole === 'super_admin') {
            return next();
        }

        if (userRole === 'admin') {
            if (targetRole && targetRole !== 'moderator') {
                throw new ApiError(403, 'Admins can only manage moderators');
            }
            return next();
        }

        throw new ApiError(403, 'Insufficient permissions to manage admins');
    } catch (error) {
        next(error);
    }
};

export const canAccessUser = (paramName = 'id') => {
    return (req, res, next) => {
        try {
            const user = req.user;
            const targetUserId = req.params[paramName];

            if (!user) {
                throw new ApiError(401, 'Authentication required');
            }

            const userRole = user.role || user.userType;
            if (userRole === 'super_admin') {
                return next();
            }

            if (userRole === 'admin') {
                return next();
            }

            if (user.id === targetUserId) {
                return next();
            }

            throw new ApiError(403, 'Access denied');
        } catch (error) {
            next(error);
        }
    };
};

export default {
    requireRole,
    requireSuperAdmin,
    requireAdmin,
    requireAnyAdmin,
    canManageAdmin,
    canAccessUser,
};
