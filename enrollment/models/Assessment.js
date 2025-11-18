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
            trim: true,
        },
        description: {
            type: String,
            maxlength: 2000,
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
        instructorId: {
            type: String,
            required: [true, "Instructor ID is required"],
            index: true,
        },
        assessmentTypeId: {
            type: String,
            ref: 'AssessmentType',
            required: [true, "Assessment type is required"],
        },
        totalMarks: {
            type: Number,
            required: [true, "Total marks is required"],
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
        },
        publishDate: {
            type: Date,
            default: Date.now,
        },
        status: {
            type: String,
            enum: ['draft', 'published', 'closed', 'graded'],
            default: 'draft',
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
assessmentSchema.index({ deletedAt: 1 });
assessmentSchema.index({ courseId: 1, semester: 1 });
assessmentSchema.index({ batchId: 1, semester: 1 });
assessmentSchema.index({ instructorId: 1 });
assessmentSchema.index({ status: 1 });

// Soft delete pre-hook
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
