import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

// Sub-schema for father information
const fatherInfoSchema = new mongoose.Schema(
    {
        name: { type: String, trim: true },
        cell: { type: String, trim: true },
        occupation: { type: String, trim: true },
        nid: { type: String, trim: true },
    },
    { _id: false }
);

// Sub-schema for mother information
const motherInfoSchema = new mongoose.Schema(
    {
        name: { type: String, trim: true },
        cell: { type: String, trim: true },
        occupation: { type: String, trim: true },
        nid: { type: String, trim: true },
    },
    { _id: false }
);

// Sub-schema for guardian information
const guardianInfoSchema = new mongoose.Schema(
    {
        name: { type: String, trim: true },
        cell: { type: String, trim: true },
        occupation: { type: String, trim: true },
    },
    { _id: false }
);

// Sub-schema for emergency contact
const emergencyContactSchema = new mongoose.Schema(
    {
        name: { type: String, trim: true },
        cell: { type: String, trim: true },
        relation: { type: String, trim: true },
        occupation: { type: String, trim: true },
    },
    { _id: false }
);

// Sub-schema for education records (SSC, HSC, etc.)
const educationRecordSchema = new mongoose.Schema(
    {
        examName: { type: String, trim: true }, // e.g., "SSC", "HSC", "O-Level", "A-Level"
        group: { type: String, trim: true }, // e.g., "Science", "Commerce", "Arts"
        roll: { type: String, trim: true },
        passingYear: { type: Number },
        gradeOrMarks: { type: String, trim: true }, // Can be CGPA or marks
        cgpa: { type: Number },
        boardOrUniversity: { type: String, trim: true },
    },
    { _id: false }
);

// Sub-schema for address
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

// Main StudentProfile schema
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
        // General Information
        shift: {
            type: String,
            trim: true,
            enum: ['Morning', 'Day', 'Evening', 'Night', ''],
            default: '',
        },
        group: { type: String, trim: true }, // Academic group
        admissionFormSl: { type: String, trim: true },
        admissionSeason: { 
            type: String, 
            trim: true,
            enum: ['Spring', 'Summer', 'Fall', 'Winter', ''],
            default: '',
        },
        admittedBy: { type: String, trim: true },
        
        // Personal Information
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
        
        // Family Information
        father: fatherInfoSchema,
        mother: motherInfoSchema,
        guardian: guardianInfoSchema,
        emergencyContact: emergencyContactSchema,
        
        // Education Background (array for multiple records)
        educationRecords: [educationRecordSchema],
        
        // Referee Information
        referredBy: { type: String, trim: true },
        refereeInfo: { type: String, trim: true },
        
        // Additional fields
        profilePicture: { type: String, trim: true }, // URL to profile picture
        
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

// Index for soft delete
studentProfileSchema.index({ deletedAt: 1 });

// Middleware to exclude soft deleted documents
studentProfileSchema.pre(/^find/, function (next) {
    this.where({ deletedAt: null });
    next();
});

// Soft delete method
studentProfileSchema.methods.softDelete = function () {
    this.deletedAt = new Date();
    return this.save();
};

// Restore method
studentProfileSchema.methods.restore = function () {
    this.deletedAt = null;
    return this.save();
};

const StudentProfile = mongoose.model('StudentProfile', studentProfileSchema);

export default StudentProfile;
