import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const courseEnrollmentSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            default: uuidv4,
        },
        studentId: {
            type: String,
            required: [true, "Student ID is required"],
            index: true,
        },
        batchId: {
            type: String,
            required: [true, "Batch ID is required"],
            index: true,
        },
        courseId: {
            type: String,
            required: [true, "Course ID is required"],
            index: true,
        },
        sessionId: {
            type: String,
            required: [true, "Session ID is required"],
            index: true,
        },
        semester: {
            type: Number,
            required: [true, "Semester is required"],
            min: 1,
        },
        instructorId: {
            type: String,
            required: [true, "Instructor ID is required"],
        },
        enrollmentDate: {
            type: Date,
            default: Date.now,
        },
        // In closed credit system, all students in batch progress together
        // Status is primarily for tracking, not for individual progression
        status: {
            type: String,
            enum: ['active', 'completed'],
            default: 'active',
        },
        deletedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
        toJSON: {
            transform(doc, ret) {
                ret.id = ret._id;
                delete ret._id;
                delete ret.__v;
            },
        },
    }
);

// Indexes
courseEnrollmentSchema.index({ deletedAt: 1 });
courseEnrollmentSchema.index({ studentId: 1, semester: 1 });
courseEnrollmentSchema.index({ batchId: 1, semester: 1 });
courseEnrollmentSchema.index({ courseId: 1, semester: 1 });

// Unique constraint: One enrollment per student-course-semester
courseEnrollmentSchema.index(
    { studentId: 1, courseId: 1, semester: 1, deletedAt: 1 },
    { unique: true, name: 'unique_student_course_semester_enrollment' }
);

// Soft delete pre-hook
courseEnrollmentSchema.pre(/^find/, function (next) {
    this.where({ deletedAt: null });
    next();
});

// Soft delete method
courseEnrollmentSchema.methods.softDelete = function () {
    this.deletedAt = new Date();
    return this.save();
};

// Restore method
courseEnrollmentSchema.methods.restore = function () {
    this.deletedAt = null;
    return this.save();
};

const CourseEnrollment = mongoose.model("CourseEnrollment", courseEnrollmentSchema);

export default CourseEnrollment;
