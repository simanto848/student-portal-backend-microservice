import ApiResponse from '../utils/ApiResponser.js';
import authService from '../services/authService.js';

class AuthController {
    async loginAdmin(req, res, next) {
        try {
            const result = await authService.loginAdmin(req.validatedData, req, res);
            return ApiResponse.success(res, result, 'Admin login successful');
        } catch (error) {
            next(error);
        }
    }

    async loginStaff(req, res, next) {
        try {
            const result = await authService.loginStaff(req.validatedData, req, res);
            return ApiResponse.success(res, result, 'Staff login successful');
        } catch (error) {
            next(error);
        }
    }

    async loginTeacher(req, res, next) {
        try {
            const result = await authService.loginTeacher(req.validatedData, req, res);
            return ApiResponse.success(res, result, 'Teacher login successful');
        } catch (error) {
            next(error);
        }
    }

    async loginStudent(req, res, next) {
        try {
            const result = await authService.loginStudent(req.validatedData, req, res);
            return ApiResponse.success(res, result, 'Student login successful');
        } catch (error) {
            next(error);
        }
    }

    async logout(req, res, next) {
        try {
            const result = await authService.logout(req, res);
            return ApiResponse.success(res, result, 'Logout successful');
        } catch (error) {
            next(error);
        }
    }

    async refreshToken(req, res, next) {
        try {
            const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
            const result = await authService.refreshAccessToken(refreshToken, req, res);
            return ApiResponse.success(res, result, 'Access token refreshed successfully');
        } catch (error) {
            next(error);
        }
    }
}

export default new AuthController();
