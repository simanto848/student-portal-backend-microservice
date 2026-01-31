import express from "express";
import ScheduleController from "../controllers/ScheduleController.js";
import { authenticate, authorize } from 'shared';

const router = express.Router();

router.use(authenticate);

// Auto Scheduler
router.post('/generate', authorize('super_admin', 'admin', 'program_controller'), ScheduleController.generateSchedule);
router.post('/validate', authorize('super_admin', 'admin', 'program_controller'), ScheduleController.validateSchedulePrerequisites);
router.post('/check-conflicts', authorize('super_admin', 'admin', 'program_controller'), ScheduleController.checkConflicts);

// Proposals
router.get('/proposals', authorize('super_admin', 'admin', 'program_controller'), ScheduleController.getProposals);
router.get('/proposals/:id', authorize('super_admin', 'admin', 'program_controller'), ScheduleController.getProposalById);
router.post('/proposals/:proposalId/apply', authorize('super_admin', 'admin', 'program_controller'), ScheduleController.applyProposal);
router.delete('/proposals/:proposalId', authorize('super_admin', 'admin', 'program_controller'), ScheduleController.deleteProposal);

// Schedule Management (Close/Reopen)
router.post('/close-batches', authorize('super_admin', 'admin', 'program_controller'), ScheduleController.closeSchedulesForBatches);
router.post('/close-session', authorize('super_admin', 'admin', 'program_controller'), ScheduleController.closeSchedulesForSession);
router.post('/reopen-batches', authorize('super_admin', 'admin', 'program_controller'), ScheduleController.reopenSchedulesForBatches);
router.get('/status-summary', authorize('super_admin', 'admin', 'program_controller'), ScheduleController.getScheduleStatusSummary);
router.get('/active', authorize('super_admin', 'admin', 'program_controller', 'teacher', 'student'), ScheduleController.getActiveSchedules);

export default router;
