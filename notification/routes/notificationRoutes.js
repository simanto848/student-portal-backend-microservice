import { Router } from 'express';
import notificationController from '../controllers/notificationController.js';
import { authenticate, authorize } from 'shared';
import { authenticateWithProfile } from '../middlewares/authWithProfile.js';
import { validateNotificationCreate, validateNotificationUpdate } from '../validations/notificationValidation.js';
import { notificationWriteLimiter, notificationReadLimiter } from '../middlewares/rateLimit.js';

const router = Router();

const managerRoles = [
    'super_admin',
    'admin',
    'moderator',
    'program_controller',
    'admission',
    'exam',
    'finance',
    'library',
    'transport',
    'hr',
    'it',
    'hostel',
    'teacher'
];

router.use(authenticate);

router.get('/my-scope', notificationReadLimiter, authenticateWithProfile, (req, res) => notificationController.getMyScope(req, res));
router.get('/sent', notificationReadLimiter, authorize(...managerRoles), (req, res) => notificationController.getSent(req, res));

router.post('/', notificationWriteLimiter, authenticateWithProfile, authorize(...managerRoles), validateNotificationCreate, (req, res) => notificationController.create(req, res));
router.get('/', notificationReadLimiter, (req, res) => notificationController.list(req, res));
router.get('/:id', notificationReadLimiter, (req, res) => notificationController.get(req, res));
router.put('/:id', notificationWriteLimiter, authorize(...managerRoles), validateNotificationUpdate, (req, res) => notificationController.update(req, res));
router.delete('/:id', notificationWriteLimiter, authorize(...managerRoles), (req, res) => notificationController.delete(req, res));
router.post('/:id/schedule', notificationWriteLimiter, authorize(...managerRoles), (req, res) => notificationController.schedule(req, res));
router.post('/:id/cancel', notificationWriteLimiter, authorize(...managerRoles), (req, res) => notificationController.cancel(req, res));
router.post('/:id/publish', notificationWriteLimiter, authorize(...managerRoles), (req, res) => notificationController.publish(req, res));
router.post('/:id/read', notificationReadLimiter, (req, res) => notificationController.markRead(req, res));
router.post('/mark-all-read', notificationWriteLimiter, (req, res) => notificationController.markAllRead(req, res));
router.post('/:id/ack', notificationWriteLimiter, (req, res) => notificationController.acknowledge(req, res));
router.post('/:id/react', notificationWriteLimiter, (req, res) => notificationController.react(req, res));
router.get('/:id/receipts', notificationReadLimiter, authorize(...managerRoles), (req, res) => notificationController.receipts(req, res));

export default router;
