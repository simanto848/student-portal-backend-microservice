import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const fatherInfoSchema = new mongoose.Schema(
    {
        name: { type: String, trim: true },
        cell: { type: String, trim: true },
        occupation: { type: String, trim: true },
        nid: { type: String, trim: true },
    },
    { _id: false }
);

const motherInfoSchema = new mongoose.Schema(
    {
        name: { type: String, trim: true },
        cell: { type: String, trim: true },
        occupation: { type: String, trim: true },
        nid: { type: String, trim: true },
    },
    { _id: false }
);

const guardianInfoSchema = new mongoose.Schema(
    {
        name: { type: String, trim: true },
        cell: { type: String, trim: true },
        occupation: { type: String, trim: true },
    },
    { _id: false }
);

const emergencyContactSchema = new mongoose.Schema(
    {
        name: { type: String, trim: true },
        cell: { type: String, trim: true },
        relation: { type: String, trim: true },
        occupation: { type: String, trim: true },
    },
    { _id: false }
);

const educationRecordSchema = new mongoose.Schema(
    {
        examName: { type: String, trim: true },
        group: { type: String, trim: true },
        roll: { type: String, trim: true },
        passingYear: { type: Number },
        gradeOrMarks: { type: String, trim: true },
        cgpa: { type: Number },
        boardOrUniversity: { type: String, trim: true },
    },
    { _id: false }
);

const addressDetailSchema = new mongoose.Schema(
    {
        street: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        zipCode: { type: String, trim: true },
        country: { type: String, trim: true },
    },
    { _id: false }
);

const studentProfileSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            default: uuidv4,
        },
        studentId: {
            type: String,
            ref: 'Student',
            required: true,
            unique: true,
        },
        shift: {
            type: String,
            trim: true,
            enum: ['Day', 'Evening'],
            default: 'Day',
        },
        group: { type: String, trim: true },
        admissionFormSl: { type: String, trim: true },
        admissionSeason: {
            type: String,
            trim: true,
            enum: ['Spring', 'Summer', 'Fall', 'Winter', ''],
            default: '',
        },
        admittedBy: { type: String, trim: true },
        bloodGroup: {
            type: String,
            trim: true,
            enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', ''],
            default: '',
        },
        personalEmail: { type: String, trim: true, lowercase: true },
        studentMobile: { type: String, trim: true },
        religion: {
            type: String,
            trim: true,
            enum: ['Islam', 'Hinduism', 'Christianity', 'Buddhism', 'Other', ''],
            default: '',
        },
        gender: {
            type: String,
            trim: true,
            enum: ['Male', 'Female', 'Other', ''],
            default: '',
        },
        dateOfBirth: { type: Date },
        birthPlace: { type: String, trim: true },
        monthlyIncomeOfGuardian: { type: Number },
        nationality: { type: String, trim: true, default: 'Bangladeshi' },
        nidOrPassportNo: { type: String, trim: true },
        maritalStatus: {
            type: String,
            trim: true,
            enum: ['Single', 'Married', 'Divorced', 'Widowed', ''],
            default: 'Single',
        },
        permanentAddress: addressDetailSchema,
        mailingAddress: addressDetailSchema,
        father: fatherInfoSchema,
        mother: motherInfoSchema,
        guardian: guardianInfoSchema,
        emergencyContact: emergencyContactSchema,
        educationRecords: [educationRecordSchema],
        referredBy: { type: String, trim: true },
        refereeInfo: { type: String, trim: true },
        profilePicture: { type: String, trim: true },
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

studentProfileSchema.index({ deletedAt: 1 });

studentProfileSchema.pre(/^find/, function (next) {
    this.where({ deletedAt: null });
    next();
});

studentProfileSchema.methods.softDelete = function () {
    this.deletedAt = new Date();
    return this.save();
};

studentProfileSchema.methods.restore = function () {
    this.deletedAt = null;
    return this.save();
};

const StudentProfile = mongoose.model('StudentProfile', studentProfileSchema);

export default StudentProfile;