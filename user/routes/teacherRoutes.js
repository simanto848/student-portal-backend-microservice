import express from "express";
import teacherController from "../controllers/teacherController.js";
import teacherProfileController from "../controllers/teacherProfileController.js";
import { validate } from "../middlewares/validate.js";
import {
  teacherCreateValidation as createTeacherSchema,
  teacherUpdateValidation as updateTeacherSchema,
} from "../validations/teacherValidation.js";
import {
  teacherProfileCreateValidation as createProfileSchema,
  teacherProfileUpdateValidation as updateProfileSchema,
} from "../validations/teacherProfileValidation.js";
import { authenticate } from "shared";

const router = express.Router();

router.use(authenticate);

router.get("/", teacherController.getAll);
router.get("/:id", teacherController.getById);
router.post("/", validate(createTeacherSchema), teacherController.create);
router.patch("/:id", validate(updateTeacherSchema), teacherController.update);
router.delete("/:id", teacherController.delete);
router.get("/deleted", teacherController.getDeletedTeachers);
router.delete("/:id/permanently", teacherController.deletePermanently);
router.post("/:id/restore", teacherController.restore);

router.post("/:id/registered-ips/add", teacherController.addRegisteredIp);
router.post("/:id/registered-ips/remove", teacherController.removeRegisteredIp);
router.put("/:id/registered-ips", teacherController.updateRegisteredIps);

// Teacher Profile routes
router.get("/:teacherId/profile", teacherProfileController.getByTeacherId);
router.post("/:teacherId/profile", validate(createProfileSchema), teacherProfileController.create);
router.put("/:teacherId/profile", validate(createProfileSchema), teacherProfileController.upsert);
router.patch("/:teacherId/profile", validate(updateProfileSchema), teacherProfileController.update);
router.delete("/:teacherId/profile", teacherProfileController.delete);

export default router;
