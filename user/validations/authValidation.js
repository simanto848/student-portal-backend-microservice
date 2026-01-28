import { z } from "zod";

export const verify2FASchema = (data) => {
  const schema = z.object({
    tempToken: z.string({ required_error: "Temporary token is required" }),
    otp: z
      .string({ required_error: "OTP is required" })
      .length(6, "OTP must be 6 digits")
      .regex(/^\d+$/, "OTP must be numeric"),
  });
  return schema.safeParse(data);
};

export const forgotPasswordSchema = (data) => {
  const schema = z.object({
    email: z
      .string({ required_error: "Email is required" })
      .email("Invalid email address"),
    role: z
      .enum(["admin", "staff", "teacher", "student"], {
        required_error: "Role is required",
      })
      .optional(),
  });
  return schema.safeParse(data);
};

export const resetPasswordSchema = (data) => {
  const schema = z.object({
    email: z
      .string({ required_error: "Email is required" })
      .email("Invalid email address"),
    otp: z
      .string({ required_error: "OTP is required" })
      .length(6, "OTP must be 6 digits")
      .regex(/^\d+$/, "OTP must be numeric"),
    newPassword: z
      .string({ required_error: "New password is required" })
      .min(6, "Password must be at least 6 characters"),
    role: z.enum(["admin", "staff", "teacher", "student"]).optional(),
  });
  return schema.safeParse(data);
};

export const changePasswordSchema = (data) => {
  const schema = z.object({
    currentPassword: z.string({
      required_error: "Current password is required",
    }),
    newPassword: z
      .string({ required_error: "New password is required" })
      .min(6, "Password must be at least 6 characters"),
  });
  return schema.safeParse(data);
};

export const confirm2FASchema = (data) => {
  const schema = z.object({
    otp: z
      .string({ required_error: "OTP is required" })
      .length(6, "OTP must be 6 digits")
      .regex(/^\d+$/, "OTP must be numeric"),
  });
  return schema.safeParse(data);
};

export const disable2FASchema = (data) => {
  const schema = z.object({
    password: z.string({ required_error: "Password is required" }),
  });
  return schema.safeParse(data);
};

export const updatePreferencesSchema = (data) => {
  const schema = z.object({
    emailUpdatesEnabled: z.boolean().optional(),
    notificationPreferences: z
      .object({
        email: z
          .object({
            gradeUpdates: z.boolean().optional(),
            newAssignments: z.boolean().optional(),
            deadlineReminders: z.boolean().optional(),
            announcements: z.boolean().optional(),
            directMessages: z.boolean().optional(),
          })
          .optional(),
        push: z
          .object({
            messages: z.boolean().optional(),
            classReminders: z.boolean().optional(),
            libraryAlerts: z.boolean().optional(),
          })
          .optional(),
      })
      .optional(),
  });
  return schema.safeParse(data);
};

export const verifyResetOTPSchema = (data) => {
  const schema = z.object({
    email: z
      .string({ required_error: "Email is required" })
      .email("Invalid email address"),
    otp: z
      .string({ required_error: "OTP is required" })
      .length(6, "OTP must be 6 digits")
      .regex(/^\d+$/, "OTP must be numeric"),
    role: z.enum(["admin", "staff", "teacher", "student"]).optional(),
  });
  return schema.safeParse(data);
};

export const resend2FASchema = (data) => {
  const schema = z.object({
    tempToken: z.string({ required_error: "Temporary token is required" }),
  });
  return schema.safeParse(data);
};
