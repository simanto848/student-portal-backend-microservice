import express from 'express';
import studentProfileController from '../controllers/studentProfileController.js';
import { authenticate, authorize } from 'shared';
import { validate } from '../middlewares/validate.js';
import {
    studentProfileCreateValidation,
    studentProfileUpdateValidation,
    addEducationRecordValidation,
} from '../validations/studentProfileValidation.js';

const router = express.Router();

router.use(authenticate);

router.get('/:studentId', authorize('admin', 'staff', 'teacher', 'student'), studentProfileController.getByStudentId);
router.post('/:studentId', authorize('admin', 'staff'), validate(studentProfileCreateValidation), studentProfileController.create);
router.put('/:studentId', authorize('admin', 'staff', 'student'), validate(studentProfileCreateValidation), studentProfileController.upsert);
router.patch('/:studentId', authorize('admin', 'staff', 'student'), validate(studentProfileUpdateValidation), studentProfileController.update);
router.delete('/:studentId', authorize('admin', 'staff'), studentProfileController.delete);
router.post('/:studentId/restore', authorize('admin', 'staff'), studentProfileController.restore);
router.post('/:studentId/education', authorize('admin', 'staff', 'student'), validate(addEducationRecordValidation), studentProfileController.addEducationRecord);
router.patch('/:studentId/education/:index', authorize('admin', 'staff', 'student'), validate(addEducationRecordValidation), studentProfileController.updateEducationRecord);
router.delete('/:studentId/education/:index', authorize('admin', 'staff', 'student'), studentProfileController.removeEducationRecord);

export default router;