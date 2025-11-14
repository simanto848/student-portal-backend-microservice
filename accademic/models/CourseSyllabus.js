import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const courseSyllabusSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            default: uuidv4,
        },
        sessionCourseId: {
            type: String,
            required: true,
            ref: "SessionCourse",
        },
        version: {
            type: String,
            default: '1.0'
        },
        overview: {
            type: String,
        },
        objectives: {
            type: String,
        },
        prerequisites: {
            type: String,
        },
        textbooks: {
            type: mongoose.Schema.Types.Mixed,
        },
        gradingPolicy: {
            type: String,
        },
        assessmentBreakdown: {
            type: mongoose.Schema.Types.Mixed,
        },
        weeklySchedule: {
            type: mongoose.Schema.Types.Mixed,
        },
        additionalResources: {
            type: mongoose.Schema.Types.Mixed,
        },
        policies: {
            type: String,
        },
        status: {
            type: String,
            enum: ['Draft', 'Pending Approval', 'Approved', 'Published', 'Archived'],
            default: 'Draft',
        },
        createdById: {
            type: String,
        },
        approvedById: {
            type: String,
        },
        publishedById: {
            type: String,
        },
        approvedAt: {
            type: Date,
        },
        publishedAt: {
            type: Date,
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
    },
);

courseSyllabusSchema.index({ deletedAt: 1 });
courseSyllabusSchema.pre(/^find/, function (next) {
    this.where({ deletedAt: null });
    next();
});

courseSyllabusSchema.methods.softDelete = function () {
    this.deletedAt = new Date();
    return this.save();
};

courseSyllabusSchema.methods.restore = function () {
    this.deletedAt = null;
    return this.save();
};

const CourseSyllabus = mongoose.model("CourseSyllabus", courseSyllabusSchema);

export default CourseSyllabus;