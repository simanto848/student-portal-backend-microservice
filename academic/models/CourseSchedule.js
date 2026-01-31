import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const scheduleSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            default: uuidv4,
        },
        sessionId: {
            type: String,
            ref: 'Session',
            required: true,
        },
        batchId: {
            type: String,
            ref: 'Batch',
            required: true,
        },
        sessionCourseId: {
            type: String,
            ref: 'SessionCourse',
            required: true,
        },
        teacherId: {
            type: String,
            ref: 'Teacher',
        },
        daysOfWeek: {
            type: [String],
            enum: [
                'Sunday',
                'Monday',
                'Tuesday',
                'Wednesday',
                'Thursday',
                'Friday',
                'Saturday',
            ],
            required: true,
        },
        startTime: {
            type: String,
            required: true,
        },
        endTime: {
            type: String,
            required: true,
        },
        classroomId: {
            type: String,
            ref: 'Classroom',
        },
        building: {
            type: String,
        },
        isRecurring: {
            type: Boolean,
            default: true,
        },
        startDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
        },
        classType: {
            type: String,
            enum: [
                'Lecture',
                'Tutorial',
                'Lab',
                'Seminar',
                'Workshop',
                'Other',
            ],
            default: 'Lecture',
        },
        status: {
            type: String,
            enum: ['active', 'closed', 'archived'],
            default: 'active',
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        closedAt: {
            type: Date,
            default: null,
        },
        deletedAt: {
            type: Date,
            default: null,
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

scheduleSchema.index({ deletedAt: 1 });
scheduleSchema.pre(/^find/, function (next) {
    this.where({ deletedAt: null });
    next();
});

scheduleSchema.methods.softDelete = function () {
    this.deletedAt = new Date();
    return this.save();
};

scheduleSchema.methods.restore = function () {
    this.deletedAt = null;
    return this.save();
};

// Close a schedule (mark it as closed so it doesn't conflict with new schedules)
scheduleSchema.methods.close = function () {
    this.status = 'closed';
    this.closedAt = new Date();
    return this.save();
};

// Reopen a closed schedule
scheduleSchema.methods.reopen = function () {
    this.status = 'active';
    this.closedAt = null;
    return this.save();
};

// Static method to close all schedules for a session
scheduleSchema.statics.closeSessionSchedules = async function (sessionId) {
    return this.updateMany(
        { sessionId, status: 'active' },
        { $set: { status: 'closed', closedAt: new Date() } }
    );
};

// Static method to close all schedules for specific batches
scheduleSchema.statics.closeBatchSchedules = async function (batchIds) {
    return this.updateMany(
        { batchId: { $in: batchIds }, status: 'active' },
        { $set: { status: 'closed', closedAt: new Date() } }
    );
};

// Static method to get all active schedules (for conflict checking)
scheduleSchema.statics.getActiveSchedules = async function (excludeBatchIds = []) {
    const query = { status: 'active', isActive: true };
    if (excludeBatchIds.length > 0) {
        query.batchId = { $nin: excludeBatchIds };
    }
    return this.find(query).lean();
};

const CourseSchedule = mongoose.model("CourseSchedule", scheduleSchema);

export default CourseSchedule;