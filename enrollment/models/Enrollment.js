import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const enrollmentSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            default: uuidv4,
        },
        studentId: {
            type: String,
            required: true,
            ref: "Student",
        },
        sessionCourseId: {
            type: String,
            required: true,
            ref: "SessionCourse",
        },
        sessionId: {
            type: String,
            required: true,
            ref: "Session",
        },
        courseId: {
            type: String,
            required: true,
            ref: "Course",
        },
        semester: {
            type: Number,
            required: true,
            min: 1,
        },
        departmentId: {
            type: String,
            required: true,
            ref: "Department",
        },
        enrollmentStatus: {
            type: String,
            enum: ['enrolled', 'completed', 'dropped', 'failed', 'in_progress'],
            default: 'enrolled',
        },
        grade: {
            type: String,
            enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F', null],
            default: null,
        },
        gradePoint: {
            type: Number,
            min: 0,
            max: 4,
            default: null,
        },
        obtainedMarks: {
            type: Number,
            min: 0,
            default: null,
        },
        totalMarks: {
            type: Number,
            min: 0,
            default: null,
        },
        enrolledAt: {
            type: Date,
            default: Date.now,
        },
        completedAt: {
            type: Date,
            default: null,
        },
        deletedAt: {
            type: Date,
            default: null,
        }
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
enrollmentSchema.index({ deletedAt: 1 });
enrollmentSchema.index({ studentId: 1 });
enrollmentSchema.index({ sessionCourseId: 1 });
enrollmentSchema.index({ sessionId: 1 });
enrollmentSchema.index({ courseId: 1 });
enrollmentSchema.index({ semester: 1 });
enrollmentSchema.index({ departmentId: 1 });
enrollmentSchema.index({ enrollmentStatus: 1 });

// Unique constraint: student can't enroll in same session course twice
enrollmentSchema.index(
    { studentId: 1, sessionCourseId: 1 },
    { unique: true, name: 'unique_student_session_course' }
);

// Soft delete middleware
enrollmentSchema.pre(/^find/, function (next) {
    this.where({ deletedAt: null });
    next();
});

enrollmentSchema.methods.softDelete = function () {
    this.deletedAt = new Date();
    return this.save();
};

enrollmentSchema.methods.restore = function () {
    this.deletedAt = null;
    return this.save();
};

const Enrollment = mongoose.model("Enrollment", enrollmentSchema);

export default Enrollment;
