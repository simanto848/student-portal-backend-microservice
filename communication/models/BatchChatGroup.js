import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const batchChatGroupSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            default: uuidv4,
        },
        batchId: {
            type: String,
            required: true,
            unique: true,
        },
        counselorId: {
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

const BatchChatGroup = mongoose.model("BatchChatGroup", batchChatGroupSchema);

export default BatchChatGroup;
