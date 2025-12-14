import { Router } from "express";
import { authenticate, authorize } from "shared";
import { validate } from "shared";
import { materialCreateSchema } from "../validations/schemas.js";
import materialController from "../controllers/materialController.js";
import { createUpload } from "../middlewares/uploadMiddleware.js";

const router = Router();
router.use(authenticate);

const materialUpload = createUpload("materials");

router.post(
  "/",
  authorize("super_admin", "admin", "program_controller", "teacher"),
  validate(materialCreateSchema),
  materialController.create
);
router.post(
  "/upload",
  authorize("super_admin", "admin", "program_controller", "teacher"),
  materialUpload.array("files"),
  materialController.upload
);
router.get(
  "/:workspaceId",
  authorize("super_admin", "admin", "program_controller", "teacher", "student"),
  materialController.list
);
router.get(
  "/item/:id",
  authorize("super_admin", "admin", "program_controller", "teacher", "student"),
  materialController.get
);
router.get(
  "/item/:id/attachments/:attachmentId/download",
  authorize("super_admin", "admin", "program_controller", "teacher", "student"),
  materialController.downloadAttachment
);
router.patch(
  "/:id",
  authorize("super_admin", "admin", "program_controller", "teacher"),
  materialController.update
);
router.delete(
  "/:id",
  authorize("super_admin", "admin", "program_controller", "teacher"),
  materialController.delete
);

export default router;
