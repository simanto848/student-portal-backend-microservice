import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const workspaceSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: uuidv4
    },
    courseId: {
        type: String,
        required: true
    },
    departmentId: {
        type: String,
        required: true
    },
    batchId: {
        type: String,
        required: true
    },
    teacherIds: {
        type: [String],
        default: []
    },
    studentIds: {
        type: [String],
        default: []
    },
    title: {
        type: String,
        required: true
    },
    settings: {
        type: Object,
        default: {
            allowLateSubmission: true,
            lateGraceMinutes: 0,
            maxAttachmentSizeMB: 15
        }
    },
    status: {
        type: String,
        enum: ['active', 'archived'],
        default: 'active'
    },
    deletedAt: { type: Date, default: null }
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

workspaceSchema.index({ courseId: 1, batchId: 1 }, { unique: true });
workspaceSchema.pre(/^find/, function (next) {
    this.where({ deletedAt: null });
    if (next) next();
});

const Workspace = mongoose.model('Workspace', workspaceSchema);
export default Workspace;
