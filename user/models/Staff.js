import mongoose from "mongoose";
import BaseUserSchema from "./schemas/BaseUserSchema.js";
import { attachUserMethods, attachUserHooks } from "./schemas/UserMethods.js";

const staffSchema = new mongoose.Schema(
  {
    ...BaseUserSchema,
    // Staff specific fields
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
    },
    departmentId: {
      type: String,
      required: true,
    },
    joiningDate: {
      type: Date,
    },
    role: {
      type: String,
      enum: ["program_controller", "admission", "library", "it", "finance", "transport", "hr", "hostel",],
      required: true,
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

attachUserHooks(staffSchema);
attachUserMethods(staffSchema);

const Staff = mongoose.model("Staff", staffSchema);

export default Staff;
