import userServiceClient from '../clients/userServiceClient.js';
import { authenticate as baseAuthenticate } from 'shared/middlewares/auth.js';
import { ApiResponse } from 'shared';

export const authenticateWithProfile = (req, res, next) => {
  const token =
    req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return ApiResponse.unauthorized(res, 'Authentication credentials were not provided');
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
