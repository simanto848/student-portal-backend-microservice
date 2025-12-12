import BatchChatGroup from "../models/BatchChatGroup.js";
import CourseChatGroup from "../models/CourseChatGroup.js";
import Message from "../models/Message.js";
import AcademicServiceClient from "../clients/AcademicServiceClient.js";
import EnrollmentServiceClient from "../clients/EnrollmentServiceClient.js";
import UserServiceClient from "../clients/UserServiceClient.js";
import { getIO } from "../socket.js";

class ChatService {
  async listMyChatGroups(user, accessToken) {
    const userId = user?.id ?? user?.sub;
    const userRole = user?.role ?? user?.type ?? "student";
    if (!userId) throw new Error("Invalid user");

    if (userRole === "student") {
      const enrollments =
        await EnrollmentServiceClient.listEnrollmentsForStudent(
          userId,
          { status: "active", limit: "200" },
          accessToken
        );

      const uniqueBatchIds = Array.from(
        new Set((enrollments || []).map((e) => e.batchId).filter(Boolean))
      );

      const uniqueCourseEnrollments = (enrollments || []).filter(
        (e) => e.batchId && e.courseId && e.sessionId
      );

      const groupOr = uniqueCourseEnrollments.map((e) => {
        const query = {
          batchId: e.batchId,
          courseId: e.courseId,
          sessionId: e.sessionId,
          isActive: true,
        };
        if (e.instructorId) {
          query.instructorId = e.instructorId;
        }
        return query;
      });

      const [batchGroups, courseGroups] = await Promise.all([
        uniqueBatchIds.length
          ? BatchChatGroup.find({
              batchId: { $in: uniqueBatchIds },
              isActive: true,
            })
          : Promise.resolve([]),
        groupOr.length
          ? CourseChatGroup.find({ $or: groupOr })
          : Promise.resolve([]),
      ]);

      const combined = [
        ...batchGroups.map((g) => ({ group: g, type: "BatchChatGroup" })),
        ...courseGroups.map((g) => ({ group: g, type: "CourseChatGroup" })),
      ];

      const enriched = await Promise.all(
        combined.map(async ({ group, type }) => {
          const lastMessage = await Message.findOne({
            chatGroupId: group.id,
            isDeleted: false,
          }).sort({ createdAt: -1 });

          const result = {
            ...group.toJSON(),
            type,
            lastMessage: lastMessage
              ? lastMessage.toJSON?.() ?? lastMessage
              : null,
          };

          try {
            if (type === "CourseChatGroup") {
              const [course, batch, teacher] = await Promise.all([
                AcademicServiceClient.getCourseDetails(
                  group.courseId,
                  accessToken
                ),
                AcademicServiceClient.getBatchDetails(
                  group.batchId,
                  accessToken
                ),
                group.instructorId
                  ? UserServiceClient.getTeacherDetails(
                      group.instructorId,
                      accessToken
                    )
                  : Promise.resolve(null),
              ]);
              result.courseName = course?.name;
              result.courseCode = course?.code;
              result.batchName = batch?.name;
              result.instructorName = teacher?.fullName;
            } else {
              const batch = await AcademicServiceClient.getBatchDetails(
                group.batchId,
                accessToken
              );
              result.batchName = batch?.name;
            }
          } catch (e) {
            console.error("Error enriching chat group details:", e.message);
          }

          return result;
        })
      );

      enriched.sort((a, b) => {
        const aTime = new Date(
          a.lastMessage?.createdAt || a.updatedAt || a.createdAt || 0
        ).getTime();
        const bTime = new Date(
          b.lastMessage?.createdAt || b.updatedAt || b.createdAt || 0
        ).getTime();
        return bTime - aTime;
      });

      return enriched;
    }

    const [batchGroups, courseGroups] = await Promise.all([
      BatchChatGroup.find({ isActive: true, counselorId: userId }).limit(200),
      CourseChatGroup.find({ isActive: true, instructorId: userId }).limit(200),
    ]);

    return [
      ...batchGroups.map((g) => ({ ...g.toJSON(), type: "BatchChatGroup" })),
      ...courseGroups.map((g) => ({ ...g.toJSON(), type: "CourseChatGroup" })),
    ];
  }

  async getOrCreateBatchChatGroup(batchId, counselorId, user) {
    const userId = user?.id ?? user?.sub;
    const userRole = user?.role ?? user?.type;
    let chatGroup = await BatchChatGroup.findOne({ batchId });

    if (!chatGroup) {
      if (userRole === "student") {
        throw new Error(
          "Chat group has not been started by the counselor yet."
        );
      }
      if (userRole === "teacher" && userId !== counselorId) {
        throw new Error("Only the assigned counselor can start this chat.");
      }

      chatGroup = await BatchChatGroup.create({ batchId, counselorId });
    }
    return chatGroup;
  }

  async getOrCreateCourseChatGroup(
    batchId,
    courseId,
    sessionId,
    instructorId,
    user
  ) {
    const userId = user?.id ?? user?.sub;
    const userRole = user?.role ?? user?.type;
    let chatGroup = await CourseChatGroup.findOne({
      batchId,
      courseId,
      sessionId,
      instructorId,
    });

    if (!chatGroup) {
      if (userRole === "student") {
        throw new Error(
          "Chat group has not been started by the instructor yet."
        );
      }
      if (userRole === "teacher" && userId !== instructorId) {
        throw new Error("Only the assigned instructor can start this chat.");
      }

      chatGroup = await CourseChatGroup.create({
        batchId,
        courseId,
        sessionId,
        instructorId,
      });
    }
    return chatGroup;
  }

  async getChatGroup(chatGroupId, type) {
    if (type === "BatchChatGroup") {
      return await BatchChatGroup.findById(chatGroupId);
    } else if (type === "CourseChatGroup") {
      return await CourseChatGroup.findById(chatGroupId);
    }
    return null;
  }

  async sendMessage(data, accessToken, user) {
    let {
      chatGroupId,
      chatGroupType,
      senderId,
      senderModel,
      content,
      attachments,
    } = data;
    const userId = user?.id ?? user?.sub;
    const userRole = user?.role ?? user?.type ?? "student";

    if (!chatGroupType || chatGroupType === "group") {
      const courseGroup = await CourseChatGroup.findById(chatGroupId);
      if (courseGroup) {
        chatGroupType = "CourseChatGroup";
      } else {
        const batchGroup = await BatchChatGroup.findById(chatGroupId);
        if (batchGroup) {
          chatGroupType = "BatchChatGroup";
        }
      }
    }


    const chatGroup = await this.getChatGroup(chatGroupId, chatGroupType);
    if (!chatGroup) {
      console.error(
        `ChatService.sendMessage: Group not found! ID: ${chatGroupId}, Type: ${chatGroupType}`
      );
      throw new Error(
        `Chat group not found. ID: ${chatGroupId}, Type: ${chatGroupType}`
      );
    }
    if (!chatGroup.isActive) throw new Error("Chat group is not active");

    try {
      if (userRole === "student") {
        const ok = await EnrollmentServiceClient.isStudentEnrolled(
          userId,
          chatGroup.batchId,
          chatGroup.courseId,
          accessToken
        );
        if (chatGroupType === "CourseChatGroup" && !ok) {
          throw new Error("You are not enrolled in this course chat");
        }
      }
    } catch (e) {
      if (userRole === "student") {
        throw e;
      }
    }

    const message = await Message.create({
      chatGroupId,
      chatGroupType,
      senderId,
      senderModel,
      content,
      attachments,
    });

    try {
      getIO().to(chatGroupId).emit("new_message", message);
    } catch (error) {
      console.error("Socket emit error:", error);
    }

    return message;
  }

  async getMessages(
    chatGroupId,
    limit = 50,
    skip = 0,
    search = "",
    filter = ""
  ) {
    const query = { chatGroupId, isDeleted: false };
    if (search) {
      query.content = { $regex: search, $options: "i" };
    }

    if (filter === "pinned") {
      query.isPinned = true;
    } else if (filter === "media") {
      query.attachments = { $exists: true, $not: { $size: 0 } };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return messages;
  }

  // --- Detail Fetching ---
  async getChatGroupDetails(chatGroupId) {
    // Try to find in CourseChatGroup first
    let group = await CourseChatGroup.findById(chatGroupId);
    let type = "CourseChatGroup";

    if (!group) {
      group = await BatchChatGroup.findById(chatGroupId);
      type = "BatchChatGroup";
    }

    if (!group) {
      throw new Error("Chat group not found");
    }

    const result = {
      ...group.toJSON(),
      type,
    };

    try {
      if (type === "CourseChatGroup") {
        const [course, batch, teacher] = await Promise.all([
          AcademicServiceClient.getCourseDetails(group.courseId),
          AcademicServiceClient.getBatchDetails(group.batchId),
          group.instructorId
            ? UserServiceClient.getTeacherDetails(group.instructorId)
            : Promise.resolve(null),
        ]);
        result.courseName = course?.name;
        result.courseCode = course?.code;
        result.batchName = batch?.name;
        result.instructorName = teacher?.fullName;
      } else if (type === "BatchChatGroup") {
        const batch = await AcademicServiceClient.getBatchDetails(
          group.batchId
        );
        result.batchName = batch?.name;
      }
    } catch (error) {}

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
    } catch (error) {}

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
      getIO()
        .to(message.chatGroupId)
        .emit("message_deleted", { messageId: message._id });
    } catch (error) {
      console.error("Socket emit error:", error);
    }

    return message;
  }

  async pinMessage(messageId, userId, userRole) {
    const message = await Message.findById(messageId);
    if (!message) throw new Error("Message not found");

    const chatGroup = await this.getChatGroup(
      message.chatGroupId,
      message.chatGroupType
    );
    if (!chatGroup) throw new Error("Chat group not found");

    let canPin = false;
    if (userRole === "teacher") {
      if (message.chatGroupType === "CourseChatGroup") {
        if (chatGroup.instructorId === userId) canPin = true;
      } else if (message.chatGroupType === "BatchChatGroup") {
        if (chatGroup.counselorId === userId) canPin = true;
      }
    } else if (userRole === "student") {
      const batch = await AcademicServiceClient.getBatchDetails(
        chatGroup.batchId
      );
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
    } catch (error) {}

    return message;
  }

  async reactToMessage(messageId, userId, reaction) {
    const message = await Message.findById(messageId);
    if (!message) throw new Error("Message not found");

    const existingReactionIndex = message.reactions.findIndex(
      (r) => r.userId === userId
    );

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
    } catch (error) {}

    return message;
  }
}

export default new ChatService();
