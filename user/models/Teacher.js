import mongoose from "mongoose";
import BaseUserSchema from "./schemas/BaseUserSchema.js";
import { attachUserMethods, attachUserHooks } from "./schemas/UserMethods.js";

const teacherSchema = new mongoose.Schema(
  {
    ...BaseUserSchema,
    // Teacher specific fields
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
    },
    departmentId: {
      type: String,
      required: true,
    },
    designation: {
      type: String,
      enum: [
        "professor",
        "associate_professor",
        "assistant_professor",
        "lecturer",
        "senior_lecturer",
      ],
    },
    isDepartmentHead: {
      type: Boolean,
      default: false,
    },
    joiningDate: {
      type: Date,
    },
    profile: {
      type: String,
      ref: "Profile",
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

attachUserHooks(teacherSchema);
attachUserMethods(teacherSchema);

const Teacher = mongoose.model("Teacher", teacherSchema);

export default Teacher;
