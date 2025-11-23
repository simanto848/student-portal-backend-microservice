import express from "express";
import ChatController from "../controllers/ChatController.js";
import { authenticate } from "../middlewares/auth.js";

const router = express.Router();

router.use(authenticate);

// Chat Group Management
router.post("/groups/batch", ChatController.createBatchChatGroup);
router.post("/groups/course", ChatController.createCourseChatGroup);

// Messaging
router.post("/send", ChatController.sendMessage);
router.get("/:chatGroupId/messages", ChatController.getMessages);

// Message Actions
router.put("/messages/:messageId", ChatController.editMessage);
router.delete("/messages/:messageId", ChatController.deleteMessage);
router.patch("/messages/:messageId/pin", ChatController.pinMessage);
router.patch("/messages/:messageId/react", ChatController.reactToMessage);

export default router;
