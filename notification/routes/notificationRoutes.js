import { Router } from 'express';
import notificationController from '../controllers/notificationController.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validateNotificationCreate, validateNotificationUpdate } from '../validations/notificationValidation.js';

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
    'hostel_warden',
    'hostel_supervisor',
    'maintenance',
    'teacher'
];

router.use(authenticate);

router.post('/', authorize(...managerRoles), validateNotificationCreate, (req, res) => notificationController.create(req, res));
router.get('/', (req, res) => notificationController.list(req, res));
router.get('/:id', (req, res) => notificationController.get(req, res));
router.put('/:id', authorize(...managerRoles), validateNotificationUpdate, (req, res) => notificationController.update(req, res));
router.delete('/:id', authorize(...managerRoles), (req, res) => notificationController.delete(req, res));
router.post('/:id/schedule', authorize(...managerRoles), (req, res) => notificationController.schedule(req, res));
router.post('/:id/cancel', authorize(...managerRoles), (req, res) => notificationController.cancel(req, res));
router.post('/:id/publish', authorize(...managerRoles), (req, res) => notificationController.publish(req, res));
router.post('/:id/read', (req, res) => notificationController.markRead(req, res));
router.post('/:id/ack', (req, res) => notificationController.acknowledge(req, res));
router.post('/:id/react', (req, res) => notificationController.react(req, res));
router.get('/:id/receipts', authorize(...managerRoles), (req, res) => notificationController.receipts(req, res));

export default router;
