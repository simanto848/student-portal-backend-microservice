import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const assessmentSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            default: uuidv4,
        },
        title: {
            type: String,
            required: [true, "Assessment title is required"],
        },
        description: {
            type: String,
        },
        courseId: {
            type: String,
            required: [true, "Course ID is required"],
            index: true,
        },
        batchId: {
            type: String,
            required: [true, "Session ID is required"],
            index: true,
        },
        assessmentTypeId: {
            type: String,
            required: [true, "Assessment type ID is required"],
            ref: "AssessmentType",
            index: true,
        },
        instructorId: {
            type: String,
            required: [true, "Instructor ID is required"],
            index: true,
        },
        totalMarks: {
            type: Number,
            required: [true, "Total marks is required"],
            min: 0,
        },
        passingMarks: {
            type: Number,
            min: 0,
        },
        weightage: {
            type: Number,
            required: [true, "Weightage is required"],
            min: 0,
            max: 100,
        },
        dueDate: {
            type: Date,
            required: [true, "Due date is required"],
        },
        publishDate: {
            type: Date,
            default: Date.now,
        },
        instructions: {
            type: String,
        },
        attachments: [{
            fileName: String,
            fileUrl: String,
            fileSize: Number,
            mimeType: String,
        }],
        status: {
            type: String,
            enum: ['draft', 'published', 'closed', 'graded'],
            default: 'draft',
        },
        allowLateSubmission: {
            type: Boolean,
            default: false,
        },
        lateSubmissionPenalty: {
            type: Number,
            min: 0,
            max: 100,
            default: 0,
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
assessmentSchema.index({ courseId: 1, sessionId: 1 });
assessmentSchema.index({ deletedAt: 1 });
assessmentSchema.index({ status: 1 });
assessmentSchema.index({ dueDate: 1 });

// Soft delete middleware
assessmentSchema.pre(/^find/, function (next) {
    this.where({ deletedAt: null });
    next();
});

// Soft delete method
assessmentSchema.methods.softDelete = function () {
    this.deletedAt = new Date();
    return this.save();
};

// Restore method
assessmentSchema.methods.restore = function () {
    this.deletedAt = null;
    return this.save();
};

const Assessment = mongoose.model("Assessment", assessmentSchema);

export default Assessment;

