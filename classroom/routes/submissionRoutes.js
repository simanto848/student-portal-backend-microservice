import { Router } from "express";
import { authenticate, authorize } from "shared";
import { validate } from "shared";
import {
  submissionSchema,
  gradeSchema,
  feedbackSchema,
} from "../validations/schemas.js";
import submissionController from "../controllers/submissionController.js";
import { createUpload } from "../middlewares/uploadMiddleware.js";

const router = Router();
router.use(authenticate);

const submissionUpload = createUpload("submissions");

router.get(
  "/:assignmentId/mine",
  authorize("super_admin", "admin", "program_controller", "teacher", "student"),
  submissionController.getMineByAssignment
);
router.post(
  "/:assignmentId/upload",
  authorize("student"),
  submissionUpload.array("files"),
  submissionController.submitWithFiles
);
router.post(
  "/:assignmentId",
  authorize("student"),
  validate(submissionSchema),
  submissionController.submitOrUpdate
);
router.get(
  "/:assignmentId",
  authorize("super_admin", "admin", "program_controller", "teacher"),
  submissionController.listByAssignment
);
router.get(
  "/item/:id/files/:fileId/download",
  authorize("super_admin", "admin", "program_controller", "teacher", "student"),
  submissionController.downloadFile
);
router.get(
  "/item/:id",
  authorize("super_admin", "admin", "program_controller", "teacher", "student"),
  submissionController.get
);
router.delete(
  "/item/:id/files/:fileId",
  authorize("student"),
  submissionController.removeFile
);
router.post(
  "/:id/grade",
  authorize("super_admin", "admin", "program_controller", "teacher"),
  validate(gradeSchema),
  submissionController.grade
);
router.post(
  "/:id/feedback",
  authorize("super_admin", "admin", "program_controller", "teacher", "student"),
  validate(feedbackSchema),
  submissionController.addFeedback
);

export default router;
