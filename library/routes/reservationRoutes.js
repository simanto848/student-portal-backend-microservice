import express from 'express';
import reservationController from '../controllers/reservationController.js';
import { authenticate, authorize } from 'shared';
import { validate } from 'shared';
import {
    createReservationValidation,
    cancelReservationValidation,
    fulfillReservationValidation,
    updateReservationValidation
} from '../validations/reservationValidation.js';

const router = express.Router();

router.use(authenticate);

router.post('/reserve', validate(createReservationValidation), reservationController.createReservation);
router.post('/:id/cancel', validate(cancelReservationValidation), reservationController.cancelReservation);
router.get('/my-reservations', reservationController.getMyReservations);

router.post('/:id/fulfill', authorize('super_admin', 'admin', 'library'), validate(fulfillReservationValidation), reservationController.fulfillReservation);
router.get('/all', authorize('super_admin', 'admin', 'library'), reservationController.getAllReservations);
router.patch('/:id', authorize('super_admin', 'admin', 'library'), validate(updateReservationValidation), reservationController.updateReservationStatus);
router.post('/check-expired', authorize('super_admin', 'admin', 'library'), reservationController.checkExpiredReservations);

export default router;
