import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const attendanceSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            default: uuidv4,
        },
        enrollmentId: {
            type: String,
            ref: 'CourseEnrollment',
            required: [true, "Enrollment ID is required"],
            index: true,
        },
        studentId: {
            type: String,
            required: [true, "Student ID is required"],
            index: true,
        },
        courseId: {
            type: String,
            required: [true, "Course ID is required"],
            index: true,
        },
        batchId: {
            type: String,
            required: [true, "Batch ID is required"],
            index: true,
        },
        instructorId: {
            type: String,
            required: [true, "Instructor ID is required"],
            index: true,
        },
        date: {
            type: Date,
            required: [true, "Date is required"],
        },
        status: {
            type: String,
            enum: ['present', 'absent', 'late', 'excused'],
            required: [true, "Attendance status is required"],
        },
        remarks: {
            type: String,
            maxlength: 500,
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
attendanceSchema.index({ deletedAt: 1 });
attendanceSchema.index({ studentId: 1, date: 1 });
attendanceSchema.index({ courseId: 1, date: 1 });
attendanceSchema.index({ batchId: 1, date: 1 });

// Unique constraint: One attendance record per student-course-date
attendanceSchema.index(
    { studentId: 1, courseId: 1, date: 1, deletedAt: 1 },
    { unique: true, name: 'unique_student_course_date_attendance' }
);

// Validation: Prevent future date attendance
attendanceSchema.pre('save', function(next) {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    if (this.date > today) {
        const error = new Error('Cannot mark attendance for future dates');
        error.statusCode = 400;
        return next(error);
    }
    next();
});

// Soft delete pre-hook
attendanceSchema.pre(/^find/, function (next) {
    this.where({ deletedAt: null });
    next();
});

// Soft delete method
attendanceSchema.methods.softDelete = function () {
    this.deletedAt = new Date();
    return this.save();
};

// Restore method
attendanceSchema.methods.restore = function () {
    this.deletedAt = null;
    return this.save();
};

const Attendance = mongoose.model("Attendance", attendanceSchema);

export default Attendance;
