import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const assessmentTypeSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            default: uuidv4,
        },
        name: {
            type: String,
            required: [true, "Assessment type name is required"],
            trim: true,
        },
        description: {
            type: String,
            maxlength: 1000,
        },
        defaultWeightage: {
            type: Number,
            min: 0,
            max: 100,
            default: 0,
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
assessmentTypeSchema.index({ deletedAt: 1 });
assessmentTypeSchema.index({ name: 1 });

// Soft delete pre-hook
assessmentTypeSchema.pre(/^find/, function (next) {
    this.where({ deletedAt: null });
    next();
});

// Soft delete method
assessmentTypeSchema.methods.softDelete = function () {
    this.deletedAt = new Date();
    return this.save();
};

// Restore method
assessmentTypeSchema.methods.restore = function () {
    this.deletedAt = null;
    return this.save();
};

const AssessmentType = mongoose.model("AssessmentType", assessmentTypeSchema);

export default AssessmentType;
