import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const reactionEnum = ['like', 'helpful', 'important', 'noted'];
const priorityEnum = ['low', 'medium', 'high', 'urgent'];
const statusEnum = ['draft', 'scheduled', 'published', 'cancelled'];
const targetTypeEnum = [
    'all', 'students', 'teachers', 'staff',
    'department', 'department_students', 'department_teachers', 'department_staff',
    'batch', 'batch_students',
    'faculty', 'faculty_students', 'faculty_teachers', 'faculty_staff',
    'custom'
];
const senderRoleEnum = ['admin', 'dean', 'department_head', 'batch_counselor', 'course_instructor', 'system'];

const notificationSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: uuidv4
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        required: true
    },
    message: {
        type: String,
        trim: true
    },
    summary: {
        type: String,
        trim: true
    },
    redirectUrl: {
        type: String,
        trim: true
    },
    data: {
        type: mongoose.Schema.Types.Mixed
    },
    type: {
        type: String,
        trim: true
    },
    createdById: {
        type: String,
        required: true
    },
    createdByRole: {
        type: String,
        enum: ['admin', 'teacher', 'staff'],
        required: true,
        default: 'admin'
    },
    status: {
        type: String,
        enum: statusEnum,
        default: 'draft',
        index: true
    },
    scheduleAt: {
        type: Date,
        index: true
    },
    publishedAt: {
        type: Date
    },
    expiresAt: {
        type: Date
    },
    targetType: {
        type: String,
        enum: targetTypeEnum, required: true,
        default: 'all',
        index: true
    },
    targetDepartmentIds: {
        type: [String],
        default: []
    },
    targetBatchIds: {
        type: [String],
        default: []
    },
    targetFacultyIds: {
        type: [String],
        default: []
    },
    targetUserIds: {
        type: [String],
        default: []
    },
    targetUserRoles: {
        type: [String],
        default: []
    },
    senderRole: {
        type: String,
        enum: senderRoleEnum
    },
    priority: {
        type: String,
        enum: priorityEnum,
        default: 'medium'
    },
    requireAcknowledgment: {
        type: Boolean,
        default: false
    },
    sendEmail: {
        type: Boolean,
        default: false
    },
    deliveryChannels: {
        type: [String],
        enum: ['socket', 'email', 'database'],
        default: ['socket']
    },
    isPinned: {
        type: Boolean,
        default: false
    },
    pinOrder: {
        type: Number
    },
    reactionCounts: {
        like: {
            type: Number,
            default: 0
        },
        helpful: {
            type: Number,
            default: 0
        },
        important: {
            type: Number,
            default: 0
        },
        noted: {
            type: Number,
            default: 0
        }
    },
    totalRecipients: {
        type: Number,
        default: 0
    },
    readCount: {
        type: Number,
        default: 0
    },
    acknowledgmentCount: {
        type: Number,
        default: 0
    },
    meta: {
        type: mongoose.Schema.Types.Mixed
    },
    deletedAt: {
        type: Date,
        default: null
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

notificationSchema.index({ status: 1, scheduleAt: 1 });
notificationSchema.index({ targetType: 1 });
notificationSchema.index({ createdById: 1, status: 1 });
notificationSchema.index({ deletedAt: 1 });

notificationSchema.pre(/^find/, function (next) {
    this.where({ deletedAt: null }); next();
});

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
