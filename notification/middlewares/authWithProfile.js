import userServiceClient from '../clients/userServiceClient.js';
import { authenticate as baseAuthenticate } from 'shared/middlewares/auth.js';
import { ApiResponse } from 'shared';
import jwt from 'jsonwebtoken';

export const authenticateWithProfile = (req, res, next) => {
  const token =
    req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return ApiResponse.unauthorized(res, 'Authentication credentials were not provided');
  }

  // Handle system tokens by decoding and checking role
  try {
    const decoded = jwt.decode(token);
    if (decoded && (decoded.id?.startsWith('system-') || decoded.sub?.startsWith('system-'))) {
      req.user = {
        ...decoded,
        sub: decoded.id || decoded.sub
      };
      return next();
    }
  } catch (e) {
    // Ignore decode error, proceed to getFullUserByToken
  }

  userServiceClient.getFullUserByToken(token)
    .then(user => {
      if (!user) {
        return ApiResponse.unauthorized(res, 'User not found');
      }

      req.user = {
        ...user,
        sub: user.id || user._id
      };

      next();
    })
    .catch(error => {
      return ApiResponse.unauthorized(res, 'Failed to authenticate');
    });
};

export default authenticateWithProfile;
