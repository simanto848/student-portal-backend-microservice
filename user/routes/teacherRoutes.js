import express from "express";
import teacherController from "../controllers/teacherController.js";
import { validate } from "../middlewares/validate.js";
import {
  teacherCreateValidation as createTeacherSchema,
  teacherUpdateValidation as updateTeacherSchema,
} from "../validations/teacherValidation.js";
import { authenticate } from "shared";

const router = express.Router();

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

export default router;
