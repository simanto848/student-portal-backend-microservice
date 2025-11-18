import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const assessmentSubmissionSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            default: uuidv4,
        },
        assessmentId: {
            type: String,
            ref: 'Assessment',
            required: [true, "Assessment ID is required"],
            index: true,
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
        submissionDate: {
            type: Date,
            default: Date.now,
        },
        content: {
            type: String,
            maxlength: 10000,
        },
        attachments: [{
            filename: String,
            url: String,
            uploadedAt: {
                type: Date,
                default: Date.now,
            },
        }],
        marksObtained: {
            type: Number,
            min: 0,
        },
        feedback: {
            type: String,
            maxlength: 2000,
        },
        gradedBy: {
            type: String,
        },
        gradedAt: {
            type: Date,
        },
        status: {
            type: String,
            enum: ['submitted', 'graded', 'pending', 'late'],
            default: 'submitted',
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
assessmentSubmissionSchema.index({ deletedAt: 1 });
assessmentSubmissionSchema.index({ assessmentId: 1, studentId: 1 });
assessmentSubmissionSchema.index({ studentId: 1 });
assessmentSubmissionSchema.index({ status: 1 });

// Unique constraint: One submission per student per assessment
assessmentSubmissionSchema.index(
    { assessmentId: 1, studentId: 1, deletedAt: 1 },
    { unique: true, name: 'unique_student_assessment_submission' }
);

// Soft delete pre-hook
assessmentSubmissionSchema.pre(/^find/, function (next) {
    this.where({ deletedAt: null });
    next();
});

// Soft delete method
assessmentSubmissionSchema.methods.softDelete = function () {
    this.deletedAt = new Date();
    return this.save();
};

// Restore method
assessmentSubmissionSchema.methods.restore = function () {
    this.deletedAt = null;
    return this.save();
};

const AssessmentSubmission = mongoose.model("AssessmentSubmission", assessmentSubmissionSchema);

export default AssessmentSubmission;
