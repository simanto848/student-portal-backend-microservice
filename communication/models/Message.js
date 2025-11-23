import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const messageSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            default: uuidv4,
        },
        chatGroupId: {
            type: String,
            required: true,
            index: true,
        },
        chatGroupType: {
            type: String,
            enum: ['BatchChatGroup', 'CourseChatGroup'],
            required: true,
        },
        senderId: {
            type: String,
            required: true,
        },
        senderModel: {
            type: String,
            enum: ['Student', 'Teacher'],
            required: true,
        },
        content: {
            type: String,
            required: true,
        },
        attachments: {
            type: [String],
            default: [],
        },
        isPinned: {
            type: Boolean,
            default: false,
        },
        pinnedBy: {
            type: String,
            default: null,
        },
        reactions: [
            {
                userId: { type: String, required: true },
                reaction: { type: String, required: true },
            }
        ],
        isDeleted: {
            type: Boolean,
            default: false,
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

const Message = mongoose.model("Message", messageSchema);

export default Message;
