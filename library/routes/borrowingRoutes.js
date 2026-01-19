import express from 'express';
import borrowingController from '../controllers/borrowingController.js';
import { authenticate, authorize } from 'shared';
import { validate } from 'shared';
import { borrowBookValidation, returnBookValidation, updateBorrowingValidation } from '../validations/borrowingValidation.js';

const router = express.Router();

router.use(authenticate);

router.post('/borrow', validate(borrowBookValidation), borrowingController.borrowBook);
router.get('/my-borrowed', borrowingController.getMyBorrowedBooks);
router.get('/my-overdue', borrowingController.getMyOverdueBooks);
router.get('/my-history', borrowingController.getMyBorrowingHistory);
router.get('/all', authorize('super_admin', 'admin', 'library'), borrowingController.getAllBorrowings);

router.get('/:id', authorize('super_admin', 'admin', 'library'), borrowingController.getBorrowingById);
router.post('/:id/return', authorize('super_admin', 'admin', 'library'), validate(returnBookValidation), borrowingController.returnBook);
router.patch('/:id', authorize('super_admin', 'admin', 'library'), validate(updateBorrowingValidation), borrowingController.updateBorrowingStatus);
router.post('/check-overdue', authorize('super_admin', 'admin', 'library'), borrowingController.checkAndUpdateOverdue);

export default router;