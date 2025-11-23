import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const courseChatGroupSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            default: uuidv4,
        },
        batchId: {
            type: String,
            required: true,
        },
        courseId: {
            type: String,
            required: true,
        },
        sessionId: {
            type: String,
            required: true,
        },
        instructorId: {
            type: String,
            required: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
        updatedAt: {
            type: Date,
            default: Date.now,
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
    }
);

courseChatGroupSchema.index({ batchId: 1, courseId: 1, sessionId: 1, instructorId: 1 }, { unique: true });

const CourseChatGroup = mongoose.model("CourseChatGroup", courseChatGroupSchema);

export default CourseChatGroup;
