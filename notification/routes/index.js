import { Router } from 'express';
import notificationRoutes from './notificationRoutes.js';

const router = Router();

router.use('/notifications', notificationRoutes);

export default router;
