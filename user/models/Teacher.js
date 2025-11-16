import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";

const teacherSchema = new mongoose.Schema(
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
            required: true,
        },
        designation: {
            type: String,
            enum: ['professor', 'associate_professor', 'assistant_professor', 'lecturer', 'instructor', 'adjunct_professor', 'visiting_professor', 'emeritus_professor'],
        },
        joiningDate: {
            type: Date,
        },
        registeredIpAddress: {
            type: [String],
            default: [],
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
        refreshToken: {
            type: String,
            default: null,
            select: false,
        },
        refreshTokenExpiresAt: {
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

teacherSchema.index({ deletedAt: 1 });
teacherSchema.pre(/^find/, function (next) {
    this.where({ deletedAt: null });
    next();
});

teacherSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    this.password = await bcrypt.hash(this.password, 12);
    if (!this.isNew) {
        this.passwordChangedAt = Date.now() - 1000;
    }
    next();
});

teacherSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

teacherSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
        return JWTTimestamp < changedTimestamp;
    }
    return false;
};

teacherSchema.methods.softDelete = function () {
    this.deletedAt = new Date();
    return this.save();
};

teacherSchema.methods.restore = function () {
    this.deletedAt = null;
    return this.save();
};

const Teacher = mongoose.model("Teacher", teacherSchema);

export default Teacher;