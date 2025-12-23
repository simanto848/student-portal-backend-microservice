import mongoose from "mongoose";
import BaseUserSchema from "./schemas/BaseUserSchema.js";
import { attachUserMethods, attachUserHooks } from "./schemas/UserMethods.js";

const adminSchema = new mongoose.Schema(
  {
    ...BaseUserSchema,
    // Admin specific fields
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
    },
    role: {
      type: String,
      enum: ["super_admin", "admin", "moderator"],
      required: true,
      default: "moderator",
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

attachUserHooks(adminSchema);
attachUserMethods(adminSchema);

const Admin = mongoose.model("Admin", adminSchema);

export default Admin;
