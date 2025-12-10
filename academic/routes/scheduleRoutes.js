import express from "express";
import ScheduleController from "../controllers/ScheduleController.js";
import { authenticate, authorize } from 'shared';

const router = express.Router();

router.use(authenticate);

router.post('/generate', authorize('super_admin', 'admin', 'program_controller'), ScheduleController.generateSchedule);
router.get('/proposals', authorize('super_admin', 'admin', 'program_controller'), ScheduleController.getProposals);
router.get('/proposals/:id', authorize('super_admin', 'admin', 'program_controller'), ScheduleController.getProposalById);
router.post('/proposals/:proposalId/apply', authorize('super_admin', 'admin', 'program_controller'), ScheduleController.applyProposal);

export default router;
