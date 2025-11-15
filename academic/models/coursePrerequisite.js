import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const coursePrerequisiteSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            default: uuidv4,
        },
        courseId: {
            type: String,
            required: true,
            ref: "Course",
        },
        prerequisiteId: {
            type: String,
            required: true,
            ref: "Course",
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

coursePrerequisiteSchema.index({ courseId: 1, prerequisiteId: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
coursePrerequisiteSchema.index({ courseId: 1 });
coursePrerequisiteSchema.index({ prerequisiteId: 1 });
coursePrerequisiteSchema.index({ deletedAt: 1 });
coursePrerequisiteSchema.index({ createdAt: -1 });

coursePrerequisiteSchema.pre(/^find/, function (next) {
    this.where({ deletedAt: null });
    next();
});

coursePrerequisiteSchema.methods.softDelete = function () {
    this.deletedAt = new Date();
    return this.save();
};

coursePrerequisiteSchema.methods.restore = function () {
    this.deletedAt = null;
    return this.save();
};

const CoursePrerequisite = mongoose.model("CoursePrerequisite", coursePrerequisiteSchema);

export default CoursePrerequisite;