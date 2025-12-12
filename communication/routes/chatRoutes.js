import express from "express";
import ChatController from "../controllers/ChatController.js";
import { authenticate, authorize } from "shared";

const router = express.Router();

router.use(authenticate);

// List groups available to the current user (student/teacher/admin)
router.get("/groups/mine", ChatController.listMyChatGroups);

// Chat Group Management
router.post(
  "/groups/batch",
  authorize("super_admin", "admin", "teacher"),
  ChatController.createBatchChatGroup
);
router.post(
  "/groups/course",
  authorize("super_admin", "admin", "teacher"),
  ChatController.createCourseChatGroup
);
router.get("/groups/:chatGroupId", ChatController.getChatGroupDetails);

// Messaging
router.post(
  "/send",
  authorize("super_admin", "admin", "teacher"),
  ChatController.sendMessage
);
router.get("/:chatGroupId/messages", ChatController.getMessages);

// Message Actions
router.put(
  "/messages/:messageId",
  authorize("super_admin", "admin", "teacher"),
  ChatController.editMessage
);
router.delete(
  "/messages/:messageId",
  authorize("super_admin", "admin", "teacher"),
  ChatController.deleteMessage
);
router.patch(
  "/messages/:messageId/pin",
  authorize("super_admin", "admin", "teacher"),
  ChatController.pinMessage
);
router.patch(
  "/messages/:messageId/react",
  authorize("super_admin", "admin", "teacher"),
  ChatController.reactToMessage
);

export default router;
