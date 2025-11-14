import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const batchSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            default: uuidv4,
        },
        name: {
            type: String,
            required: true,
            unique: true,
            maxlength: 50,
        },
        year: {
            type: Number,
            required: true,
        },
        programId: {
            type: String,
            ref: 'Program',
            required: true,
        },
        departmentId: {
            type: String,
            ref: 'Department',
            required: true,
        },
        sessionId: {
            type: String,
            ref: 'Session',
            required: true,
        },
        counselorId: {
            type: String,
            ref: 'Teacher',
        },
        currentSemester: {
            type: Number,
            default: 1,
        },
        startDate: {
            type: Date,
        },
        endDate: {
            type: Date,
        },
        maxStudents: {
            type: Number,
            required: true,
            default: 50,
        },
        currentStudents: {
            type: Number,
            required: true,
            default: 0,
        },
        status: {
            type: Boolean,
            default: true,
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
    },
);

// Indexes
batchSchema.index({ deletedAt: 1 });
batchSchema.index({ name: 1 });
batchSchema.index({ year: 1 });
batchSchema.index({ programId: 1 });
batchSchema.index({ departmentId: 1 });
batchSchema.index({ counselorId: 1 });
batchSchema.index({ status: 1 });
batchSchema.index({ sessionId: 1 });

batchSchema.pre(/^find/, function (next) {
    this.where({ deletedAt: null });
    next();
});

batchSchema.methods.softDelete = function () {
    this.deletedAt = new Date();
    return this.save();
};

batchSchema.methods.restore = function () {
    this.deletedAt = null;
    return this.save();
};

const Batch = mongoose.model("Batch", batchSchema);

export default Batch;