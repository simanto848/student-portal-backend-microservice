import express from "express";
import authController from "../controllers/authController.js";
import { validate } from "../middlewares/validate.js";
import {
  adminLoginSchema,
  staffLoginSchema,
  teacherLoginSchema,
  studentLoginSchema,
} from "../validations/loginValidation.js";
import { otpVerificationValidation } from "../validations/otpValidation.js";
import {
  verify2FASchema,
  resend2FASchema,
  forgotPasswordSchema,
  verifyResetOTPSchema,
  resetPasswordSchema,
  changePasswordSchema,
  confirm2FASchema,
  disable2FASchema,
  updatePreferencesSchema,
} from "../validations/authValidation.js";
import { authenticate } from "shared";
import { verifySession } from "../middlewares/verifySession.js";

const router = express.Router();

router.post("/admins/login", validate(adminLoginSchema), authController.loginAdmin);
router.post("/staffs/login", validate(staffLoginSchema), authController.loginStaff);
router.post("/teachers/login", validate(teacherLoginSchema), authController.loginTeacher);
router.post("/students/login", validate(studentLoginSchema), authController.loginStudent);
router.post("/refresh-token", authController.refreshToken);
router.post("/logout", authController.logout);

// 2FA & Password Management Routes
router.post("/verify-2fa", validate(verify2FASchema), authController.verify2FA);
router.post("/resend-2fa", validate(resend2FASchema), authController.resend2FA);
router.post("/forgot-password", validate(forgotPasswordSchema), authController.forgotPassword);
router.post("/verify-reset-otp", validate(verifyResetOTPSchema), authController.verifyResetOTP);
router.post("/reset-password", validate(resetPasswordSchema), authController.resetPassword);

// Protected Routes
router.post("/change-password", authenticate, verifySession, validate(changePasswordSchema), authController.changePassword);
router.patch("/preferences", authenticate, verifySession, validate(updatePreferencesSchema), authController.updatePreferences);
router.post("/2fa/enable", authenticate, verifySession, authController.enable2FA);
router.post("/2fa/confirm", authenticate, verifySession, validate(confirm2FASchema), authController.confirmEnable2FA);
router.post("/2fa/disable", authenticate, verifySession, validate(disable2FASchema), authController.disable2FA);

// Session Management Routes
router.get("/sessions", authenticate, verifySession, authController.getSessions);
router.delete("/sessions/:sessionId", authenticate, verifySession, authController.revokeSession);

// Generic OTP Routes
router.post("/otp/generate", authenticate, verifySession, authController.generateOTP);
router.post("/otp/verify", authenticate, verifySession, authController.verifyOTP);

// Profile Route
router.get("/me", authenticate, verifySession, authController.getMe);

export default router;
