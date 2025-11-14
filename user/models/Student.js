import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";

const studentSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            default: uuidv4,
        },
        email: {
            type: String,
            required: [true, 'Email is required.'],
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: [true, 'Password is required.'],
            select: false,
        },
        fullName: {
            type: String,
            required: true,
        },
        registrationNumber: {
            type: String,
            required: true,
            unique: true,
        },
        departmentId: {
            type: String,
        },
        programId: {
            type: String,
        },
        batchId: {
            type: String,
        },
        sessionId: {
            type: String,
        },
        enrollmentStatus: {
            type: String,
            enum: [
                'not_enrolled',
                'enrolled',
                'graduated',
                'dropped_out',
                'suspended',
                'on_leave',
                'transferred_out',
                'transferred_in'
            ],
            default: 'not_enrolled',
        },
        currentSemester: {
            type: Number,
        },
        admissionDate: {
            type: Date,
        },
        expectedGraduationDate: {
            type: Date,
        },
        actualGraduationDate: {
            type: Date,
        },
        passwordChangedAt: {
            type: Date,
            default: null,
        },
        twoFactorEnabled: {
            type: Boolean,
            default: false,
        },
        lastLoginIp: {
            type: String,
            default: null,
        },
        lastLoginAt: {
            type: Date,
            default: null,
        },
        profile: {
            type: String,
            ref: 'Profile',
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

studentSchema.index({ deletedAt: 1 });
studentSchema.pre(/^find/, function (next) {
    this.where({ deletedAt: null });
    next();
});

studentSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    this.password = await bcrypt.hash(this.password, 12);
    if (!this.isNew) {
        this.passwordChangedAt = Date.now() - 1000;
    }
    next();
});

studentSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

studentSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
        return JWTTimestamp < changedTimestamp;
    }
    return false;
};

studentSchema.methods.softDelete = function () {
    this.deletedAt = new Date();
    return this.save();
};

studentSchema.methods.restore = function () {
    this.deletedAt = null;
    return this.save();
};

const Student = mongoose.model("Student", studentSchema);

export default Student;
