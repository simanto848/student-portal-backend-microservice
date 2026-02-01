import express from "express";
import systemController from "../controllers/SystemController.js";
import { authenticate, authorize } from "shared";

const router = express.Router();

router.use(authenticate, authorize("super_admin"));

router.get("/health", systemController.getHealth);
router.get("/database", systemController.getDatabaseStats);
router.get("/logs", systemController.getLogs);
router.get("/alerts", systemController.getAlerts);
router.get("/api-stats", systemController.getApiStats);


export default router;
