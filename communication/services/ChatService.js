import BatchChatGroup from "../models/BatchChatGroup.js";
import CourseChatGroup from "../models/CourseChatGroup.js";
import Message from "../models/Message.js";
import AcademicServiceClient from "../clients/AcademicServiceClient.js";
import EnrollmentServiceClient from "../clients/EnrollmentServiceClient.js";
import { getIO } from "../socket.js";

class ChatService {
    // --- Chat Group Management ---
    async getOrCreateBatchChatGroup(batchId, counselorId) {
        let chatGroup = await BatchChatGroup.findOne({ batchId });
        if (!chatGroup) {
            chatGroup = await BatchChatGroup.create({ batchId, counselorId });
        }
        return chatGroup;
    }

    async getOrCreateCourseChatGroup(batchId, courseId, sessionId, instructorId) {
        let chatGroup = await CourseChatGroup.findOne({ batchId, courseId, sessionId, instructorId });
        if (!chatGroup) {
            chatGroup = await CourseChatGroup.create({ batchId, courseId, sessionId, instructorId });
        }
        return chatGroup;
    }

    async getChatGroup(chatGroupId, type) {
        if (type === 'BatchChatGroup') {
            return await BatchChatGroup.findById(chatGroupId);
        } else if (type === 'CourseChatGroup') {
            return await CourseChatGroup.findById(chatGroupId);
        }
        return null;
    }

    // --- Messaging ---
    async sendMessage(data) {
        const { chatGroupId, chatGroupType, senderId, senderModel, content, attachments } = data;

        const chatGroup = await this.getChatGroup(chatGroupId, chatGroupType);
        if (!chatGroup) throw new Error("Chat group not found");
        if (!chatGroup.isActive) throw new Error("Chat group is not active");

        // TODO: Verify sender membership (can be optimized by caching or trusting token claims if they contain enrollment info)
        // For now, we assume the controller/middleware has done basic checks, but strictly we should check enrollment/assignment here.

        const message = await Message.create({
            chatGroupId,
            chatGroupType,
            senderId,
            senderModel,
            content,
            attachments
        });

        try {
            getIO().to(chatGroupId).emit("new_message", message);
        } catch (error) {
            console.error("Socket emit error:", error);
        }

        return message;
    }

    async getMessages(chatGroupId, limit = 50, skip = 0) {
        return await Message.find({ chatGroupId, isDeleted: false })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
    }

    async editMessage(messageId, userId, newContent) {
        const message = await Message.findById(messageId);
        if (!message) throw new Error("Message not found");
        if (message.isDeleted) throw new Error("Message is deleted");

        if (message.senderId !== userId) {
            throw new Error("Unauthorized to edit this message");
        }

        const timeDiff = (Date.now() - message.createdAt.getTime()) / 1000 / 60;
        if (timeDiff > 15) {
            throw new Error("Edit time limit exceeded");
        }

        message.content = newContent;
        message.updatedAt = Date.now();
        await message.save();

        try {
            getIO().to(message.chatGroupId).emit("message_updated", message);
        } catch (error) {
            console.error("Socket emit error:", error);
        }

        return message;
    }

    async deleteMessage(messageId, userId) {
        const message = await Message.findById(messageId);
        if (!message) throw new Error("Message not found");

        if (message.senderId !== userId) {
            throw new Error("Unauthorized to delete this message");
        }

        const timeDiff = (Date.now() - message.createdAt.getTime()) / 1000 / 60;
        if (timeDiff > 15) {
            throw new Error("Delete time limit exceeded");
        }

        message.isDeleted = true;
        await message.save();

        try {
            getIO().to(message.chatGroupId).emit("message_deleted", { messageId: message._id });
        } catch (error) {
            console.error("Socket emit error:", error);
        }

        return message;
    }

    // --- Pinning ---
    async pinMessage(messageId, userId, userRole) {
        const message = await Message.findById(messageId);
        if (!message) throw new Error("Message not found");

        const chatGroup = await this.getChatGroup(message.chatGroupId, message.chatGroupType);
        if (!chatGroup) throw new Error("Chat group not found");


        let canPin = false;
        if (userRole === 'teacher') {
            if (message.chatGroupType === 'CourseChatGroup') {
                if (chatGroup.instructorId === userId) canPin = true;
            } else if (message.chatGroupType === 'BatchChatGroup') {
                if (chatGroup.counselorId === userId) canPin = true;
            }
        } else if (userRole === 'student') {
            const batch = await AcademicServiceClient.getBatchDetails(chatGroup.batchId);
            if (batch && batch.classRepresentativeId === userId) {
                canPin = true;
            }
        }

        if (!canPin) throw new Error("Unauthorized to pin messages");

        message.isPinned = !message.isPinned;
        message.pinnedBy = message.isPinned ? userId : null;
        await message.save();

        try {
            getIO().to(message.chatGroupId).emit("message_pinned", message);
        } catch (error) {
            console.error("Socket emit error:", error);
        }

        return message;
    }

    // --- Reactions ---
    async reactToMessage(messageId, userId, reaction) {
        const message = await Message.findById(messageId);
        if (!message) throw new Error("Message not found");

        const existingReactionIndex = message.reactions.findIndex(r => r.userId === userId);

        if (existingReactionIndex > -1) {
            if (message.reactions[existingReactionIndex].reaction === reaction) {
                message.reactions.splice(existingReactionIndex, 1);
            } else {
                message.reactions[existingReactionIndex].reaction = reaction;
            }
        } else {
            message.reactions.push({ userId, reaction });
        }

        await message.save();

        try {
            getIO().to(message.chatGroupId).emit("message_reaction", message);
        } catch (error) {
            console.error("Socket emit error:", error);
        }

        return message;
    }
}

export default new ChatService();
