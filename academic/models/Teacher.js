import mongoose from "mongoose";

const teacherSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
        },
        email: {
            type: String,
        },
        fullName: {
            type: String,
        },
        designation: {
            type: String,
        },
        departmentId: {
            type: String,
        },
        profile: {
            type: String,
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

// We act as a readonly view of the User service's Teacher model
const Teacher = mongoose.model("Teacher", teacherSchema);

export default Teacher;
