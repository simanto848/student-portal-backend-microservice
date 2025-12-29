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
import upload from "../middlewares/uploadMiddleware.js";
import { transformBody } from "../middlewares/transformBody.js";
import { requireSuperAdmin, requireAdmin, canManageAdmin } from "../middlewares/roleMiddleware.js";

const router = express.Router();

router.use(authenticate);

// Standard admin routes
router.get("/", adminController.getAll);
router.get("/statistics", adminController.getStatistics);
router.get("/deleted", adminController.getDeletedAdmins);
router.get("/:id", adminController.getById);
router.post("/", upload.single('profilePicture'), transformBody, validate(createAdminSchema), adminController.create);
router.patch("/:id", upload.single('profilePicture'), transformBody, validate(updateAdminSchema), adminController.update);
router.patch("/:id/role", canManageAdmin, upload.single('profilePicture'), transformBody, validate(updateAdminRoleSchema), adminController.updateRole);

// Profile routes
router.get("/:adminId/profile", adminProfileController.getByAdminId);
router.post("/:adminId/profile", validate(adminProfileCreateValidation), adminProfileController.create);
router.put("/:adminId/profile", validate(adminProfileCreateValidation), adminProfileController.upsert);
router.patch("/:adminId/profile", validate(adminProfileUpdateValidation), adminProfileController.update);
router.delete("/:adminId/profile", adminProfileController.delete);

// IP management routes
router.post("/:id/registered-ips/add", adminController.addRegisteredIp);
router.post("/:id/registered-ips/remove", adminController.removeRegisteredIp);
router.put("/:id/registered-ips", adminController.updateRegisteredIps);

// Delete routes
router.delete("/:id", adminController.delete);
router.delete("/:id/permanently", requireSuperAdmin, adminController.deletePermanently);
router.post("/:id/restore", adminController.restore);

// Super Admin only routes - User Management
router.get("/users/all", requireSuperAdmin, adminController.getAllUsers);
router.get("/users/:id/details", requireSuperAdmin, adminController.getUserDetails);
router.post("/users/block", requireSuperAdmin, adminController.blockUser);
router.post("/users/unblock", requireSuperAdmin, adminController.unblockUser);

export default router;
