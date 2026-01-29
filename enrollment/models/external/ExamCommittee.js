import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const examCommitteeSchema = new mongoose.Schema({
    _id: { type: String, default: uuidv4 },
    departmentId: {
        type: String,
        required: true
    },
    teacherId: {
        type: String,
        required: true
    },
    shift: {
        type: String,
        enum: ["day", "evening"],
        default: "day",
    },
    status: {
        type: Boolean,
        default: true
    },
    batchId: {
        type: String,
        ref: "Batch",
        default: null,
    },
    deletedAt: {
        type: Date
    }
});

examCommitteeSchema.pre(/^find/, function () {
    this.where({ deletedAt: null });
});

export const ExamCommittee = mongoose.models.ExamCommittee || mongoose.model('ExamCommittee', examCommitteeSchema);
