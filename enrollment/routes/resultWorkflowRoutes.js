import express from 'express';
import resultWorkflowController from '../controllers/resultWorkflowController.js';
import { authenticate, authorize } from 'shared';

const router = express.Router();

router.use(authenticate);

// Get workflow status
router.get('/', resultWorkflowController.getWorkflow);

// Get approved workflows summary for bulk publishing
router.get('/approved-summary', authorize("teacher", "admin", "exam_controller"), resultWorkflowController.getApprovedSummary);

// Teacher submits to committee
router.post('/submit', authorize("teacher"), resultWorkflowController.submitToCommittee);

// Committee approves
router.post('/:id/approve', authorize("teacher", "admin", "exam_controller"), resultWorkflowController.approveByCommittee);

// Committee returns to teacher
router.post('/:id/return-to-teacher', authorize("teacher", "admin", "exam_controller"), resultWorkflowController.returnToTeacher);

// Exam Controller publishes result (single)
router.post('/:id/publish', authorize("teacher", "exam_controller"), resultWorkflowController.publishResult);

// Bulk publish all approved results for a batch and semester
router.post('/bulk-publish', authorize("teacher", "exam_controller"), resultWorkflowController.bulkPublishResults);

// Teacher/Committee requests return after publish
router.post('/:id/request-return', authorize("teacher", "exam_controller"), resultWorkflowController.requestReturn);

// Exam Controller approves return request
router.post('/:id/approve-return', authorize("exam_controller"), resultWorkflowController.approveReturnRequest);

export default router;
