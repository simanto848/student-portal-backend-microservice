import { Router } from "express";
import { authenticate, authorize } from "shared";
import { validate } from "shared";
import { materialCreateSchema } from "../validations/schemas.js";
import materialController from "../controllers/materialController.js";
import { createUpload } from "../middlewares/uploadMiddleware.js";

const router = Router();
router.use(authenticate);

const materialUpload = createUpload("materials");

router.post("/", authorize("teacher"), validate(materialCreateSchema), materialController.create);
router.post("/upload", authorize("teacher"), materialUpload.array("files"), materialController.upload);
router.post("/attachments/upload", authorize("teacher"), materialUpload.array("files"), materialController.uploadAttachments);
router.get("/:workspaceId", authorize("teacher", "student"), materialController.list);
router.get("/item/:id", authorize("teacher", "student"), materialController.get);
router.get("/item/:id/attachments/:attachmentId/download", authorize("teacher", "student"), materialController.downloadAttachment);
router.patch("/:id", authorize("teacher"), materialController.update);
router.delete("/:id", authorize("teacher"), materialController.delete);

export default router;
