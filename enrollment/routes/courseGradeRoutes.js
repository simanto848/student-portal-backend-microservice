import express from "express";
import courseGradeController from "../controllers/courseGradeController.js";

import { authenticate, authorize } from "shared";
import { validate } from "shared";
import {
    createCourseGradeSchema,
    updateCourseGradeSchema,
    publishGradeSchema,
    getCourseGradeSchema,
    listCourseGradesSchema,
} from "../validations/courseGradeValidation.js";
import {
    submitToCommitteeSchema,
    approveByCommitteeSchema,
    returnToTeacherSchema,
    requestReturnSchema,
} from "../validations/resultWorkflowValidation.js";

const router = express.Router();

router.use(authenticate);

router.get("/", authorize("super_admin", "admin", "teacher", "student"), courseGradeController.listGrades);

router.post("/", authorize("teacher"), validate(createCourseGradeSchema), courseGradeController.calculateGrade);
router.post("/auto-calculate/:enrollmentId", authorize("teacher"), courseGradeController.autoCalculateGrade);
router.get("/mark-config/:courseId", authorize("teacher"), courseGradeController.getMarkEntryConfig);
router.post("/bulk-entry", authorize("teacher"), courseGradeController.bulkSaveMarks);

// Workflow Routes
router.get("/stats/course", authorize("teacher"), courseGradeController.getCourseGradeStats);
router.get("/student/:studentId/semester/:semester", authorize("super_admin", "admin", "teacher", "student"), courseGradeController.getStudentSemesterGrades);
router.get("/student/:studentId/semester/:semester/gpa", authorize("super_admin", "admin", "teacher", "student"), courseGradeController.calculateSemesterGPA);
router.get("/student/:studentId/cgpa", authorize("super_admin", "admin", "teacher", "student"), courseGradeController.calculateCGPA);

router.get("/:id", authorize("super_admin", "admin", "teacher", "student"), validate(getCourseGradeSchema), courseGradeController.getGrade);
router.put("/:id", authorize("teacher"), validate(updateCourseGradeSchema), courseGradeController.updateGrade);
router.post("/:id/publish", authorize("teacher"), validate(publishGradeSchema), courseGradeController.publishGrade);
router.post("/:id/unpublish", authorize("teacher"), validate(publishGradeSchema), courseGradeController.unpublishGrade);
router.delete("/:id", authorize("teacher"), validate(getCourseGradeSchema), courseGradeController.deleteGrade);

export default router;
