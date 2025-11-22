import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { config } from 'dotenv';
import Admin from '../models/Admin.js';
import Staff from '../models/Staff.js';
import Student from '../models/Student.js';
import Teacher from '../models/Teacher.js';

config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

const seedTestUsers = async () => {
    try {
        await connectDB();

        // Check if admin exists
        const adminExists = await Admin.findOne({ email: 'admin@test.com' });
        if (!adminExists) {
            const admin = await Admin.create({
                email: 'admin@test.com',
                password: 'Test@1234',
                fullName: 'Test Admin',
                registrationNumber: 'ADMIN001',
                role: 'admin',
                registeredIpAddress: ['127.0.0.1', '::1', '::ffff:127.0.0.1']
            });
            console.log('✓ Admin created:', admin.email);
        } else {
            console.log('○ Admin already exists:', adminExists.email);
        }

        // Check if teacher exists
        const teacherExists = await Teacher.findOne({ email: 'teacher@test.com' });
        if (!teacherExists) {
            const teacher = await Teacher.create({
                email: 'teacher@test.com',
                password: 'Test@1234',
                fullName: 'Test Teacher',
                registrationNumber: 'TEACH001',
                departmentId: 'temp-dept-id', // Will need to update with actual dept
                joiningDate: new Date(),
                registeredIpAddress: ['127.0.0.1', '::1', '::ffff:127.0.0.1']
            });
            console.log('✓ Teacher created:', teacher.email);
        } else {
            console.log('○ Teacher already exists:', teacherExists.email);
        }

        // Check if student exists
        const studentExists = await Student.findOne({ email: 'student@test.com' });
        if (!studentExists) {
            const student = await Student.create({
                email: 'student@test.com',
                password: 'Test@1234',
                fullName: 'Test Student',
                registrationNumber: 'STU001',
                batchId: 'temp-batch-id', // Will need to update with actual batch
                admissionDate: new Date()
            });
            console.log('✓ Student created:', student.email);
        } else {
            console.log('○ Student already exists:', studentExists.email);
        }

        console.log('\n=== Test Users Created ===');
        console.log('Admin: admin@test.com / Test@1234');
        console.log('Teacher: teacher@test.com / Test@1234');
        console.log('Student: student@test.com / Test@1234');

        process.exit(0);
    } catch (error) {
        console.error('Error seeding users:', error);
        process.exit(1);
    }
};

seedTestUsers();
