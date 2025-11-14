import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const programSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            default: uuidv4,
        },
        departmentId: {
            type: String,
            required: true,
            ref: "Department",
        },
        name: {
            type: String,
            unique: true,
            required: true,
        },
        shortName: {
            type: String,
            required: true,
            unique: true,
        },
        description: {
            type: String,
        },
        duration: {
            type: Number,
            required: true,
        },
        totalCredits: {
            type: Number,
            required: true,
        },
        status: {
            type: Boolean,
            default: true
        },
        deletedAt: {
            type: Date,
            default: null
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

programSchema.index({ deletedAt: 1 });
programSchema.pre(/^find/, function (next) {
    this.where({ deletedAt: null });
    next();
});

programSchema.methods.softDelete = function () {
    this.deletedAt = new Date();
    return this.save();
};

programSchema.methods.restore = function () {
    this.deletedAt = null;
    return this.save();
};

const Program = mongoose.model("Program", programSchema);

export default Program;