import express from 'express';
import adminRoutes from './adminRoutes.js';
import staffRoutes from './staffRoutes.js';
import authRoutes from './authRoutes.js';
import studentRoutes from './studentRoutes.js';
import teacherRoutes from './teacherRoutes.js';
import supportTicketRoutes from './supportTicketRoutes.js';
import systemRoutes from './systemRoutes.js';


const router = express.Router();

router.use('/admins', adminRoutes);
router.use('/staffs', staffRoutes);
router.use('/teachers', teacherRoutes);
router.use('/students', studentRoutes);
router.use('/auth', authRoutes);
router.use('/support-tickets', supportTicketRoutes);
router.use('/system', systemRoutes);


export default router;
