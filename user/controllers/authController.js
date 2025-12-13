import { ApiResponse, ApiError } from "shared";
import authService from "../services/authService.js";
import Admin from "../models/Admin.js";
import Staff from "../models/Staff.js";
import Teacher from "../models/Teacher.js";
import Student from "../models/Student.js";

class AuthController {
  async loginAdmin(req, res, next) {
    try {
      const result = await authService.loginAdmin(req.validatedData, req, res);
      return ApiResponse.success(res, result, "Admin login successful");
    } catch (error) {
      next(error);
    }
  }

  async loginStaff(req, res, next) {
    try {
      const result = await authService.loginStaff(req.validatedData, req, res);
      return ApiResponse.success(res, result, "Staff login successful");
    } catch (error) {
      next(error);
    }
  }

  async loginTeacher(req, res, next) {
    try {
      const result = await authService.loginTeacher(
        req.validatedData,
        req,
        res
      );
      return ApiResponse.success(res, result, "Teacher login successful");
    } catch (error) {
      next(error);
    }
  }

  async loginStudent(req, res, next) {
    try {
      const result = await authService.loginStudent(
        req.validatedData,
        req,
        res
      );
      return ApiResponse.success(res, result, "Student login successful");
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      const result = await authService.logout(req, res);
      return ApiResponse.success(res, result, "Logout successful");
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      const result = await authService.refreshAccessToken(
        refreshToken,
        req,
        res
      );
      return ApiResponse.success(
        res,
        result,
        "Access token refreshed successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  async verify2FA(req, res, next) {
    try {
      const { tempToken, otp } = req.body;
      const result = await authService.verify2FALogin(tempToken, otp, req, res);
      return ApiResponse.success(res, result, "2FA verification successful");
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req, res, next) {
    try {
      const { email, role } = req.body;
      const result = await authService.forgotPassword(email, role);
      return ApiResponse.success(res, result, "Password reset initiated");
    } catch (error) {
      next(error);
    }
  }

  async verifyResetOTP(req, res, next) {
    try {
      const { email, otp, role } = req.body;
      const result = await authService.verifyResetOTP(email, otp, role);
      return ApiResponse.success(res, result, "OTP verified successfully");
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const { email, otp, newPassword, role } = req.body;
      const result = await authService.resetPassword(
        email,
        otp,
        newPassword,
        role
      );
      return ApiResponse.success(res, result, "Password reset successful");
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;
      const role = req.user.role;
      const result = await authService.changePassword(
        userId,
        currentPassword,
        newPassword,
        role
      );
      return ApiResponse.success(res, result, "Password changed successfully");
    } catch (error) {
      next(error);
    }
  }

  async enable2FA(req, res, next) {
    try {
      const userId = req.user.id;
      const role = req.user.role;
      const result = await authService.enable2FA(userId, role);
      return ApiResponse.success(res, result, "2FA setup initiated");
    } catch (error) {
      next(error);
    }
  }

  async confirmEnable2FA(req, res, next) {
    try {
      const { otp } = req.body;
      const userId = req.user.id;
      const role = req.user.role;
      const result = await authService.confirmEnable2FA(userId, otp, role);
      return ApiResponse.success(res, result, "2FA enabled successfully");
    } catch (error) {
      next(error);
    }
  }

  async disable2FA(req, res, next) {
    try {
      const { password } = req.body;
      const userId = req.user.id;
      const role = req.user.role;
      const result = await authService.disable2FA(userId, password, role);
      return ApiResponse.success(res, result, "2FA disabled successfully");
    } catch (error) {
      next(error);
    }
  }

  async updatePreferences(req, res, next) {
    try {
      const userId = req.user.id;
      const role = req.user.role;
      const result = await authService.updatePreferences(
        userId,
        role,
        req.body
      );
      return ApiResponse.success(
        res,
        result,
        "Preferences updated successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  async generateOTP(req, res, next) {
    try {
      const { purpose } = req.body;
      const userId = req.user.id;
      const role = req.user.role;
      const result = await authService.generateGenericOTP(
        userId,
        purpose,
        role
      );
      return ApiResponse.success(res, result, "OTP generated successfully");
    } catch (error) {
      next(error);
    }
  }

  async verifyOTP(req, res, next) {
    try {
      const { otp, purpose } = req.body;
      const userId = req.user.id;
      const result = await authService.verifyGenericOTP(userId, otp, purpose);
      return ApiResponse.success(res, result, "OTP verified successfully");
    } catch (error) {
      next(error);
    }
  }
  async getMe(req, res, next) {
    try {
      const userId = req.user?.id || req.user?.sub;
      if (!userId) {
        throw new ApiError(401, "Invalid session");
      }

      const models = {
        admin: Admin,
        staff: Staff,
        teacher: Teacher,
        student: Student,
      };

      const roleType = req.user?.type;
      const Model = models[roleType] || models[req.user?.role] || Student;

      const dbUser = await Model.findById(userId).populate("profile");
      if (!dbUser) {
        throw new ApiError(404, "User not found");
      }

      const sanitizedUser = dbUser.toObject();
      delete sanitizedUser.password;
      delete sanitizedUser.refreshToken;

      return ApiResponse.success(
        res,
        { user: sanitizedUser },
        "User profile fetched successfully"
      );
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
