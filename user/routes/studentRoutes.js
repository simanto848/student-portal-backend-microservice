import express from 'express';
import studentController from '../controllers/studentController.js';
import { validate } from '../middlewares/validate.js';
import { studentCreateValidation as createStudentSchema, studentUpdateValidation as updateStudentSchema } from '../validations/studentValidation.js';
import studentProfileRoutes from './studentProfileRoutes.js';

const router = express.Router();

router.use('/profiles', studentProfileRoutes);

router.get('/', studentController.getAll);
router.get('/:id', studentController.getById);
router.post('/', validate(createStudentSchema), studentController.create);
router.patch('/:id', validate(updateStudentSchema), studentController.update);
router.delete('/:id', studentController.delete);
router.post('/:id/restore', studentController.restore);

export default router;

