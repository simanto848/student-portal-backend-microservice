import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const scheduleProposalSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            default: uuidv4,
        },
        sessionId: {
            type: String,
            required: true,
            ref: 'Session',
        },
        generatedBy: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
        },
        scheduleData: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },
        metadata: {
            type: Object,
        },
        createdAt: {
            type: Date,
            default: Date.now,
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

const ScheduleProposal = mongoose.model("ScheduleProposal", scheduleProposalSchema);

export default ScheduleProposal;
