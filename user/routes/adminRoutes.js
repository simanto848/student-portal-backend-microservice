import express from "express";
import adminController from "../controllers/adminController.js";
import { validate } from "../middlewares/validate.js";
import {
  createAdminSchema,
  updateAdminSchema,
  updateAdminRoleSchema,
} from "../validations/adminValidation.js";
import { authenticate } from "shared";

const router = express.Router();

router.get("/", adminController.getAll);
router.get("/statistics", adminController.getStatistics);
router.get("/:id", adminController.getById);
router.post("/", validate(createAdminSchema), adminController.create);
router.patch("/:id", validate(updateAdminSchema), adminController.update);
router.patch(
  "/:id/role",
  validate(updateAdminRoleSchema),
  adminController.updateRole
);
router.post("/:id/registered-ips/add", adminController.addRegisteredIp);
router.post("/:id/registered-ips/remove", adminController.removeRegisteredIp);
router.put("/:id/registered-ips", adminController.updateRegisteredIps);
router.delete("/:id", adminController.delete);
router.get("/deleted", adminController.getDeletedAdmins);
router.delete("/:id/permanently", adminController.deletePermanently);
router.post("/:id/restore", adminController.restore);

export default router;
