import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const courseGradeSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            default: uuidv4,
        },
        enrollmentId: {
            type: String,
            required: false,
            ref: "CourseEnrollment",
            sparse: true,
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
        semester: {
            type: Number,
            required: [true, "Semester is required"],
            min: 1,
        },
        assessmentScores: [
            {
                assessmentId: {
                    type: String,
                    ref: "Assessment",
                },
                submissionId: {
                    type: String,
                    ref: "AssessmentSubmission",
                },
                marksObtained: Number,
                totalMarks: Number,
                weightage: Number,
                weightedScore: Number,
            },
        ],
        attendancePercentage: {
            type: Number,
            min: 0,
            max: 100,
            default: 0,
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
            min: 0,
            max: 100,
            default: 0,
        },
        gradePoint: {
            type: Number,
            min: 0,
            max: 4,
            default: null,
        },
        letterGrade: {
            type: String,
            enum: [
                "A+",
                "A",
                "A-",
                "B+",
                "B",
                "B-",
                "C+",
                "C",
                "C-",
                "D+",
                "D",
                "F",
                null,
            ],
            default: null,
        },
        courseType: {
            type: String,
            enum: ["theory", "lab", "combined"],
            default: "theory",
        },
        theoryMarks: {
            finalExam: {
                type: Number,
                min: 0,
                max: 50,
                default: 0,
            },
            finalExamQuestions: {
                q1: { type: Number, min: 0, max: 12.5, default: 0 },
                q2: { type: Number, min: 0, max: 12.5, default: 0 },
                q3: { type: Number, min: 0, max: 12.5, default: 0 },
                q4: { type: Number, min: 0, max: 12.5, default: 0 },
                q5: { type: Number, min: 0, max: 12.5, default: 0 },
                q6: { type: Number, min: 0, max: 12.5, default: 0 },
            },
            midterm: {
                type: Number,
                min: 0,
                max: 20,
                default: 0,
            },
            attendance: {
                type: Number,
                min: 0,
                max: 10,
                default: 0,
            },
            classTest: {
                type: Number,
                min: 0,
                max: 10,
                default: 0,
            },
            assignment: {
                type: Number,
                min: 0,
                max: 10,
                default: 0,
            },
            continuousAssessment: {
                type: Number,
                min: 0,
                max: 20,
                default: 0,
            },
            totalObtained: {
                type: Number,
                default: 0,
            },
            totalPossible: {
                type: Number,
                default: 100,
            },
        },
        labMarks: {
            labReports: {
                type: Number,
                min: 0,
                max: 10,
                default: 0,
            },
            attendance: {
                type: Number,
                min: 0,
                max: 10,
                default: 0,
            },
            finalLab: {
                type: Number,
                min: 0,
                max: 30,
                default: 0,
            },
            totalObtained: {
                type: Number,
                default: 0,
            },
            totalPossible: {
                type: Number,
                default: 50,
            },
        },
        theoryWeightage: {
            type: Number,
            default: 100,
        },
        labWeightage: {
            type: Number,
            default: 0,
        },
        remarks: {
            type: String,
        },
        gradedBy: {
            type: String,
            index: true,
        },
        gradedAt: {
            type: Date,
        },
        status: {
            type: String,
            enum: ["pending", "calculated", "hand_over", "finalized"],
            default: "pending",
        },
        isPublished: {
            type: Boolean,
            default: false,
        },
        publishedAt: {
            type: Date,
        },
        deletedAt: {
            type: Date,
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
    { unique: true, name: "unique_student_course_semester_grade" }
);

// Method to calculate grade based on percentage
courseGradeSchema.methods.calculateGrade = function () {
    // Calculate theory marks total if theory course
    if (this.courseType === "theory" || this.courseType === "combined") {
        // Sum final exam questions if available
        if (this.theoryMarks.finalExamQuestions) {
            const q = this.theoryMarks.finalExamQuestions;
            this.theoryMarks.finalExam = (q.q1 || 0) + (q.q2 || 0) + (q.q3 || 0) + (q.q4 || 0) + (q.q5 || 0) + (q.q6 || 0);
        }

        this.theoryMarks.totalObtained =
            (this.theoryMarks.finalExam || 0) +
            (this.theoryMarks.midterm || 0) +
            (this.theoryMarks.attendance || 0) +
            (this.theoryMarks.classTest || 0) +
            (this.theoryMarks.assignment || 0);

        // If legacy continuousAssessment is present and new fields are 0, use it?
        // For now, trusting the new scheme.

        this.theoryMarks.totalPossible = 100;
    }

    // Calculate lab marks total if lab course
    if (this.courseType === "lab" || this.courseType === "combined") {
        this.labMarks.totalObtained =
            (this.labMarks.labReports || 0) +
            (this.labMarks.attendance || 0) +
            (this.labMarks.finalLab || 0);
        this.labMarks.totalPossible = 50;
    }

    // Calculate weighted total for combined courses
    let finalPercentage = 0;
    if (this.courseType === "theory") {
        this.totalMarksObtained = this.theoryMarks.totalObtained;
        this.totalMarks = 100;
        finalPercentage = (this.theoryMarks.totalObtained / 100) * 100;
    } else if (this.courseType === "lab") {
        this.totalMarksObtained = this.labMarks.totalObtained;
        this.totalMarks = 50;
        finalPercentage = (this.labMarks.totalObtained / 50) * 100;
    } else if (this.courseType === "combined") {
        const theoryPercentage = (this.theoryMarks.totalObtained / 100) * 100;
        const labPercentage = (this.labMarks.totalObtained / 50) * 100;
        finalPercentage =
            theoryPercentage * (this.theoryWeightage / 100) +
            labPercentage * (this.labWeightage / 100);
        this.totalMarksObtained =
            this.theoryMarks.totalObtained * (this.theoryWeightage / 100) +
            this.labMarks.totalObtained * (this.labWeightage / 100);
        this.totalMarks = 100;
    }

    this.percentage = finalPercentage;

    // Grade calculation logic (4.0 scale)
    if (this.percentage >= 80) {
        this.letterGrade = "A+";
        this.gradePoint = 4.0;
    } else if (this.percentage >= 75) {
        this.letterGrade = "A";
        this.gradePoint = 3.75;
    } else if (this.percentage >= 70) {
        this.letterGrade = "A-";
        this.gradePoint = 3.5;
    } else if (this.percentage >= 65) {
        this.letterGrade = "B+";
        this.gradePoint = 3.25;
    } else if (this.percentage >= 60) {
        this.letterGrade = "B";
        this.gradePoint = 3.0;
    } else if (this.percentage >= 55) {
        this.letterGrade = "B-";
        this.gradePoint = 2.75;
    } else if (this.percentage >= 50) {
        this.letterGrade = "C+";
        this.gradePoint = 2.5;
    } else if (this.percentage >= 45) {
        this.letterGrade = "C";
        this.gradePoint = 2.25;
    } else if (this.percentage >= 40) {
        this.letterGrade = "D";
        this.gradePoint = 1.0;
    } else {
        this.letterGrade = "F";
        this.gradePoint = 0.0;
    }
};

// Soft delete middleware
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
