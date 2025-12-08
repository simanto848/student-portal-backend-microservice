import { z } from "zod";

const dateCoerceOptional = (msg) =>
  z.preprocess((v) => {
    if (v === undefined || v === null || v === "") return undefined;
    if (v instanceof Date) return v;
    if (typeof v === "string" || typeof v === "number") {
      const d = new Date(v);
      return isNaN(d.getTime()) ? undefined : d;
    }
    return undefined;
  }, z.date({ invalid_type_error: msg || "Date must be a valid date" }).optional());

export const studentCreateValidation = (data) => {
  const schema = z.object({
    email: z
      .string({
        required_error: "Email is required",
      })
      .email({ message: "Invalid email address" }),
    fullName: z
      .string({
        required_error: "Full name is required",
      })
      .trim()
      .min(1, { message: "Full name cannot be empty" }),
    departmentId: z
      .string({
        required_error: "Department ID is required",
      })
      .trim()
      .min(1, { message: "Department ID cannot be empty" }),
    programId: z
      .string({
        required_error: "Program ID is required",
      })
      .trim()
      .min(1, { message: "Program ID cannot be empty" }),
    batchId: z
      .string({
        required_error: "Batch ID is required",
      })
      .trim()
      .min(1, { message: "Batch ID cannot be empty" }),
    sessionId: z
      .string({
        required_error: "Session ID is required",
      })
      .trim()
      .min(1, { message: "Session ID cannot be empty" }),
    enrollmentStatus: z
      .enum([
        "not_enrolled",
        "enrolled",
        "graduated",
        "dropped_out",
        "suspended",
        "on_leave",
        "transferred_out",
        "transferred_in",
      ])
      .optional(),
    currentSemester: z
      .number()
      .int({ message: "Current semester must be an integer" })
      .min(1, { message: "Current semester must be at least 1" })
      .optional(),
    admissionDate: dateCoerceOptional("Admission date must be a valid date"),
    expectedGraduationDate: dateCoerceOptional(
      "Expected graduation date must be a valid date"
    ),
    profile: z.any().optional(),
  });

  return schema.safeParse(data);
};

export const studentUpdateValidation = (data) => {
  const schema = z
    .object({
      fullName: z
        .string()
        .trim()
        .min(1, { message: "Full name cannot be empty" })
        .optional(),
      departmentId: z.string().optional(),
      programId: z.string().optional(),
      batchId: z.string().optional(),
      sessionId: z.string().optional(),
      enrollmentStatus: z
        .enum([
          "not_enrolled",
          "enrolled",
          "graduated",
          "dropped_out",
          "suspended",
          "on_leave",
          "transferred_out",
          "transferred_in",
        ])
        .optional(),
      currentSemester: z
        .number()
        .int({ message: "Current semester must be an integer" })
        .min(1, { message: "Current semester must be at least 1" })
        .optional(),
      expectedGraduationDate: dateCoerceOptional(
        "Expected graduation date must be a valid date"
      ),
      actualGraduationDate: dateCoerceOptional(
        "Actual graduation date must be a valid date"
      ),
      profile: z.any().optional(),
    })
    .refine((obj) => Object.keys(obj).length > 0, {
      message: "At least one field must be provided",
    });

  return schema.safeParse(data);
};
