import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const batchCourseInstructorSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            default: uuidv4,
        },
        batchId: {
            type: String,
            required: [true, "Batch ID is required"],
            index: true,
        },
        courseId: {
            type: String,
            required: [true, "Course ID is required"],
            index: true,
        },
        sessionId: {
            type: String,
            required: [true, "Session ID is required"],
            index: true,
        },
        semester: {
            type: Number,
            required: [true, "Semester is required"],
            min: 1,
        },
        instructorId: {
            type: String,
            required: [true, "Instructor ID is required"],
            index: true,
        },
        assignedDate: {
            type: Date,
            default: Date.now,
        },
        status: {
            type: String,
            enum: ['active', 'completed', 'reassigned'],
            default: 'active',
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
    }
);

batchCourseInstructorSchema.index({ deletedAt: 1 });
batchCourseInstructorSchema.index({ batchId: 1, courseId: 1, semester: 1 });
batchCourseInstructorSchema.index({ instructorId: 1, status: 1 });

batchCourseInstructorSchema.index(
    { batchId: 1, courseId: 1, semester: 1, deletedAt: 1 },
    { unique: true, name: 'unique_batch_course_semester_assignment' }
);

batchCourseInstructorSchema.pre(/^find/, function (next) {
    this.where({ deletedAt: null });
    if(next) next();
});

batchCourseInstructorSchema.methods.softDelete = function () {
    this.deletedAt = new Date();
    return this.save();
};

batchCourseInstructorSchema.methods.restore = function () {
    this.deletedAt = null;
    return this.save();
};

const BatchCourseInstructor = mongoose.model("BatchCourseInstructor", batchCourseInstructorSchema);

export default BatchCourseInstructor;