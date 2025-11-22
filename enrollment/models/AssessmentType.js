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
            unique: true,
        },
        code: {
            type: String,
            required: [true, "Assessment type code is required"],
            unique: true,
            uppercase: true,
        },
        description: {
            type: String,
        },
        weightPercentage: {
            type: Number,
            min: 0,
            max: 100,
        },
        status: {
            type: Boolean,
            default: true,
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
assessmentTypeSchema.index({ deletedAt: 1 });
assessmentTypeSchema.index({ status: 1 });

// Soft delete middleware
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

