import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const resultWorkflowSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: uuidv4
    },
    batchId: {
        type: String,
        required: true
    },
    courseId: {
        type: String,
        required: true
    },
    semester: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['DRAFT', 'SUBMITTED_TO_COMMITTEE', 'COMMITTEE_APPROVED', 'PUBLISHED', 'RETURNED_TO_TEACHER'],
        default: 'DRAFT'
    },
    returnRequested: {
        type: Boolean,
        default: false
    },
    returnRequestComment: {
        type: String
    },
    approvals: [{
        memberId: {
            type: String,
            required: true
        },
        name: {
            type: String
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    history: [{
        status: String,
        changedBy: String,
        comment: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    deletedAt: {
        type: Date
    }
}, {
    timestamps: true,
    toJSON: {
        transform(doc, ret) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
        }
    }
});

resultWorkflowSchema.index({ batchId: 1, courseId: 1, semester: 1 }, { unique: true });
resultWorkflowSchema.pre(/^find/, function (next) {
    this.where({ deletedAt: null });
    if (next) next();
});

const ResultWorkflow = mongoose.model('ResultWorkflow', resultWorkflowSchema);
export default ResultWorkflow;
