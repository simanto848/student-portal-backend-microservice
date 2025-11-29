import express from "express";
import adminController from "../controllers/adminController.js";
import adminProfileController from "../controllers/adminProfileController.js";
import { validate } from "../middlewares/validate.js";
import {
  createAdminSchema,
  updateAdminSchema,
  updateAdminRoleSchema,
} from "../validations/adminValidation.js";
import {
  adminProfileCreateValidation,
  adminProfileUpdateValidation,
} from "../validations/adminProfileValidation.js";
import { authenticate } from "shared";

const router = express.Router();

router.use(authenticate);

router.get("/", adminController.getAll);
router.get("/statistics", adminController.getStatistics);
router.get("/deleted", adminController.getDeletedAdmins);
router.get("/:id", adminController.getById);
router.post("/", validate(createAdminSchema), adminController.create);
router.patch("/:id", validate(updateAdminSchema), adminController.update);
router.patch("/:id/role", validate(updateAdminRoleSchema), adminController.updateRole);

router.get("/:adminId/profile", adminProfileController.getByAdminId);
router.post("/:adminId/profile", validate(adminProfileCreateValidation), adminProfileController.create);
router.put("/:adminId/profile", validate(adminProfileCreateValidation), adminProfileController.upsert);
router.patch("/:adminId/profile", validate(adminProfileUpdateValidation), adminProfileController.update);
router.delete("/:adminId/profile", adminProfileController.delete);

router.post("/:id/registered-ips/add", adminController.addRegisteredIp);
router.post("/:id/registered-ips/remove", adminController.removeRegisteredIp);
router.put("/:id/registered-ips", adminController.updateRegisteredIps);
router.delete("/:id", adminController.delete);
router.delete("/:id/permanently", adminController.deletePermanently);
router.post("/:id/restore", adminController.restore);

export default router;
