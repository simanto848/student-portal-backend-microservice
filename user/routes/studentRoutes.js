import express from "express";
import studentController from "../controllers/studentController.js";
import { validate } from "../middlewares/validate.js";
import {
  studentCreateValidation as createStudentSchema,
  studentUpdateValidation as updateStudentSchema,
} from "../validations/studentValidation.js";
import studentProfileRoutes from "./studentProfileRoutes.js";
import { authenticate } from "shared";
import upload from "../middlewares/uploadMiddleware.js";
import { transformBody } from "../middlewares/transformBody.js";

const router = express.Router();

router.use("/profiles", studentProfileRoutes);

router.use(authenticate);

router.get("/", studentController.getAll);
router.get("/deleted", studentController.getDeletedStudents);
router.get("/:id", studentController.getById);
router.post("/", upload.single('profilePicture'), transformBody, validate(createStudentSchema), studentController.create);
router.patch("/:id", upload.single('profilePicture'), transformBody, validate(updateStudentSchema), studentController.update);
router.delete("/:id", studentController.delete);
router.post("/:id/restore", studentController.restore);
router.delete("/:id/permanently", studentController.deletePermanently);

export default router;
