import express from "express";
import assessmentTypeController from "../controllers/assessments/assessmentTypeController.js";
import assessmentController from "../controllers/assessments/assessmentController.js";
import assessmentSubmissionController from "../controllers/assessments/assessmentSubmissionController.js";
import { authenticate, authorize } from "shared";
import { validate } from "shared";
import {
  createAssessmentTypeSchema,
  updateAssessmentTypeSchema,
  getAssessmentTypeSchema,
} from "../validations/assessments/AssessmentTypeValidation.js";
import {
  createAssessmentSchema,
  updateAssessmentSchema,
  getAssessmentSchema,
  listAssessmentsSchema,
} from "../validations/assessments/AssessmentValidation.js";
import {
  createSubmissionSchema,
  updateSubmissionSchema,
  gradeSubmissionSchema,
  getSubmissionSchema,
  listSubmissionsSchema,
} from "../validations/assessments/AssessmentSubmissionValidation.js";
import { createUpload } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

router.use(authenticate);
// ========== Assessment Type Routes ==========
router.post(
  "/types",
  authorize("super_admin", "admin"),
  validate(createAssessmentTypeSchema),
  assessmentTypeController.createAssessmentType
);
router.put(
  "/types/:id",
  authorize("super_admin", "admin"),
  validate(updateAssessmentTypeSchema),
  assessmentTypeController.updateAssessmentType
);
router.delete(
  "/types/:id",
  authorize("super_admin", "admin"),
  validate(getAssessmentTypeSchema),
  assessmentTypeController.deleteAssessmentType
);
router.get("/types", assessmentTypeController.listAssessmentTypes);
router.get(
  "/types/:id",
  validate(getAssessmentTypeSchema),
  assessmentTypeController.getAssessmentType
);

// ========== Assessment Submission Routes ==========
router.post(
  "/submissions",
  authorize("student"),
  validate(createSubmissionSchema),
  assessmentSubmissionController.submitAssessment
);
router.post(
  "/submissions/upload",
  authorize("student"),
  createUpload("assessment-submissions", { maxFiles: 10 }).array("files", 10),
  assessmentSubmissionController.submitAssessmentWithFiles
);
router.post(
  "/submissions/:id/upload",
  authorize("student"),
  createUpload("assessment-submissions", { maxFiles: 10 }).array("files", 10),
  assessmentSubmissionController.updateSubmissionWithFiles
);
router.put(
  "/submissions/:id",
  authorize("student"),
  validate(updateSubmissionSchema),
  assessmentSubmissionController.updateSubmission
);
router.delete(
  "/submissions/:id",
  authorize("student"),
  validate(getSubmissionSchema),
  assessmentSubmissionController.deleteSubmission
);
router.post(
  "/submissions/:id/grade",
  authorize("teacher"),
  validate(gradeSubmissionSchema),
  assessmentSubmissionController.gradeSubmission
);
router.get(
  "/submissions",
  authorize("super_admin", "admin", "teacher", "student"),
  validate(listSubmissionsSchema),
  assessmentSubmissionController.listSubmissions
);
router.get(
  "/submissions/:id",
  authorize("super_admin", "admin", "teacher", "student"),
  validate(getSubmissionSchema),
  assessmentSubmissionController.getSubmission
);
router.get(
  "/submissions/item/:id/attachments/:attachmentId/download",
  authorize("super_admin", "admin", "teacher", "student"),
  assessmentSubmissionController.downloadAttachment
);
router.get(
  "/submissions/student/:studentId/assessment/:assessmentId",
  authorize("super_admin", "admin", "teacher", "student"),
  assessmentSubmissionController.getStudentSubmission
);
router.get(
  "/:assessmentId/submissions",
  authorize("teacher"),
  assessmentSubmissionController.getAssessmentSubmissions
);
router.get(
  "/:assessmentId/submissions/stats",
  authorize("teacher"),
  assessmentSubmissionController.getAssessmentSubmissionStats
);

// ========== Assessment Routes ==========
router.post(
  "/",
  authorize("teacher"),
  validate(createAssessmentSchema),
  assessmentController.createAssessment
);
router.put(
  "/:id",
  authorize("teacher"),
  validate(updateAssessmentSchema),
  assessmentController.updateAssessment
);
router.delete(
  "/:id",
  authorize("teacher"),
  validate(getAssessmentSchema),
  assessmentController.deleteAssessment
);
router.post(
  "/:id/publish",
  authorize("teacher"),
  validate(getAssessmentSchema),
  assessmentController.publishAssessment
);
router.post(
  "/:id/close",
  authorize("teacher"),
  validate(getAssessmentSchema),
  assessmentController.closeAssessment
);
router.post(
  "/:id/mark-graded",
  authorize("teacher"),
  validate(getAssessmentSchema),
  assessmentController.markAsGraded
);
router.get(
  "/",
  authorize("super_admin", "admin", "teacher", "student"),
  validate(listAssessmentsSchema),
  assessmentController.listAssessments
);
router.get(
  "/:id",
  authorize("super_admin", "admin", "teacher", "student"),
  validate(getAssessmentSchema),
  assessmentController.getAssessment
);
router.get(
  "/student/:studentId/course/:courseId",
  authorize("super_admin", "admin", "teacher", "student"),
  assessmentController.getStudentAssessments
);

export default router;
