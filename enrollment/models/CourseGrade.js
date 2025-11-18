import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const courseGradeSchema = new mongoose.Schema(
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
        enrollmentId: {
            type: String,
            ref: 'CourseEnrollment',
            required: [true, "Enrollment ID is required"],
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
        semester: {
            type: Number,
            required: [true, "Semester is required"],
            min: 1,
        },
        totalMarksObtained: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalMarks: {
            type: Number,
            required: [true, "Total marks is required"],
            min: 0,
        },
        percentage: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
        },
        letterGrade: {
            type: String,
        },
        gradePoint: {
            type: Number,
            min: 0,
            max: 4,
        },
        remarks: {
            type: String,
            maxlength: 500,
        },
        isPublished: {
            type: Boolean,
            default: false,
        },
        publishedAt: {
            type: Date,
        },
        calculatedBy: {
            type: String,
        },
        calculatedAt: {
            type: Date,
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
courseGradeSchema.index({ deletedAt: 1 });
courseGradeSchema.index({ studentId: 1, semester: 1 });
courseGradeSchema.index({ courseId: 1, semester: 1 });
courseGradeSchema.index({ batchId: 1, semester: 1 });
courseGradeSchema.index({ isPublished: 1 });

// Unique constraint: One grade per student per course per semester
courseGradeSchema.index(
    { studentId: 1, courseId: 1, semester: 1, deletedAt: 1 },
    { unique: true, name: 'unique_student_course_semester_grade' }
);

// Method to calculate grade based on percentage
courseGradeSchema.methods.calculateGrade = function() {
    this.percentage = (this.totalMarksObtained / this.totalMarks) * 100;
    
    // Grade calculation logic (4.0 scale)
    if (this.percentage >= 90) {
        this.letterGrade = 'A+';
        this.gradePoint = 4.0;
    } else if (this.percentage >= 85) {
        this.letterGrade = 'A';
        this.gradePoint = 3.75;
    } else if (this.percentage >= 80) {
        this.letterGrade = 'A-';
        this.gradePoint = 3.5;
    } else if (this.percentage >= 75) {
        this.letterGrade = 'B+';
        this.gradePoint = 3.25;
    } else if (this.percentage >= 70) {
        this.letterGrade = 'B';
        this.gradePoint = 3.0;
    } else if (this.percentage >= 65) {
        this.letterGrade = 'B-';
        this.gradePoint = 2.75;
    } else if (this.percentage >= 60) {
        this.letterGrade = 'C+';
        this.gradePoint = 2.5;
    } else if (this.percentage >= 55) {
        this.letterGrade = 'C';
        this.gradePoint = 2.25;
    } else if (this.percentage >= 50) {
        this.letterGrade = 'C-';
        this.gradePoint = 2.0;
    } else if (this.percentage >= 45) {
        this.letterGrade = 'D';
        this.gradePoint = 1.0;
    } else {
        this.letterGrade = 'F';
        this.gradePoint = 0.0;
    }
};

// Soft delete pre-hook
courseGradeSchema.pre(/^find/, function (next) {
    this.where({ deletedAt: null });
    next();
});

// Soft delete method
courseGradeSchema.methods.softDelete = function () {
    this.deletedAt = new Date();
    return this.save();
};

// Restore method
courseGradeSchema.methods.restore = function () {
    this.deletedAt = null;
    return this.save();
};

const CourseGrade = mongoose.model("CourseGrade", courseGradeSchema);

export default CourseGrade;
