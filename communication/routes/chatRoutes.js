import express from "express";
import ChatController from "../controllers/ChatController.js";
import { authenticate, authorize } from "shared";
import upload from "../middlewares/upload.js";
import UploadController from "../controllers/UploadController.js";

const router = express.Router();

router.use(authenticate);

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
  authorize("super_admin", "admin", "teacher", "student"),
  ChatController.sendMessage
);
router.get("/:chatGroupId/messages", ChatController.getMessages);

// Message Actions
router.put(
  "/messages/:messageId",
  authorize("super_admin", "admin", "teacher", "student"),
  ChatController.editMessage
);
router.delete(
  "/messages/:messageId",
  authorize("super_admin", "admin", "teacher", "student"),
  ChatController.deleteMessage
);
router.patch(
  "/messages/:messageId/pin",
  authorize("super_admin", "admin", "teacher", "student"),
  ChatController.pinMessage
);
router.patch(
  "/messages/:messageId/react",
  authorize("super_admin", "admin", "teacher", "student"),
  ChatController.reactToMessage
);

// File Upload
// File Upload

router.post(
  "/upload",
  authorize("super_admin", "admin", "teacher", "student"),
  upload.single("file"),
  UploadController.uploadFile
);

export default router;
