import express from 'express';
import { validate } from '../validations/index.js';
import {
    createProgramSchema,
    updateProgramSchema,
    getProgramByIdSchema,
    deleteProgramSchema,
    getProgramsSchema,
} from '../validations/index.js';
import programController from '../controllers/programController.js';
import { authenticate, authorize } from 'shared';

const router = express.Router();

router.get('/', validate(getProgramsSchema), programController.getAll);
router.get('/:id', validate(getProgramByIdSchema), programController.getById);

router.use(authenticate);
router.use(authorize(['super_admin', 'admin']));

router.post('/', validate(createProgramSchema), programController.create);
router.patch('/:id', validate(updateProgramSchema), programController.update);
router.delete('/:id', validate(deleteProgramSchema), programController.delete);
router.get('/:id/batches', validate(getProgramByIdSchema), programController.getBatchesByProgram);

export default router;

