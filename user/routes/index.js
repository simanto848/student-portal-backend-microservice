import express from 'express';
import adminRoutes from './adminRoutes.js';
import staffRoutes from './staffRoutes.js';

const router = express.Router();

router.use('/admins', adminRoutes);
router.use('/staffs', staffRoutes);

export default router;

