import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const classroomSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            default: uuidv4,
        },
        roomNumber: {
            type: String,
            required: true,
            unique: true,
        },
        buildingName: {
            type: String,
            required: true,
        },
        floor: {
            type: Number,
        },
        capacity: {
            type: Number,
            required: true,
        },
        roomType: {
            type: String,
            enum: [
                'Lecture Hall',
                'Laboratory',
                'Seminar Room',
                'Computer Lab',
                'Conference Room',
                'Virtual',
                'Other',
            ],
            default: 'Lecture Hall',
        },
        facilities: {
            type: [String],
            default: [],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        isUnderMaintenance: {
            type: Boolean,
            default: false,
        },
        maintenanceNotes: {
            type: String,
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

classroomSchema.index({ deletedAt: 1 });
classroomSchema.pre(/^find/, function (next) {
    this.where({ deletedAt: null });
    next();
});

classroomSchema.methods.softDelete = function () {
    this.deletedAt = new Date();
    return this.save();
};

classroomSchema.methods.restore = function () {
    this.deletedAt = null;
    return this.save();
};

const Classroom = mongoose.model("Classroom", classroomSchema);

export default Classroom;