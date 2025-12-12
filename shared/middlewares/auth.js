import jwt from "jsonwebtoken";
import ApiResponse from "../utils/ApiResponse.js";

export const authenticate = (req, res, next) => {
  const token =
    req.cookies?.accessToken || req.headers.authorization?.split(" ")[1];
  if (!token) {
    return ApiResponse.unauthorized(
      res,
      "Authentication credentials were not provided"
    );
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Backwards compatibility: some services expect `sub` in JWT payload.
    if (decoded && decoded.sub == null && decoded.id != null) {
      decoded.sub = decoded.id;
    }
    req.user = decoded;
    next();
  } catch (error) {
    return ApiResponse.unauthorized(res, "Invalid or expired token");
  }
};

export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return ApiResponse.forbidden(
        res,
        "You do not have permission to perform this action"
      );
    }
    next();
  };
};

export const optionalAuth = (req, res, next) => {
  const token =
    req.cookies?.accessToken || req.headers.authorization?.split(" ")[1];
  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Backwards compatibility: some services expect `sub` in JWT payload.
    if (decoded && decoded.sub == null && decoded.id != null) {
      decoded.sub = decoded.id;
    }
    req.user = decoded;
  } catch (error) {
    // Ignore invalid tokens for optional auth
  }
  next();
};
