import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const scheduleSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            default: uuidv4,
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
        isActive: {
            type: Boolean,
            default: true,
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

const CourseSchedule = mongoose.model("CourseSchedule", scheduleSchema);

export default CourseSchedule;