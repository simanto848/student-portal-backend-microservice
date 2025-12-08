import { z } from "zod";

const dateCoerceOptional = () =>
  z.preprocess((v) => {
    if (v === undefined || v === null || v === "") return undefined;
    if (v instanceof Date) return v;
    if (typeof v === "string" || typeof v === "number") {
      const d = new Date(v);
      return isNaN(d.getTime()) ? undefined : d;
    }
    return undefined;
  }, z.date({ invalid_type_error: "Date must be a valid date" }).optional());

const addressSchema = z
  .object({
    street: z.string().trim().optional(),
    city: z.string().trim().optional(),
    state: z.string().trim().optional(),
    zipCode: z.string().trim().optional(),
    country: z.string().trim().optional(),
  })
  .optional();

const fatherInfoSchema = z
  .object({
    name: z.string().trim().optional(),
    cell: z.string().trim().optional(),
    occupation: z.string().trim().optional(),
    nid: z.string().trim().optional(),
  })
  .optional();

const motherInfoSchema = z
  .object({
    name: z.string().trim().optional(),
    cell: z.string().trim().optional(),
    occupation: z.string().trim().optional(),
    nid: z.string().trim().optional(),
  })
  .optional();

const guardianInfoSchema = z
  .object({
    name: z.string().trim().optional(),
    cell: z.string().trim().optional(),
    occupation: z.string().trim().optional(),
  })
  .optional();

const emergencyContactSchema = z
  .object({
    name: z.string().trim().optional(),
    cell: z.string().trim().optional(),
    relation: z.string().trim().optional(),
    occupation: z.string().trim().optional(),
  })
  .optional();

const educationRecordSchema = z.object({
  examName: z.string().trim().optional(),
  group: z.string().trim().optional(),
  roll: z.string().trim().optional(),
  passingYear: z.number().int().optional(),
  gradeOrMarks: z.string().trim().optional(),
  cgpa: z.number().optional(),
  boardOrUniversity: z.string().trim().optional(),
});

export const studentProfileCreateValidation = (data) => {
  const schema = z.object({
    shift: z.enum(["Day", "Evening"]).optional(),
    group: z.string().trim().optional(),
    admissionFormSl: z.string().trim().optional(),
    admissionSeason: z
      .enum(["Spring", "Summer", "Fall", "Winter", ""])
      .optional(),
    admittedBy: z.string().trim().optional(),

    // Personal Information
    bloodGroup: z
      .enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", ""])
      .optional(),
    personalEmail: z
      .string()
      .trim()
      .email({ message: "Invalid email address" })
      .optional()
      .or(z.literal("")),
    studentMobile: z.string().trim().optional(),
    religion: z
      .enum(["Islam", "Hinduism", "Christianity", "Buddhism", "Other", ""])
      .optional(),
    gender: z.enum(["Male", "Female", "Other", ""]).optional(),
    dateOfBirth: dateCoerceOptional(),
    birthPlace: z.string().trim().optional(),
    monthlyIncomeOfGuardian: z.number().optional(),
    nationality: z.string().trim().optional(),
    nidOrPassportNo: z.string().trim().optional(),
    maritalStatus: z
      .enum(["Single", "Married", "Divorced", "Widowed", ""])
      .optional(),
    permanentAddress: addressSchema,
    mailingAddress: addressSchema,

    // Family Information
    father: fatherInfoSchema,
    mother: motherInfoSchema,
    guardian: guardianInfoSchema,
    emergencyContact: emergencyContactSchema,

    // Education Background
    educationRecords: z.array(educationRecordSchema).optional(),

    // Referee Information
    referredBy: z.string().trim().optional(),
    refereeInfo: z.string().trim().optional(),

    // Additional fields
    profilePicture: z.string().trim().optional(),
  });

  return schema.safeParse(data);
};

export const studentProfileUpdateValidation = (data) => {
  const schema = z
    .object({
      // General Information
      shift: z.enum(["Day", "Evening"]).optional(),
      group: z.string().trim().optional(),
      admissionFormSl: z.string().trim().optional(),
      admissionSeason: z
        .enum(["Spring", "Summer", "Fall", "Winter", ""])
        .optional(),
      admittedBy: z.string().trim().optional(),

      // Personal Information
      bloodGroup: z
        .enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", ""])
        .optional(),
      personalEmail: z
        .string()
        .trim()
        .email({ message: "Invalid email address" })
        .optional()
        .or(z.literal("")),
      studentMobile: z.string().trim().optional(),
      religion: z
        .enum(["Islam", "Hinduism", "Christianity", "Buddhism", "Other", ""])
        .optional(),
      gender: z.enum(["Male", "Female", "Other", ""]).optional(),
      dateOfBirth: dateCoerceOptional(),
      birthPlace: z.string().trim().optional(),
      monthlyIncomeOfGuardian: z.number().optional(),
      nationality: z.string().trim().optional(),
      nidOrPassportNo: z.string().trim().optional(),
      maritalStatus: z
        .enum(["Single", "Married", "Divorced", "Widowed", ""])
        .optional(),
      permanentAddress: addressSchema,
      mailingAddress: addressSchema,

      // Family Information
      father: fatherInfoSchema,
      mother: motherInfoSchema,
      guardian: guardianInfoSchema,
      emergencyContact: emergencyContactSchema,

      // Education Background
      educationRecords: z.array(educationRecordSchema).optional(),

      // Referee Information
      referredBy: z.string().trim().optional(),
      refereeInfo: z.string().trim().optional(),

      // Additional fields
      profilePicture: z.string().trim().optional(),
    })
    .refine((obj) => Object.keys(obj).length > 0, {
      message: "At least one field must be provided for update",
    });

  return schema.safeParse(data);
};

// Validation for adding education record
export const addEducationRecordValidation = (data) => {
  return z
    .object({
      examName: z.string().trim().min(1, { message: "Exam name is required" }),
      group: z.string().trim().optional(),
      roll: z.string().trim().optional(),
      passingYear: z.number().int().optional(),
      gradeOrMarks: z.string().trim().optional(),
      cgpa: z.number().optional(),
      boardOrUniversity: z.string().trim().optional(),
    })
    .safeParse(data);
};
