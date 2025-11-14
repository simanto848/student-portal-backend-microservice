import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const sessionCourseSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            default: uuidv4,
        },
        sessionId: {
            type: String,
            required: true,
            ref: "Session",
        },
        courseId: {
            type: String,
            required: true,
            ref: "Course",
        },
        semester: {
            type: Number,
            required: true,
            min: 1,
        },
        departmentId: {
            type: String,
            required: true,
            ref: "Department",
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

sessionCourseSchema.index({ deletedAt: 1 });
sessionCourseSchema.index(
    { sessionId: 1, courseId: 1, semester: 1, departmentId: 1},
    { unique: true, name: 'unique_session_course_semester' }
);
sessionCourseSchema.pre(/^find/, function (next) {
    this.where({ deletedAt: null });
    next();
});

sessionCourseSchema.methods.softDelete = function () {
    this.deletedAt = new Date();
    return this.save();
};

sessionCourseSchema.methods.restore = function () {
    this.deletedAt = null;
    return this.save();
};

const SessionCourse = mongoose.model("SessionCourse", sessionCourseSchema);

export default SessionCourse;