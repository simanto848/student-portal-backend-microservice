import jwt from "jsonwebtoken";
import crypto from "crypto";
import Admin from "../models/Admin.js";
import Staff from "../models/Staff.js";
import Teacher from "../models/Teacher.js";
import Student from "../models/Student.js";
import Session from "../models/Session.js";
import otpService from "./otpService.js";
import UserOTP from "../models/OTP.js";
import OTP_PURPOSES from "../constants/OTP_PURPOSE.js";
import { ApiError } from "shared";

const TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const REFRESH_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: "/api/user/auth",
};

class AuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || "7d";
    this.refreshTokenExpiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || "30d";
  }

  signToken(payload = {}) {
    return jwt.sign(payload, this.jwtSecret, { expiresIn: this.jwtExpiresIn });
  }

  signRefreshToken(payload = {}) {
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.refreshTokenExpiresIn,
    });
  }

  generateRefreshToken() {
    return crypto.randomBytes(64).toString("hex");
  }

  setAuthCookie(res, token) {
    res.cookie("accessToken", token, TOKEN_COOKIE_OPTIONS);
    return token;
  }

  setRefreshTokenCookie(res, refreshToken) {
    res.cookie("refreshToken", refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);
    return refreshToken;
  }

  clearAuthCookie(res) {
    res.clearCookie("accessToken", TOKEN_COOKIE_OPTIONS);
    res.clearCookie("refreshToken", REFRESH_TOKEN_COOKIE_OPTIONS);
  }

  getClientIp(req) {
    return (
      req.ip ||
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      "unknown"
    );
  }

  validateRegisteredIp(user, clientIp, roleKey) {
    if (roleKey === "student") {
      return true;
    }

    if (!user.registeredIpAddress || user.registeredIpAddress.length === 0) {
      throw new ApiError(
        403,
        `Access denied. No registered IP addresses found for this account. Please contact administrator to register your IP address.`
      );
    }

    const isIpRegistered = user.registeredIpAddress.includes(clientIp);
    if (!isIpRegistered) {
      throw new ApiError(
        403,
        `Access denied. Your IP address (${clientIp}) is not registered for this account. Please contact administrator to add your IP address.`
      );
    }

    return true;
  }

  async performLogin(Model, credentials, roleKey, req, res) {
    try {
      const { email, password } = credentials;
      if (!email || !password) {
        throw new ApiError(400, "Email and password are required");
      }

      const user = await Model.findOne({ email, deletedAt: null })
        .select("+password")
        .populate("profile");
      if (!user) {
        throw new ApiError(401, `${roleKey} credentials are invalid`);
      }

      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new ApiError(401, `${roleKey} credentials are invalid`);
      }

      if (user.isBlocked) {
        throw new ApiError(
          403,
          `Your account has been blocked. Reason: ${user.blockReason || "No reason provided"}. Please contact support.`
        );
      }

      const clientIp = this.getClientIp(req);
      this.validateRegisteredIp(user, clientIp, roleKey);

      if (user.twoFactorEnabled) {
        const otp = otpService.generateOTP(6);
        await otpService.saveOTP(user.id, otp, OTP_PURPOSES.TWO_FACTOR_AUTH, 5); // 5 mins expiry
        await otpService.sendOTPEmail(
          user.email,
          otp,
          OTP_PURPOSES.TWO_FACTOR_AUTH,
          user.fullName
        );

        const tempPayload = {
          id: user.id,
          role: roleKey,
          type: "2fa_pending",
          email: user.email,
        };
        const tempToken = jwt.sign(tempPayload, this.jwtSecret, {
          expiresIn: "5m",
        });

        return {
          twoFactorRequired: true,
          tempToken,
          message: "2FA OTP sent to your email",
        };
      }

      return this.generateAuthTokens(user, roleKey, req, res);
    } catch (error) {
      throw error instanceof ApiError
        ? error
        : new ApiError(500, error.message);
    }
  }

  async generateAuthTokens(user, roleKey, req, res) {
    const refreshToken = this.generateRefreshToken();
    const clientIp = this.getClientIp(req);
    const userAgent = req.headers["user-agent"] || "";

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Create session
    const session = await Session.create({
      user: user.id,
      role: user.role || roleKey,
      refreshToken,
      ipAddress: clientIp,
      device: {
        browser: userAgent,
        os: "Unknown",
        deviceType: "desktop",
      },
      expiresAt,
    });

    const payload = {
      id: user.id,
      sessionId: session.id,
      role: user.role || roleKey,
      type: roleKey,
      registrationNumber: user.registrationNumber,
      fullName: user.fullName,
      email: user.email,
      ...(user.batchId && { batchId: user.batchId }),
      ...(user.departmentId && { departmentId: user.departmentId }),
      ...(user.programId && { programId: user.programId }),
      ...(user.facultyId && { facultyId: user.facultyId }),
    };

    const accessToken = this.signToken(payload);

    user.lastLoginAt = new Date();
    user.lastLoginIp = clientIp;
    // We still keep the last refresh token on the user model for legacy support if needed, 
    // but the primary session management is now in the Session model.
    user.refreshToken = refreshToken;
    user.refreshTokenExpiresAt = expiresAt;
    await user.save({ validateModifiedOnly: true });

    this.setAuthCookie(res, accessToken);
    this.setRefreshTokenCookie(res, refreshToken);

    const sanitizedUser = user.toObject();
    sanitizedUser.id = user.id;
    delete sanitizedUser.password;
    delete sanitizedUser.refreshToken;
    sanitizedUser.role = sanitizedUser.role || roleKey;

    return {
      accessToken,
      refreshToken,
      user: sanitizedUser,
      expiresIn: this.jwtExpiresIn,
    };
  }

  async verify2FALogin(tempToken, otp, req, res) {
    try {
      const decoded = jwt.verify(tempToken, this.jwtSecret);
      if (decoded.type !== "2fa_pending") {
        throw new ApiError(401, "Invalid token type");
      }

      const isValid = await otpService.verifyOTP(
        decoded.id,
        otp,
        OTP_PURPOSES.TWO_FACTOR_AUTH
      );
      if (!isValid) {
        throw new ApiError(400, "Invalid or expired OTP");
      }

      const models = {
        admin: Admin,
        staff: Staff,
        teacher: Teacher,
        student: Student,
      };

      const Model = models[decoded.role];
      const user = await Model.findById(decoded.id).populate("profile");
      if (!user) {
        throw new ApiError(404, "User not found");
      }

      return this.generateAuthTokens(user, decoded.role, req, res);
    } catch (error) {
      if (
        error.name === "JsonWebTokenError" ||
        error.name === "TokenExpiredError"
      ) {
        throw new ApiError(401, "Invalid or expired session");
      }
      throw error instanceof ApiError
        ? error
        : new ApiError(500, error.message);
    }
  }

  async resend2FAOTP(tempToken) {
    try {
      const decoded = jwt.verify(tempToken, this.jwtSecret);
      if (decoded.type !== "2fa_pending") {
        throw new ApiError(401, "Invalid token type");
      }

      const models = {
        admin: Admin,
        staff: Staff,
        teacher: Teacher,
        student: Student,
      };

      const Model = models[decoded.role];
      const user = await Model.findById(decoded.id);
      if (!user) {
        throw new ApiError(404, "User not found");
      }

      // Check for existing OTP for rate limiting (e.g. 1 minute)
      const existingOTP = await UserOTP.findOne({
        user: user.id,
        purpose: OTP_PURPOSES.TWO_FACTOR_AUTH,
        createdAt: { $gt: new Date(Date.now() - 60 * 1000) } // Check if created in last 60s
      });

      if (existingOTP) {
        const timeLeft = 60 - Math.floor((Date.now() - new Date(existingOTP.createdAt).getTime()) / 1000);
        throw new ApiError(429, `Please wait ${timeLeft} seconds before requesting a new code.`);
      }

      const otp = otpService.generateOTP(6);
      await otpService.saveOTP(user.id, otp, OTP_PURPOSES.TWO_FACTOR_AUTH, 5); // 5 mins expiry

      await otpService.sendOTPEmail(
        user.email,
        otp,
        OTP_PURPOSES.TWO_FACTOR_AUTH,
        user.fullName
      );

      return { message: "OTP resent successfully" };
    } catch (error) {
      if (
        error.name === "JsonWebTokenError" ||
        error.name === "TokenExpiredError"
      ) {
        throw new ApiError(401, "Invalid or expired session. Please login again.");
      }
      throw error;
    }
  }

  async loginAdmin(credentials, req, res) {
    return this.performLogin(Admin, credentials, "admin", req, res);
  }

  async loginStaff(credentials, req, res) {
    return this.performLogin(Staff, credentials, "staff", req, res);
  }

  async loginTeacher(credentials, req, res) {
    return this.performLogin(Teacher, credentials, "teacher", req, res);
  }

  async loginStudent(credentials, req, res) {
    return this.performLogin(Student, credentials, "student", req, res);
  }

  async logout(req, res) {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      if (refreshToken) {
        await Session.deleteOne({ refreshToken });
      }
      this.clearAuthCookie(res);
      return { message: "Logged out successfully" };
    } catch (error) {
      throw new ApiError(500, error.message);
    }
  }

  async getSessions(userId) {
    try {
      const sessions = await Session.find({
        user: userId,
        expiresAt: { $gt: new Date() },
      }).sort({ lastActive: -1 });

      return sessions;
    } catch (error) {
      throw new ApiError(500, error.message);
    }
  }

  async revokeSession(userId, sessionId) {
    try {
      const result = await Session.deleteOne({ _id: sessionId, user: userId });
      if (result.deletedCount === 0) {
        throw new ApiError(404, "Session not found or already revoked");
      }
      return { message: "Session revoked successfully" };
    } catch (error) {
      throw error instanceof ApiError ? error : new ApiError(500, error.message);
    }
  }

  async refreshAccessToken(refreshToken, req, res) {
    try {
      if (!refreshToken) {
        throw new ApiError(401, "Refresh token is required");
      }

      const session = await Session.findOne({
        refreshToken,
        expiresAt: { $gt: new Date() },
      });

      if (!session) {
        throw new ApiError(401, "Invalid or expired session");
      }

      const Model = this.getModelForRole(session.role);
      const user = await Model.findById(session.user).populate("profile");

      if (!user || user.deletedAt) {
        await Session.deleteOne({ _id: session._id });
        throw new ApiError(401, "User no longer exists");
      }

      const payload = {
        id: user.id,
        sessionId: session.id,
        role: user.role || session.role,
        type: session.role,
        registrationNumber: user.registrationNumber,
        fullName: user.fullName,
        email: user.email,
        ...(user.batchId && { batchId: user.batchId }),
        ...(user.departmentId && { departmentId: user.departmentId }),
        ...(user.programId && { programId: user.programId }),
        ...(user.facultyId && { facultyId: user.facultyId }),
      };

      const accessToken = this.signToken(payload);

      // Update session activity
      session.lastActive = new Date();
      session.ipAddress = this.getClientIp(req);
      await session.save();

      this.setAuthCookie(res, accessToken);

      const sanitizedUser = user.toObject();
      sanitizedUser.id = user.id;
      delete sanitizedUser.password;
      delete sanitizedUser.refreshToken;

      return {
        accessToken,
        user: sanitizedUser,
        expiresIn: this.jwtExpiresIn,
      };
    } catch (error) {
      throw error instanceof ApiError
        ? error
        : new ApiError(500, error.message);
    }
  }
  async forgotPassword(email, role) {
    try {
      const models = {
        admin: Admin,
        staff: Staff,
        teacher: Teacher,
        student: Student,
      };

      // If role is provided, search only that model. Otherwise search all (optional feature)
      // For now, let's assume role is required or we search all
      let user = null;
      let Model = null;

      if (role && models[role]) {
        Model = models[role];
        user = await Model.findOne({ email, deletedAt: null });
      } else {
        // Search all models
        for (const key of Object.keys(models)) {
          Model = models[key];
          user = await Model.findOne({ email, deletedAt: null });
          if (user) break;
        }
      }

      if (!user) {
        // Return success even if user not found to prevent enumeration
        return {
          message:
            "If an account exists with this email, an OTP has been sent.",
        };
      }

      const otp = otpService.generateOTP(6);
      await otpService.saveOTP(user.id, otp, OTP_PURPOSES.PASSWORD_RESET, 10);
      await otpService.sendOTPEmail(
        user.email,
        otp,
        OTP_PURPOSES.PASSWORD_RESET,
        user.fullName
      );

      return {
        message: "If an account exists with this email, an OTP has been sent.",
      };
    } catch (error) {
      throw new ApiError(500, error.message);
    }
  }

  async verifyResetOTP(email, otp, role) {
    try {
      const models = {
        admin: Admin,
        staff: Staff,
        teacher: Teacher,
        student: Student,
      };

      let user = null;
      let Model = null;

      if (role && models[role]) {
        Model = models[role];
        user = await Model.findOne({ email, deletedAt: null });
      } else {
        for (const key of Object.keys(models)) {
          Model = models[key];
          user = await Model.findOne({ email, deletedAt: null });
          if (user) break;
        }
      }

      if (!user) {
        throw new ApiError(400, "Invalid request");
      }

      const isValid = await otpService.verifyOTP(
        user.id,
        otp,
        OTP_PURPOSES.PASSWORD_RESET,
        false
      );
      if (!isValid) {
        throw new ApiError(400, "Invalid or expired OTP");
      }

      return { isValid: true, message: "OTP verified successfully" };
    } catch (error) {
      throw error instanceof ApiError
        ? error
        : new ApiError(500, error.message);
    }
  }

  async resetPassword(email, otp, newPassword, role) {
    try {
      const models = {
        admin: Admin,
        staff: Staff,
        teacher: Teacher,
        student: Student,
      };

      let user = null;
      let Model = null;

      if (role && models[role]) {
        Model = models[role];
        user = await Model.findOne({ email, deletedAt: null });
      } else {
        for (const key of Object.keys(models)) {
          Model = models[key];
          user = await Model.findOne({ email, deletedAt: null });
          if (user) break;
        }
      }

      if (!user) {
        throw new ApiError(400, "Invalid request");
      }

      const isValid = await otpService.verifyOTP(
        user.id,
        otp,
        OTP_PURPOSES.PASSWORD_RESET
      );
      if (!isValid) {
        throw new ApiError(400, "Invalid or expired OTP");
      }

      user.password = newPassword;
      await user.save({ validateBeforeSave: false });

      return {
        message:
          "Password reset successful. You can now login with your new password.",
      };
    } catch (error) {
      throw error instanceof ApiError
        ? error
        : new ApiError(500, error.message);
    }
  }

  getModelForRole(role) {
    const models = {
      admin: Admin,
      staff: Staff,
      teacher: Teacher,
      student: Student,
    };

    if (models[role]) return models[role];

    // Normalize granular roles
    if (["super_admin", "moderator"].includes(role)) return Admin;
    if (
      [
        "program_controller",
        "admission",
        "library",
        "it",
        "finance",
        "transport",
        "hr",
        "hostel",
        "hostel_warden",
        "hostel_supervisor",
        "maintenance",
        "exam",
        "exam_controller",
      ].includes(role)
    ) {
      return Staff;
    }

    return null;
  }

  async changePassword(userId, currentPassword, newPassword, role) {
    try {
      const Model = this.getModelForRole(role);
      if (!Model) throw new ApiError(400, "Invalid role");

      const user = await Model.findById(userId).select("+password");
      if (!user) throw new ApiError(404, "User not found");

      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) throw new ApiError(400, "Incorrect current password");

      user.password = newPassword;
      await user.save();

      return { message: "Password changed successfully" };
    } catch (error) {
      throw error instanceof ApiError
        ? error
        : new ApiError(500, error.message);
    }
  }

  async enable2FA(userId, role) {
    try {
      const Model = this.getModelForRole(role);
      if (!Model) throw new ApiError(400, "Invalid role");

      const user = await Model.findById(userId);
      if (!user) throw new ApiError(404, "User not found");

      if (user.twoFactorEnabled) {
        throw new ApiError(400, "2FA is already enabled");
      }

      const otp = otpService.generateOTP(6);
      await otpService.saveOTP(user.id, otp, OTP_PURPOSES.TWO_FACTOR_AUTH, 10);
      await otpService.sendOTPEmail(
        user.email,
        otp,
        OTP_PURPOSES.TWO_FACTOR_AUTH,
        user.fullName
      );

      return { message: "OTP sent to email to confirm 2FA enablement" };
    } catch (error) {
      throw error instanceof ApiError
        ? error
        : new ApiError(500, error.message);
    }
  }

  async confirmEnable2FA(userId, otp, role) {
    try {
      const Model = this.getModelForRole(role);
      if (!Model) throw new ApiError(400, "Invalid role");

      const user = await Model.findById(userId);
      if (!user) throw new ApiError(404, "User not found");

      const isValid = await otpService.verifyOTP(
        user.id,
        otp,
        OTP_PURPOSES.TWO_FACTOR_AUTH
      );
      if (!isValid) throw new ApiError(400, "Invalid or expired OTP");

      user.twoFactorEnabled = true;
      await user.save();

      return { message: "Two-Factor Authentication enabled successfully" };
    } catch (error) {
      throw error instanceof ApiError
        ? error
        : new ApiError(500, error.message);
    }
  }

  async disable2FA(userId, password, role) {
    try {
      const Model = this.getModelForRole(role);
      if (!Model) throw new ApiError(400, "Invalid role");

      const user = await Model.findById(userId).select("+password");
      if (!user) throw new ApiError(404, "User not found");

      if (!user.twoFactorEnabled) {
        throw new ApiError(400, "2FA is not enabled");
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) throw new ApiError(400, "Incorrect password");

      user.twoFactorEnabled = false;
      await user.save();

      return { message: "Two-Factor Authentication disabled successfully" };
    } catch (error) {
      throw error instanceof ApiError
        ? error
        : new ApiError(500, error.message);
    }
  }

  async generateGenericOTP(userId, purpose, role) {
    try {
      const Model = this.getModelForRole(role);
      if (!Model) throw new ApiError(400, "Invalid role");

      const user = await Model.findById(userId);
      if (!user) throw new ApiError(404, "User not found");

      if (!Object.values(OTP_PURPOSES).includes(purpose)) {
        throw new ApiError(400, "Invalid OTP purpose");
      }

      const otp = otpService.generateOTP(6);
      await otpService.saveOTP(user.id, otp, purpose, 5);
      await otpService.sendOTPEmail(user.email, otp, purpose, user.fullName);

      return { message: "OTP sent successfully" };
    } catch (error) {
      throw error instanceof ApiError
        ? error
        : new ApiError(500, error.message);
    }
  }

  async verifyGenericOTP(userId, otp, purpose) {
    try {
      if (!Object.values(OTP_PURPOSES).includes(purpose)) {
        throw new ApiError(400, "Invalid OTP purpose");
      }

      const isValid = await otpService.verifyOTP(userId, otp, purpose);
      if (!isValid) throw new ApiError(400, "Invalid or expired OTP");

      return { isValid: true, message: "OTP verified successfully" };
    } catch (error) {
      throw error instanceof ApiError
        ? error
        : new ApiError(500, error.message);
    }
  }

  async updatePreferences(userId, role, preferences) {
    try {
      const Model = this.getModelForRole(role);
      if (!Model) throw new ApiError(400, "Invalid role");

      const user = await Model.findById(userId);
      if (!user) throw new ApiError(404, "User not found");

      if (typeof preferences?.emailUpdatesEnabled === "boolean") {
        user.emailUpdatesEnabled = preferences.emailUpdatesEnabled;
      }

      if (preferences?.notificationPreferences) {
        if (!user.notificationPreferences) {
          user.notificationPreferences = { email: {}, push: {} };
        }

        if (preferences.notificationPreferences.email) {
          user.notificationPreferences.email = {
            ...user.notificationPreferences.email,
            ...preferences.notificationPreferences.email,
          };
        }

        if (preferences.notificationPreferences.push) {
          user.notificationPreferences.push = {
            ...user.notificationPreferences.push,
            ...preferences.notificationPreferences.push,
          };
        }
      }

      await user.save();

      return {
        emailUpdatesEnabled: user.emailUpdatesEnabled,
        notificationPreferences: user.notificationPreferences,
      };
    } catch (error) {
      throw error instanceof ApiError
        ? error
        : new ApiError(500, error.message);
    }
  }
}

export default new AuthService();
