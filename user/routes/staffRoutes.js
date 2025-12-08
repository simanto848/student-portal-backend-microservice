import express from "express";
import staffController from "../controllers/staffController.js";
import { validate } from "../middlewares/validate.js";
import {
  createStaffSchema,
  updateStaffSchema,
  updateStaffRoleSchema,
} from "../validations/staffValidation.js";
import { authenticate } from "shared";
import upload from "../middlewares/uploadMiddleware.js";
import { transformBody } from "../middlewares/transformBody.js";
import staffProfileController from "../controllers/staffProfileController.js";
import {
  staffProfileCreateValidation as createProfileSchema,
  staffProfileUpdateValidation as updateProfileSchema,
} from "../validations/staffProfileValidation.js";

const router = express.Router();

router.get("/", staffController.getAll);
router.get("/statistics", staffController.getStatistics);
router.get("/department/:departmentId", staffController.getByDepartment);
router.get("/:id", staffController.getById);
router.post("/", upload.single('profilePicture'), transformBody, validate(createStaffSchema), staffController.create);
router.patch("/:id", upload.single('profilePicture'), transformBody, validate(updateStaffSchema), staffController.update);
router.patch(
  "/:id/role",
  validate(updateStaffRoleSchema),
  staffController.updateRole
);
router.post("/:id/registered-ips/add", staffController.addRegisteredIp);
router.post("/:id/registered-ips/remove", staffController.removeRegisteredIp);
router.put("/:id/registered-ips", staffController.updateRegisteredIps);
router.delete("/:id", staffController.delete);
router.get("/deleted", staffController.getDeletedStaffs);
router.delete("/:id/permanently", staffController.deletePermanently);
router.post("/:id/restore", staffController.restore);



// Staff Profile routes
router.get("/:id/profile", staffProfileController.getByStaffId);
router.post("/:id/profile", validate(createProfileSchema), staffProfileController.create);
router.put("/:id/profile", validate(createProfileSchema), staffProfileController.upsert);
router.patch("/:id/profile", validate(updateProfileSchema), staffProfileController.update);
router.delete("/:id/profile", staffProfileController.delete);

export default router;
