import BatchChatGroup from "../models/BatchChatGroup.js";
import CourseChatGroup from "../models/CourseChatGroup.js";
import Message from "../models/Message.js";
import AcademicServiceClient from "../clients/AcademicServiceClient.js";
import EnrollmentServiceClient from "../clients/EnrollmentServiceClient.js";
import { getIO } from "../socket.js";

class ChatService {
    // --- Chat Group Management ---
    async getOrCreateBatchChatGroup(batchId, counselorId, user) {
        let chatGroup = await BatchChatGroup.findOne({ batchId });

        if (!chatGroup) {
            // Access Control: Only admin or the assigned counselor can create the group
            if (user.role === 'student') {
                throw new Error("Chat group has not been started by the counselor yet.");
            }
            if (user.role === 'teacher' && user.id !== counselorId) {
                throw new Error("Only the assigned counselor can start this chat.");
            }

            chatGroup = await BatchChatGroup.create({ batchId, counselorId });
        }
        return chatGroup;
    }

    async getOrCreateCourseChatGroup(batchId, courseId, sessionId, instructorId, user) {
        let chatGroup = await CourseChatGroup.findOne({ batchId, courseId, sessionId, instructorId });

        if (!chatGroup) {
            // Access Control: Only admin or the assigned instructor can create the group
            if (user.role === 'student') {
                throw new Error("Chat group has not been started by the instructor yet.");
            }
            if (user.role === 'teacher' && user.id !== instructorId) {
                throw new Error("Only the assigned instructor can start this chat.");
            }

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
        let { chatGroupId, chatGroupType, senderId, senderModel, content, attachments } = data;

        console.log(`ChatService.sendMessage: Request for group ${chatGroupId}, type: ${chatGroupType}`);

        // SMART RESOLVE: If type is generic or missing, try to find the group in specific collections
        if (!chatGroupType || chatGroupType === 'group') {
            const courseGroup = await CourseChatGroup.findById(chatGroupId);
            if (courseGroup) {
                chatGroupType = 'CourseChatGroup';
                console.log(`ChatService.sendMessage: Resolved type to CourseChatGroup`);
            } else {
                const batchGroup = await BatchChatGroup.findById(chatGroupId);
                if (batchGroup) {
                    chatGroupType = 'BatchChatGroup';
                    console.log(`ChatService.sendMessage: Resolved type to BatchChatGroup`);
                }
            }
        }

        console.log(`ChatService.sendMessage: Final lookup with type: ${chatGroupType}`);

        const chatGroup = await this.getChatGroup(chatGroupId, chatGroupType);
        if (!chatGroup) {
            console.error(`ChatService.sendMessage: Group not found! ID: ${chatGroupId}, Type: ${chatGroupType}`);
            throw new Error(`Chat group not found. ID: ${chatGroupId}, Type: ${chatGroupType}`);
        }
        if (!chatGroup.isActive) throw new Error("Chat group is not active");

        // TODO: Verify sender membership (can be optimized by caching or trusting token claims if they contain enrollment info)
        // For now, we assume the controller/middleware has done basic checks, but strictly we should check enrollment/assignment here.

        const message = await Message.create({
            chatGroupId,
            chatGroupType, // Now guaranteed to be specific if found
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

    async getMessages(chatGroupId, limit = 50, skip = 0, search = "", filter = "") {
        console.log(`ChatService.getMessages: ID=${chatGroupId}, filter=${filter}, search=${search}`);

        const query = { chatGroupId, isDeleted: false };
        if (search) {
            query.content = { $regex: search, $options: "i" };
        }

        if (filter === 'pinned') {
            query.isPinned = true;
            console.log("ChatService.getMessages: Filtering by PINNED");
        } else if (filter === 'media') {
            query.attachments = { $exists: true, $not: { $size: 0 } };
            console.log("ChatService.getMessages: Filtering by MEDIA");
        }

        const messages = await Message.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        console.log(`ChatService.getMessages: Found ${messages.length} messages`);
        return messages;
    }

    // --- Detail Fetching ---
    async getChatGroupDetails(chatGroupId) {
        // Try to find in CourseChatGroup first
        let group = await CourseChatGroup.findById(chatGroupId);
        let type = 'CourseChatGroup';

        if (!group) {
            group = await BatchChatGroup.findById(chatGroupId);
            type = 'BatchChatGroup';
        }

        if (!group) {
            throw new Error("Chat group not found");
        }

        const result = {
            ...group.toJSON(),
            type
        };

        // Enrich with Academic Data
        try {
            if (type === 'CourseChatGroup') {
                const course = await AcademicServiceClient.getCourseDetails(group.courseId);
                const batch = await AcademicServiceClient.getBatchDetails(group.batchId);
                result.courseName = course?.name;
                result.courseCode = course?.code;
                result.batchName = batch?.name;
            } else if (type === 'BatchChatGroup') {
                const batch = await AcademicServiceClient.getBatchDetails(group.batchId);
                result.batchName = batch?.name;
            }
        } catch (error) {
            console.error("Error fetching academic details for chat group:", error);
            // Don't fail the whole request, just return what we have
        }

        return result;
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
