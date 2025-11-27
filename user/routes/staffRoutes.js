import express from "express";
import staffController from "../controllers/staffController.js";
import { validate } from "../middlewares/validate.js";
import {
  createStaffSchema,
  updateStaffSchema,
  updateStaffRoleSchema,
} from "../validations/staffValidation.js";
import { authenticate } from "shared";

const router = express.Router();

router.get("/", staffController.getAll);
router.get("/statistics", staffController.getStatistics);
router.get("/department/:departmentId", staffController.getByDepartment);
router.get("/:id", staffController.getById);
router.post("/", validate(createStaffSchema), staffController.create);
router.patch("/:id", validate(updateStaffSchema), staffController.update);
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

export default router;
