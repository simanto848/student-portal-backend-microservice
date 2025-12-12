import ChatService from "../services/ChatService.js";

const getAccessToken = (req) => {
  const headerToken = req.headers.authorization?.split(" ")[1];
  const cookieToken = req.cookies?.accessToken;
  return headerToken || cookieToken;
};

class ChatController {
  async listMyChatGroups(req, res) {
    try {
      const token = getAccessToken(req);
      const groups = await ChatService.listMyChatGroups(req.user, token);
      res.status(200).json({ success: true, data: groups });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async createBatchChatGroup(req, res) {
    try {
      const { batchId, counselorId } = req.body;
      const chatGroup = await ChatService.getOrCreateBatchChatGroup(
        batchId,
        counselorId,
        req.user
      );
      res.status(200).json({ success: true, data: chatGroup });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async createCourseChatGroup(req, res) {
    try {
      const { batchId, courseId, sessionId, instructorId } = req.body;
      const chatGroup = await ChatService.getOrCreateCourseChatGroup(
        batchId,
        courseId,
        sessionId,
        instructorId,
        req.user
      );
      res.status(200).json({ success: true, data: chatGroup });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getChatGroupDetails(req, res) {
    try {
      const { chatGroupId } = req.params;
      const details = await ChatService.getChatGroupDetails(
        chatGroupId,
        getAccessToken(req)
      );
      res.status(200).json({ success: true, data: details });
    } catch (error) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  async sendMessage(req, res) {
    try {
      console.log("ChatController.sendMessage body:", req.body); // DEBUG LOG
      const { chatGroupId, chatGroupType, content, attachments } = req.body;
      const senderId = req.user.id ?? req.user.sub;
      const senderRole = req.user.role ?? req.user.type;
      const senderModel =
        senderRole && senderRole !== "student" ? "Teacher" : "Student";

      const message = await ChatService.sendMessage(
        {
          chatGroupId,
          chatGroupType,
          senderId,
          senderModel,
          content,
          attachments,
        },
        getAccessToken(req),
        req.user
      );
      res.status(201).json({ success: true, data: message });
    } catch (error) {
      console.error("ChatController.sendMessage error:", error); // DEBUG LOG
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getMessages(req, res) {
    try {
      const { chatGroupId } = req.params;
      const { limit, skip, search, filter } = req.query;
      const messages = await ChatService.getMessages(
        chatGroupId,
        parseInt(limit),
        parseInt(skip),
        search,
        filter,
        getAccessToken(req)
      );
      res.status(200).json({ success: true, data: messages });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async editMessage(req, res) {
    try {
      const { messageId } = req.params;
      const { content } = req.body;
      const userId = req.user.id;

      const message = await ChatService.editMessage(messageId, userId, content);
      res.status(200).json({ success: true, data: message });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async deleteMessage(req, res) {
    try {
      const { messageId } = req.params;
      const userId = req.user.id;

      await ChatService.deleteMessage(messageId, userId);
      res.status(200).json({ success: true, message: "Message deleted" });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async pinMessage(req, res) {
    try {
      const { messageId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const message = await ChatService.pinMessage(messageId, userId, userRole);
      res.status(200).json({ success: true, data: message });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async reactToMessage(req, res) {
    try {
      const { messageId } = req.params;
      const { reaction } = req.body;
      const userId = req.user.id;

      const message = await ChatService.reactToMessage(
        messageId,
        userId,
        reaction
      );
      res.status(200).json({ success: true, data: message });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

export default new ChatController();
