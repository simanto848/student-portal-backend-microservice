import { v4 as uuidv4 } from "uuid";

// Common fields shared across all user types
const BaseUserSchema = {
  _id: {
    type: String,
    default: uuidv4,
  },
  email: {
    type: String,
    required: [true, "Email is required."],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, "Password is required."],
    select: false,
  },
  fullName: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    trim: true,
  },
  profileImage: {
    type: String,
    default: null,
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
  },
  dateOfBirth: {
    type: Date,
  },
  gender: {
    type: String,
    enum: ["male", "female", "other"],
  },
  nationality: {
    type: String,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  passwordChangedAt: {
    type: Date,
    default: null,
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false,
  },
  twoFactorSecret: {
    type: String,
    select: false,
  },
  emailUpdatesEnabled: {
    type: Boolean,
    default: true,
  },
  lastLoginIp: {
    type: String,
    default: null,
  },
  lastLoginAt: {
    type: Date,
    default: null,
  },
  refreshToken: {
    type: String,
    default: null,
    select: false,
  },
  refreshTokenExpiresAt: {
    type: Date,
    default: null,
  },
  registeredIpAddress: [{
    type: String
  }],
  // Role Reference (Dynamic RBAC) - Optional for backward compatibility with string roles
  roleId: {
    type: String,
    ref: "Role",
    default: null
  },
  deletedAt: {
    type: Date,
    default: null,
  },
};

export default BaseUserSchema;
