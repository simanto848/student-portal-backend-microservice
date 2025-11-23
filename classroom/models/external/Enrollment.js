import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const batchCourseInstructorSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: uuidv4
    },
    batchId: {
        type: String,
        required: true
    },
    courseId: {
        type: String,
        required: true
    },
    sessionId: {
        type: String,
        required: true

    },
    semester: {
        type: Number,
        required: true

    },
    instructorId: {
        type: String,
        required: true

    },
    status: {
        type: String,
        default: 'active'

    },
    deletedAt: {
        type: Date

    }
});
batchCourseInstructorSchema.pre(/^find/, function () {
    this.where({ deletedAt: null });
});

export const BatchCourseInstructor = mongoose.models.BatchCourseInstructor || mongoose.model('BatchCourseInstructor', batchCourseInstructorSchema);

const courseEnrollmentSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: uuidv4
        
    },
    studentId: {
        type: String,
        required: true
        
    },
    batchId: {
        type: String,
        required: true
        
    },
    courseId: {
        type: String,
        required: true
        
    },
    sessionId: {
        type: String,
        required: true
        
    },
    semester: {
        type: Number,
        required: true
        
    },
    status: {
        type: String,
        default: 'active'
        
    },
    deletedAt: {
        type: Date
        
    }
});
courseEnrollmentSchema.pre(/^find/, function () {
    this.where({ deletedAt: null });
});

export const CourseEnrollment = mongoose.models.CourseEnrollment || mongoose.model('CourseEnrollment', courseEnrollmentSchema);
