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
            required: [true, "Assessment ID is required"],
            ref: "Assessment",
            index: true,
        },
        studentId: {
            type: String,
            required: [true, "Student ID is required"],
            index: true,
        },
        enrollmentId: {
            type: String,
            required: [true, "Enrollment ID is required"],
            ref: "CourseEnrollment",
            index: true,
        },
        submittedAt: {
            type: Date,
            default: Date.now,
        },
        isLate: {
            type: Boolean,
            default: false,
        },
        content: {
            type: String,
        },
        attachments: [{
            fileName: String,
            fileUrl: String,
            fileSize: Number,
            mimeType: String,
            uploadedAt: {
                type: Date,
                default: Date.now,
            }
        }],
        marksObtained: {
            type: Number,
            min: 0,
            default: null,
        },
        feedback: {
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
            enum: ['submitted', 'graded', 'returned', 'resubmitted'],
            default: 'submitted',
        },
        attemptNumber: {
            type: Number,
            default: 1,
            min: 1,
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
assessmentSubmissionSchema.index({ assessmentId: 1, studentId: 1 });
assessmentSubmissionSchema.index({ deletedAt: 1 });
assessmentSubmissionSchema.index({ status: 1 });
assessmentSubmissionSchema.index({ submittedAt: 1 });

// Soft delete middleware
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

