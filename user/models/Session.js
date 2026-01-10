import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const sessionSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            default: uuidv4,
        },
        user: {
            type: String,
            required: true,
            index: true
        },
        role: {
            type: String,
            required: true,
            enum: ['admin', 'staff', 'teacher', 'student'],
        },
        refreshToken: {
            type: String,
            required: true,
            index: true
        },
        device: {
            browser: { type: String },
            os: { type: String },
            deviceType: { type: String }, // mobile, desktop, tablet
        },
        ipAddress: {
            type: String,
        },
        location: {
            type: String,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
        lastActive: {
            type: Date,
            default: Date.now,
        }
    },
    {
        timestamps: true,
        toJSON: {
            transform(doc, ret) {
                ret.id = ret._id;
                delete ret._id;
                delete ret.__v;
                delete ret.refreshToken;
            },
        },
    }
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Session = mongoose.model('Session', sessionSchema);

export default Session;
