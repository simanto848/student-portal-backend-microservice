import express from 'express';
import { validate } from '../validations/index.js';
import {
    createBatchSchema,
    updateBatchSchema,
    getBatchByIdSchema,
    deleteBatchSchema,
    getBatchesSchema,
    assignCounselorSchema,
    updateSemesterSchema,
} from '../validations/index.js';
import batchController from '../controllers/batchController.js';

const router = express.Router();

router.get('/', validate(getBatchesSchema), batchController.getAll);
router.get('/:id', validate(getBatchByIdSchema), batchController.getById);
router.post('/', validate(createBatchSchema), batchController.create);
router.patch('/:id', validate(updateBatchSchema), batchController.update);
router.delete('/:id', validate(deleteBatchSchema), batchController.delete);

router.post('/:id/assign-counselor', validate(assignCounselorSchema), batchController.assignCounselor);
router.patch('/:id/semester', validate(updateSemesterSchema), batchController.updateSemester);

export default router;

