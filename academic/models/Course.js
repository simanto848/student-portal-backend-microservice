import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const courseSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            default: uuidv4,
        },
        name: {
            type: String,
            required: true,
        },
        code: {
            type: String,
            required: true,
            min: 3,
            max: 15,
        },
        credit: {
            type: Number,
            required: true,
        },
        courseType: {
            type: String,
            enum: ['theory', 'lab', 'project'],
            default: "theory",
            required: true,
        },
        duration: {
            type: Number,
        },
        isElective: {
            type: Boolean,
            default: false,
        },
        description: {
            type: String,
        },
        departmentId: {
            type: String,
            required: true,
            ref: "Department",
        },
        status: {
            type: Boolean,
            default: true,
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
    }
)

courseSchema.index({ deletedAt: 1 });
courseSchema.pre(/^find/, function (next) {
    this.where({ deletedAt: null });
    next();
});

courseSchema.methods.softDelete = function () {
    this.deletedAt = new Date();
    return this.save();
};

courseSchema.methods.restore = function () {
    this.deletedAt = null;
    return this.save();
};

const Course = mongoose.model("Course", courseSchema);

export default Course;