import mongoose from "mongoose";
import BaseUserSchema from "./schemas/BaseUserSchema.js";
import { attachUserMethods, attachUserHooks } from "./schemas/UserMethods.js";

const studentSchema = new mongoose.Schema(
  {
    ...BaseUserSchema,
    // Student specific fields
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
    },
    departmentId: {
      type: String,
      required: true,
    },
    programId: {
      type: String,
      required: true,
    },
    batchId: {
      type: String,
      required: true,
    },
    sessionId: {
      type: String,
      required: true,
    },
    enrollmentStatus: {
      type: String,
      enum: [
        "not_enrolled",
        "enrolled",
        "graduated",
        "dropped_out",
        "suspended",
        "on_leave",
        "transferred_out",
        "transferred_in",
      ],
      default: "not_enrolled",
    },
    currentSemester: {
      type: Number,
      default: 1,
    },
    admissionDate: {
      type: Date,
      default: Date.now,
    },
    expectedGraduationDate: {
      type: Date,
    },
    actualGraduationDate: {
      type: Date,
    },
    profile: {
      type: String,
      ref: "StudentProfile",
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        delete ret.refreshToken;
        delete ret.twoFactorSecret;
      },
    },
  }
);

attachUserHooks(studentSchema);
attachUserMethods(studentSchema);

const Student = mongoose.model("Student", studentSchema);

export default Student;
