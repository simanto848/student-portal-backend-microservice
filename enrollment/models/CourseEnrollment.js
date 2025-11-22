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
            required: [true, "Semester number is required"],
            min: 1,
            max: 12,
        },
        instructorId: {
            type: String,
            index: true,
        },
        enrollmentDate: {
            type: Date,
            default: Date.now,
        },
        status: {
            type: String,
            enum: ['active', 'completed'],
            default: 'active',
        },
        deletedAt: {
            type: Date,
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
courseEnrollmentSchema.index({ studentId: 1, courseId: 1, sessionId: 1 }, { unique: true });
courseEnrollmentSchema.index({ deletedAt: 1 });
courseEnrollmentSchema.index({ status: 1 });
courseEnrollmentSchema.index({ semester: 1 });

// Soft delete middleware
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

