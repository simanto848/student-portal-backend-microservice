import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import OTP_PURPOSES from "../constants/OTP_PURPOSE.js";

const userOTPSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            default: uuidv4,
        },
        user: {
            type: String,
            ref: 'User',
            required: true,
        },
        otp: {
            type: String,
            required: true,
        },
        purpose: {
            type: String,
            required: true,
            enum: Object.values(OTP_PURPOSES),
        },
        expiresAt: {
            type: Date,
            required: true,
        },
    },
    {
        timestamps: true,
        toJSON: {
            transform(doc, ret) {
                ret.id = ret._id;
                delete ret._id;
                delete ret.__v;
            },
        },
    },
);

userOTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const UserOTP = mongoose.model('UserOTP', userOTPSchema);

export default UserOTP;
