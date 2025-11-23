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
  } catch (err) {
    return ApiResponse.unauthorized(res, 'Invalid or expired token');
  }
};

export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.forbidden(res, 'You do not have permission to perform this action');
    }
    const role = req.user.role || req.user.type;
    if (!allowedRoles.includes(role)) {
      return ApiResponse.forbidden(res, 'You do not have permission to perform this action');
    }
    next();
  };
};

export default authenticate;
